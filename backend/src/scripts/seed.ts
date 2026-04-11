import { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  batchLinkProductsToCollectionWorkflow,
  createApiKeysWorkflow,
  createCollectionsWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createPromotionsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  deletePromotionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresStep,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";
import { ApiKey } from "../../.medusa/types/query-entry-points";
import { inrPaiseFromRupeesMajor } from "../lib/seed-catalog-inr-prices";
import { storefrontProductImageUrl as storefrontProductImage } from "../lib/seed-storefront-base";

const updateStoreCurrencies = createWorkflow(
  "update-store-currencies",
  (input: {
    supported_currencies: { currency_code: string; is_default?: boolean }[];
    store_id: string;
  }) => {
    const normalizedInput = transform({ input }, (data) => {
      return {
        selector: { id: data.input.store_id },
        update: {
          supported_currencies: data.input.supported_currencies.map(
            (currency) => {
              return {
                currency_code: currency.currency_code,
                is_default: currency.is_default ?? false,
              };
            }
          ),
        },
      };
    });

    const stores = updateStoresStep(normalizedInput);

    return new WorkflowResponse(stores);
  }
);

/** INR variant prices in paise (100 paise = ₹1). `rupeesMajor` is the shelf price in rupees. */
function inrOnly(rupeesMajor: number) {
  return [{ amount: inrPaiseFromRupeesMajor(rupeesMajor), currency_code: "inr" }];
}

/** PDP trust row (icons match storefront `trust_badges` parser). */
const SEED_TRUST_BADGES = JSON.stringify([
  { label: "Free shipping on prepaid orders", icon: "truck" },
  { label: "BIS Hallmark certified", icon: "shield" },
  { label: "30-day easy returns", icon: "rotate-ccw" },
]);

/**
 * Product dimensions for Admin / shipping: **cm**. Weight: **grams** (jewellery convention).
 */
function physical(attrs: {
  length: number;
  width: number;
  height: number;
  weight: number;
}) {
  return {
    length: attrs.length,
    width: attrs.width,
    height: attrs.height,
    weight: attrs.weight,
    origin_country: "IN",
  };
}

export default async function seedDemoData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const storeModuleService = container.resolve(Modules.STORE);

  /** India-only store: single currency (INR) and one region. */
  const countries = ["in"];

  logger.info("Seeding store data...");
  const [store] = await storeModuleService.listStores();
  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  });

  if (!defaultSalesChannel.length) {
    // create the default sales channel
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(
      container
    ).run({
      input: {
        salesChannelsData: [
          {
            name: "Default Sales Channel",
          },
        ],
      },
    });
    defaultSalesChannel = salesChannelResult;
  }

  /** Single supported currency keeps Admin variant pricing to one column (INR). If you later see duplicates, run `npm run ensure:inr`. */
  await updateStoreCurrencies(container).run({
    input: {
      store_id: store.id,
      supported_currencies: [
        {
          currency_code: "inr",
          is_default: true,
        },
      ],
    },
  });

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_sales_channel_id: defaultSalesChannel[0].id,
      },
    },
  });
  logger.info("Seeding region data...");
  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "India",
          currency_code: "inr",
          countries,
          payment_providers: ["pp_system_default", "pp_razorpay_razorpay"],
        },
      ],
    },
  });
  const region = regionResult[0];
  logger.info("Finished seeding regions.");

  logger.info("Seeding tax regions...");
  await createTaxRegionsWorkflow(container).run({
    input: countries.map((country_code) => ({
      country_code,
      provider_id: "tp_system",
    })),
  });
  logger.info("Finished seeding tax regions.");

  logger.info("Seeding stock location data...");
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "India Fulfillment",
          address: {
            city: "Mumbai",
            country_code: "IN",
            address_1: "",
          },
        },
      ],
    },
  });
  const stockLocation = stockLocationResult[0];

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_location_id: stockLocation.id,
      },
    },
  });

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  });

  logger.info("Seeding fulfillment data...");
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  });
  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null;

  if (!shippingProfile) {
    const { result: shippingProfileResult } =
      await createShippingProfilesWorkflow(container).run({
        input: {
          data: [
            {
              name: "Default Shipping Profile",
              type: "default",
            },
          ],
        },
      });
    shippingProfile = shippingProfileResult[0];
  }

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "India delivery",
    type: "shipping",
    service_zones: [
      {
        name: "India",
        geo_zones: [
          {
            country_code: "in",
            type: "country",
          },
        ],
      },
    ],
  });

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: fulfillmentSet.id,
    },
  });

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standard",
          description: "Ship in 2-3 days.",
          code: "standard",
        },
        prices: [
          {
            currency_code: "inr",
            amount: 9900,
          },
          {
            region_id: region.id,
            amount: 9900,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
      {
        name: "Express Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Express",
          description: "Ship in 24 hours.",
          code: "express",
        },
        prices: [
          {
            currency_code: "inr",
            amount: 19900,
          },
          {
            region_id: region.id,
            amount: 19900,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
    ],
  });
  logger.info("Finished seeding fulfillment data.");

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel[0].id],
    },
  });
  logger.info("Finished seeding stock location data.");

  logger.info("Seeding publishable API key data...");
  let publishableApiKey: ApiKey | null = null;
  const { data } = await query.graph({
    entity: "api_key",
    fields: ["id"],
    filters: {
      type: "publishable",
    },
  });

  publishableApiKey = data?.[0];

  if (!publishableApiKey) {
    const {
      result: [publishableApiKeyResult],
    } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: "Webshop",
            type: "publishable",
            created_by: "",
          },
        ],
      },
    });

    publishableApiKey = publishableApiKeyResult as ApiKey;
  }

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [defaultSalesChannel[0].id],
    },
  });
  logger.info("Finished seeding publishable API key data.");

  logger.info("Seeding product data...");

  const { result: categoryResult } = await createProductCategoriesWorkflow(
    container
  ).run({
    input: {
      product_categories: [
        {
          name: "Rings",
          handle: "rings",
          is_active: true,
          rank: 10,
          description:
            "Solitaires, bands, and cocktail rings — hand-finished for everyday and occasion wear.",
        },
        {
          name: "Necklaces",
          handle: "necklaces",
          is_active: true,
          rank: 20,
          description:
            "Statement collars, heritage filigree, and delicate chains in gold and precious stones.",
        },
        {
          name: "Earrings",
          handle: "earrings",
          is_active: true,
          rank: 30,
          description:
            "Studs, drops, and chandeliers — from subtle sparkle to full red-carpet drama.",
        },
        {
          name: "Bracelets",
          handle: "bracelets",
          is_active: true,
          rank: 40,
          description:
            "Tennis lines, cuffs, and stackable bracelets in platinum and gold.",
        },
        {
          name: "Bangles",
          handle: "bangles",
          is_active: true,
          rank: 50,
          description:
            "Traditional and contemporary bangle sets, often worn as stacked pairs or trios.",
        },
        {
          name: "Pendants",
          handle: "pendants",
          is_active: true,
          rank: 60,
          description:
            "Halos, solitaires, and celestial motifs — focal pieces for chains and layers.",
        },
      ],
    },
  });

  const ring = categoryResult.find((c) => c.name === "Rings")!.id;
  const necklace = categoryResult.find((c) => c.name === "Necklaces")!.id;
  const earrings = categoryResult.find((c) => c.name === "Earrings")!.id;
  const bracelet = categoryResult.find((c) => c.name === "Bracelets")!.id;
  const bangles = categoryResult.find((c) => c.name === "Bangles")!.id;
  const pendants = categoryResult.find((c) => c.name === "Pendants")!.id;

  const oneSizeOption = [{ title: "Size", values: ["One Size"] }];
  const oneSizeVariant = (sku: string, rupeesMajor: number) => [
    {
      title: "One Size",
      sku,
      options: { Size: "One Size" },
      prices: inrOnly(rupeesMajor),
    },
  ];

  logger.info("Seeding product collections (storefront hero + shop filters)...");
  const { result: collectionRows } = await createCollectionsWorkflow(container).run({
    input: {
      collections: [
        {
          title: "Timeless",
          handle: "timeless",
          metadata: {
            storefront_tagline: "Enduring Elegance",
            storefront_short:
              "Classic designs that transcend trends and become heirlooms passed down through generations.",
            storefront_long:
              "Masterpieces that defy the passage of time. Each piece in our Timeless collection is designed to become an heirloom — a bridge between generations, carrying stories of love and legacy.",
            hero_image: storefrontProductImage("product-bracelet.jpg"),
            sort_order: "1",
            storefront_home: "true",
          },
        },
        {
          title: "Heritage",
          handle: "heritage",
          metadata: {
            storefront_tagline: "Royal Legacy",
            storefront_short:
              "Inspired by centuries of Indian craftsmanship and regal traditions.",
            storefront_long:
              "Born from centuries of Indian royal craftsmanship, the Heritage collection honours tradition while embracing contemporary sophistication. Every piece tells the story of emperors and artisans.",
            hero_image: storefrontProductImage("product-bangles.jpg"),
            sort_order: "2",
            storefront_home: "true",
          },
        },
        {
          title: "Celestial",
          handle: "celestial",
          metadata: {
            storefront_tagline: "Cosmic Radiance",
            storefront_short:
              "Ethereal pieces inspired by the magic of the cosmos and celestial wonders.",
            storefront_long:
              "Inspired by the infinite beauty of the cosmos — the shimmer of distant stars, the glow of the moon, the aurora of twilight. The Celestial collection captures the ethereal in precious form.",
            hero_image: storefrontProductImage("product-pendant.jpg"),
            sort_order: "3",
            storefront_home: "true",
          },
        },
      ],
    },
  });

  const collectionIdByHandle = Object.fromEntries(
    collectionRows.map((c) => [c.handle, c.id]),
  ) as Record<string, string>;

  const { result: createdProducts } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Eternal Diamond Solitaire",
          subtitle: "2 ct brilliant solitaire · 18k white gold · GIA",
          category_ids: [ring],
          description:
            "A breathtaking solitaire ring featuring a 2-carat brilliant-cut diamond, set in 18k white gold — the epitome of eternal elegance.",
          handle: "eternal-diamond-solitaire",
          discountable: true,
          ...physical({ length: 2.6, width: 2.4, height: 2.1, weight: 18 }),
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          metadata: {
            tagline: "Timeless",
            details: JSON.stringify([
              "2-carat brilliant-cut diamond",
              "18k white gold setting",
              "VS1 clarity, F color",
              "GIA certified",
            ]),
            search_keywords:
              "diamond ring, solitaire, engagement, white gold, GIA, brilliant cut, timeless",
            trust_badges: SEED_TRUST_BADGES,
            is_new: "true",
            is_bestseller: "true",
            featured: "true",
            featured_order: "1",
            compare_at_price: "320000",
            hamper_bundle: JSON.stringify({
              slots: [
                {
                  id: "keepbox",
                  label: "Keepbox",
                  description: "Choose one signature keepsake box for your hamper.",
                  image: storefrontProductImage("product-ring.jpg"),
                  product_handles: ["celestial-pearl-drops", "infinity-tennis-bracelet"],
                },
              ],
              allow_gift_message: true,
              gift_message_max_length: 240,
            }),
          },
          images: [
            { url: storefrontProductImage("product-ring.jpg") },
            { url: storefrontProductImage("product-ring.jpg") },
            { url: storefrontProductImage("product-ring.jpg") },
          ],
          options: oneSizeOption,
          variants: oneSizeVariant("AMB-RING-ETERNAL-001", 285000),
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Royal Heritage Necklace",
          subtitle: "Emeralds & diamonds · 22k filigree collar",
          category_ids: [necklace],
          description:
            "An exquisite statement necklace inspired by royal heritage, featuring intricate gold filigree work adorned with natural emeralds and diamonds.",
          handle: "royal-heritage-necklace",
          discountable: true,
          ...physical({ length: 18.0, width: 16.0, height: 3.5, weight: 85 }),
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          metadata: {
            tagline: "Heritage",
            details: JSON.stringify([
              "Natural Colombian emeralds",
              "Brilliant-cut diamonds",
              "Hand-crafted filigree",
              "22k gold",
            ]),
            search_keywords:
              "necklace, heritage, emerald, diamond, filigree, 22k gold, statement",
            trust_badges: SEED_TRUST_BADGES,
            is_bestseller: "true",
            featured: "true",
            featured_order: "2",
            compare_at_price: "480000",
          },
          images: [
            { url: storefrontProductImage("product-necklace.jpg") },
            { url: storefrontProductImage("product-necklace.jpg") },
            { url: storefrontProductImage("product-necklace.jpg") },
          ],
          options: oneSizeOption,
          variants: oneSizeVariant("AMB-NECK-ROYAL-001", 425000),
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Celestial Pearl Drops",
          subtitle: "South Sea pearls · diamond crescents · 18k gold",
          category_ids: [earrings],
          description:
            "Elegant drop earrings featuring lustrous South Sea pearls suspended from diamond-encrusted crescents in 18k yellow gold.",
          handle: "celestial-pearl-drops",
          discountable: true,
          ...physical({ length: 3.2, width: 2.0, height: 1.1, weight: 22 }),
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          metadata: {
            tagline: "Celestial",
            details: JSON.stringify([
              "South Sea pearls (12mm)",
              "18k yellow gold",
              "Diamond accents (0.5 ctw)",
              "Secure butterfly backs",
            ]),
            search_keywords:
              "pearl earrings, drop earrings, South Sea, diamond, yellow gold, celestial",
            trust_badges: SEED_TRUST_BADGES,
            is_new: "true",
            featured: "true",
            featured_order: "3",
            compare_at_price: "115000",
          },
          images: [
            { url: storefrontProductImage("product-earrings.jpg") },
            { url: storefrontProductImage("product-earrings.jpg") },
          ],
          options: oneSizeOption,
          variants: oneSizeVariant("AMB-EAR-CELEST-001", 95000),
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Maharani Bangles Set",
          subtitle: "Set of 3 · rubies & diamonds · 22k stack",
          category_ids: [bangles],
          description:
            "A luxurious set of three hand-crafted bangles featuring traditional Indian artistry with contemporary elegance — ruby and diamond accents.",
          handle: "maharani-bangles-set",
          discountable: true,
          ...physical({ length: 8.5, width: 8.5, height: 2.8, weight: 95 }),
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          metadata: {
            tagline: "Heritage",
            details: JSON.stringify([
              "Set of 3 bangles",
              "Natural rubies",
              "Diamond melee",
              "22k gold",
            ]),
            search_keywords:
              "bangles, stack, ruby, diamond, 22k gold, maharani, bridal",
            trust_badges: SEED_TRUST_BADGES,
            featured: "true",
            featured_order: "4",
            compare_at_price: "2100000",
          },
          images: [
            { url: storefrontProductImage("product-bangles.jpg") },
            { url: storefrontProductImage("product-bangles.jpg") },
            { url: storefrontProductImage("product-bangles.jpg") },
          ],
          options: oneSizeOption,
          variants: oneSizeVariant("AMB-BANG-MAHAR-001", 1850000),
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Aurora Diamond Pendant",
          subtitle: "1.5 ct pear · halo · 18k white gold + chain",
          category_ids: [pendants],
          description:
            "A mesmerizing pendant featuring a 1.5-carat pear-shaped diamond surrounded by a halo of smaller brilliants, evoking the northern lights.",
          handle: "aurora-diamond-pendant",
          discountable: true,
          ...physical({ length: 4.2, width: 3.0, height: 0.7, weight: 12 }),
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          metadata: {
            tagline: "Celestial",
            details: JSON.stringify([
              "1.5-carat pear diamond",
              "Diamond halo setting",
              "18k white gold",
              'Includes 18" chain',
            ]),
            search_keywords:
              "pendant, pear diamond, halo, white gold, chain, aurora, celestial",
            trust_badges: SEED_TRUST_BADGES,
            is_new: "true",
            is_bestseller: "true",
            featured: "true",
            featured_order: "5",
            compare_at_price: "185000",
          },
          images: [
            { url: storefrontProductImage("product-pendant.jpg") },
            { url: storefrontProductImage("product-pendant.jpg") },
            { url: storefrontProductImage("product-pendant.jpg") },
          ],
          options: oneSizeOption,
          variants: oneSizeVariant("AMB-PEND-AURORA-001", 165000),
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Infinity Tennis Bracelet",
          subtitle: "5 ct diamonds · platinum · box clasp",
          category_ids: [bracelet],
          description:
            "A classic tennis bracelet reimagined with 5 carats of round brilliant diamonds set in platinum — a symbol of infinite love.",
          handle: "infinity-tennis-bracelet",
          discountable: true,
          ...physical({ length: 19.5, width: 1.2, height: 0.9, weight: 38 }),
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          metadata: {
            tagline: "Timeless",
            details: JSON.stringify([
              "5 carats total weight",
              "Round brilliant diamonds",
              "Platinum setting",
              "Secure box clasp",
            ]),
            search_keywords:
              "tennis bracelet, diamond line, platinum, bridal, anniversary",
            trust_badges: SEED_TRUST_BADGES,
            is_bestseller: "true",
            compare_at_price: "275000",
          },
          images: [
            { url: storefrontProductImage("product-bracelet.jpg") },
            { url: storefrontProductImage("product-bracelet.jpg") },
            { url: storefrontProductImage("product-bracelet.jpg") },
          ],
          options: oneSizeOption,
          variants: oneSizeVariant("AMB-BRAC-INF-001", 245000),
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Sapphire Cocktail Ring",
          subtitle: "3 ct Ceylon sapphire · art deco diamond halo",
          category_ids: [ring],
          description:
            "A stunning cocktail ring featuring a 3-carat Ceylon sapphire surrounded by baguette and round diamonds in an art deco setting.",
          handle: "sapphire-cocktail-ring",
          discountable: true,
          ...physical({ length: 3.0, width: 2.8, height: 2.4, weight: 20 }),
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          metadata: {
            tagline: "Heritage",
            details: JSON.stringify([
              "3-carat Ceylon sapphire",
              "Baguette & round diamonds",
              "18k white gold",
              "Art deco design",
            ]),
            search_keywords:
              "sapphire ring, cocktail ring, Ceylon, baguette diamond, art deco",
            trust_badges: SEED_TRUST_BADGES,
            compare_at_price: "220000",
          },
          images: [
            { url: storefrontProductImage("product-sapphire-ring.jpg") },
            { url: storefrontProductImage("product-sapphire-ring.jpg") },
            { url: storefrontProductImage("product-sapphire-ring.jpg") },
          ],
          options: oneSizeOption,
          variants: oneSizeVariant("AMB-RING-SAPH-001", 195000),
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Golden Cascades Earrings",
          subtitle: "Champagne diamonds · 18k chandelier drops",
          category_ids: [earrings],
          description:
            "Dramatic chandelier earrings featuring cascading golden leaves adorned with champagne diamonds for an unforgettable statement.",
          handle: "golden-cascades-earrings",
          discountable: true,
          ...physical({ length: 6.5, width: 3.2, height: 1.0, weight: 28 }),
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          metadata: {
            tagline: "Timeless",
            details: JSON.stringify([
              "Champagne diamonds",
              "18k yellow gold",
              "Chandelier design",
              "Post with omega backs",
            ]),
            search_keywords:
              "chandelier earrings, champagne diamond, yellow gold, statement, cascade",
            trust_badges: SEED_TRUST_BADGES,
            is_new: "true",
            compare_at_price: "145000",
          },
          images: [
            { url: storefrontProductImage("product-chandelier-earrings.jpg") },
            { url: storefrontProductImage("product-chandelier-earrings.jpg") },
            { url: storefrontProductImage("product-chandelier-earrings.jpg") },
          ],
          options: oneSizeOption,
          variants: oneSizeVariant("AMB-EAR-CASCADE-001", 125000),
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
      ],
    },
  });

  const productId = (handle: string) => {
    const p = createdProducts.find((x) => x.handle === handle);
    if (!p) {
      throw new Error(`Seed: product handle not found: ${handle}`);
    }
    return p.id;
  };

  logger.info("Linking products to collections...");
  await batchLinkProductsToCollectionWorkflow(container).run({
    input: {
      id: collectionIdByHandle.timeless,
      add: [
        productId("eternal-diamond-solitaire"),
        productId("infinity-tennis-bracelet"),
        productId("golden-cascades-earrings"),
      ],
    },
  });
  await batchLinkProductsToCollectionWorkflow(container).run({
    input: {
      id: collectionIdByHandle.heritage,
      add: [
        productId("royal-heritage-necklace"),
        productId("maharani-bangles-set"),
        productId("sapphire-cocktail-ring"),
      ],
    },
  });
  await batchLinkProductsToCollectionWorkflow(container).run({
    input: {
      id: collectionIdByHandle.celestial,
      add: [
        productId("celestial-pearl-drops"),
        productId("aurora-diamond-pendant"),
      ],
    },
  });

  logger.info("Finished seeding product data.");

  logger.info("Seeding inventory levels.");

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  });

  const inventoryLevels: CreateInventoryLevelInput[] = [];
  for (const inventoryItem of inventoryItems) {
    const inventoryLevel = {
      location_id: stockLocation.id,
      stocked_quantity: 1000000,
      inventory_item_id: inventoryItem.id,
    };
    inventoryLevels.push(inventoryLevel);
  }

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: inventoryLevels,
    },
  });

  logger.info("Finished seeding inventory levels data.");

  /**
   * Demo promotions matching Admin “Create promotion” types (Amount off products / order,
   * Percentage off product / order, Buy X Get Y, Free shipping). Idempotent per code: delete then recreate.
   * Apply codes at Store checkout or mark automatic where noted.
   *
   * Buy-get AMB_DEMO_BUY2GET1: minimum buy quantity lives in `buy_rules_min_quantity` only. Do not add
   * a second Admin buy rule “Minimum quantity of items” — that duplicates the condition and commonly
   * yields carts with `promotions: []` after applying the code. Target rules: product only; use
   * `apply_to_quantity` on the method, not an extra “quantity” row under Target rules in Admin.
   */
  const demoPromotionCodes = [
    "AMB_DEMO_ITEM_FIXED",
    "AMB_DEMO_ORDER_FIXED",
    "AMB_DEMO_ITEM_PCT",
    "AMB_DEMO_ORDER_PCT",
    "AMB_DEMO_BUY2GET1",
    "AMB_DEMO_BRACELET_PAIR50",
    "AMB_DEMO_FREESHIP",
  ] as const;

  logger.info("Seeding demo promotions (7 types)…");
  const idsToDelete: string[] = [];
  for (const code of demoPromotionCodes) {
    const { data: rows } = await query.graph({
      entity: "promotion",
      fields: ["id"],
      filters: { code: code as string },
    });
    for (const row of rows ?? []) {
      if (row?.id) idsToDelete.push(row.id as string);
    }
  }
  if (idsToDelete.length) {
    await deletePromotionsWorkflow(container).run({ input: { ids: idsToDelete } });
    logger.info(`Removed ${idsToDelete.length} previous AMB_DEMO_* promotion rows.`);
  }

  const pidCelestial = productId("celestial-pearl-drops");
  const pidEternal = productId("eternal-diamond-solitaire");
  const pidBracelet = productId("infinity-tennis-bracelet");

  await createPromotionsWorkflow(container).run({
    input: {
      promotionsData: [
        {
          code: "AMB_DEMO_ITEM_FIXED",
          type: "standard",
          status: "active",
          is_automatic: false,
          application_method: {
            type: "fixed",
            target_type: "items",
            allocation: "each",
            max_quantity: 999,
            value: inrPaiseFromRupeesMajor(2500),
            currency_code: "inr",
            target_rules: [
              {
                attribute: "items.product.id",
                operator: "in",
                values: [pidCelestial],
              },
            ],
          },
        },
        {
          code: "AMB_DEMO_ORDER_FIXED",
          type: "standard",
          status: "active",
          is_automatic: false,
          application_method: {
            type: "fixed",
            target_type: "order",
            value: inrPaiseFromRupeesMajor(10000),
            currency_code: "inr",
          },
        },
        {
          code: "AMB_DEMO_ITEM_PCT",
          type: "standard",
          status: "active",
          is_automatic: false,
          application_method: {
            type: "percentage",
            target_type: "items",
            allocation: "each",
            max_quantity: 999,
            value: 12,
            currency_code: "inr",
            target_rules: [
              {
                attribute: "items.product.id",
                operator: "in",
                values: [pidEternal],
              },
            ],
          },
        },
        {
          code: "AMB_DEMO_ORDER_PCT",
          type: "standard",
          status: "active",
          is_automatic: false,
          application_method: {
            type: "percentage",
            target_type: "order",
            value: 5,
            currency_code: "inr",
          },
        },
        {
          code: "AMB_DEMO_BUY2GET1",
          type: "buyget",
          status: "active",
          is_automatic: false,
          application_method: {
            type: "percentage",
            target_type: "items",
            allocation: "each",
            max_quantity: 999,
            value: 100,
            currency_code: "inr",
            buy_rules_min_quantity: 2,
            apply_to_quantity: 1,
            buy_rules: [
              {
                attribute: "items.product.id",
                operator: "in",
                values: [pidBracelet],
              },
            ],
            target_rules: [
              {
                attribute: "items.product.id",
                operator: "in",
                values: [pidBracelet],
              },
            ],
          },
        },
        {
          code: "AMB_DEMO_BRACELET_PAIR50",
          type: "standard",
          status: "active",
          is_automatic: false,
          application_method: {
            type: "percentage",
            target_type: "items",
            allocation: "each",
            max_quantity: 999,
            value: 50,
            currency_code: "inr",
            target_rules: [
              {
                attribute: "items.product.id",
                operator: "in",
                values: [pidBracelet],
              },
            ],
          },
        },
        {
          code: "AMB_DEMO_FREESHIP",
          type: "standard",
          status: "active",
          is_automatic: true,
          application_method: {
            type: "percentage",
            target_type: "shipping_methods",
            allocation: "across",
            value: 100,
            currency_code: "inr",
          },
          rules: [
            {
              attribute: "subtotal",
              operator: "gte",
              values: ["100"],
            },
          ],
        },
      ],
    },
  });

  logger.info(
    `Demo promotions ready. Codes: ${demoPromotionCodes.join(
      ", ",
    )}. Use AMB_DEMO_* at checkout (except AMB_DEMO_FREESHIP — automatic). For “two bracelets pay for one” at checkout, prefer AMB_DEMO_BRACELET_PAIR50; buy-get AMB_DEMO_BUY2GET1 often needs three units in cart (Medusa). Target products: celestial-pearl-drops, eternal-diamond-solitaire, infinity-tennis-bracelet.`,
  );
}
