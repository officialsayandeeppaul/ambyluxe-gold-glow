# Promotions in Medusa — simple guide for shop admins

This page explains discounts and coupons in **Medusa Admin** in everyday language. You do **not** need to be technical to follow it.

---

## Quick glossary

| Term | Plain meaning |
|------|----------------|
| **Promotion** | Any special deal: a coupon code, an automatic discount, or a “buy X get Y” rule. |
| **Code** | The word customers type at checkout (example: `SUMMER10`). |
| **Active** | The deal is turned **on**. If it is off, nothing happens at checkout. |
| **Rule** | A condition, like “only in India (INR)” or “only this product”. |
| **Buy rules** | “What must be *in the basket* for this deal to *unlock*?” (used for **Buy X Get Y**). |
| **Target rules** | “*Which items* does the discount actually apply to?” |
| **Standard promotion** | Normal coupon: percent off or fixed money off. |
| **Buy-get (Buy X Get Y)** | Example: buy 2 of something, get money off (or free) on another unit — special logic; see below. |
| **Automatic promotion** | No code — the system applies it when rules match (example: free shipping over a certain amount). |

---

## The seven demo patterns (Amby Luxe)

Your project can ship with **demo** codes after running seed. Think of them as **examples** of each pattern:

| What customers experience | Typical code (demo) | Idea in one sentence |
|---------------------------|----------------------|----------------------|
| Fixed **₹** off **one product** | `AMB_DEMO_ITEM_FIXED` | “₹X off this ring,” not the whole cart. |
| Fixed **₹** off the **whole order** | `AMB_DEMO_ORDER_FIXED` | “₹X off everything in the cart.” |
| **Percent** off **one product** | `AMB_DEMO_ITEM_PCT` | “10% off this necklace.” |
| **Percent** off the **whole order** | `AMB_DEMO_ORDER_PCT` | “5% off the entire purchase.” |
| **Buy-get** on the bracelet (advanced) | `AMB_DEMO_BUY2GET1` | Buy-get in Medusa; same-SKU deals often need **3** in the cart before a discount shows. |
| **Two bracelets ≈ pay for one** (simple %) | `AMB_DEMO_BRACELET_PAIR50` | **50% off each** Infinity Tennis Bracelet unit — with **2** in the cart, total equals paying for **1** (easiest demo at checkout). |
| **Free or discounted shipping** (automatic) | *(no code — automatic)* | “When cart rules match, shipping is discounted.” |

Use these as **templates**: copy the idea, change amounts, products, or codes.

---

## What to set first (every promotion)

1. **Status** — set to **Active** when you want it to work.
2. **Who can use it** — often **currency** (example: **Indian Rupee**) so only INR carts qualify.
3. **Code** (if it is **not** automatic) — short, no spaces, easy to type. Shoppers type this at checkout.

---

## Pattern A — percent or fixed amount off **one product**

**Good for:** “10% off this bracelet” or “₹500 off that ring.”

**Steps (conceptually):**

1. Create a **standard** promotion.
2. Choose **percentage** or **fixed** amount; set the number (10% or ₹ amount).
3. Set **where it applies** to **items** (products), not the whole order.
4. Add a **rule** so it only hits **one product** (pick the product in Admin).
5. Save. Test at checkout: add **that** product, apply the code.

---

## Pattern B — percent or fixed amount off the **whole cart**

**Good for:** “₹1000 off your order” or “5% off everything today.”

**Steps (conceptually):**

1. Create a **standard** promotion.
2. Choose **percentage** or **fixed**; set the value.
3. Set **where it applies** to the **order** (whole cart), not a single line.
4. Optional: add rules (currency, dates, minimum spend — if your Admin shows these).
5. Save and test with **any** products in the cart.

---

## Pattern C — **Buy X Get Y** (same product)

**Good for:** “Buy 2 tennis bracelets, get a benefit on how we price them.”

This type is **strong** but easy to break if rules are duplicated.

### The golden rule (read this twice)

On a **buy-get** promotion, Medusa already stores:

- **How many units must be bought** (“buy 2”), and  
- **How many units the discount applies to** (“apply to 1”),

in the promotion’s **main settings** (the method / allocation area).

So:

- Under **Buy rules**, you should usually keep **only** conditions that say **which product** counts (for example: *this bracelet*).  
- **Do not** add a **second** row that also says “minimum quantity of items = 2” if the screen already says **buy quantity = 2** elsewhere — that **double** condition often makes the cart show **no discount** even when the code is “accepted.”
- Under **Target rules** (what gets discounted), you should usually keep **only** the **product** you mean.  
- **Do not** duplicate “quantity = 1” here if the promotion already says **apply to quantity = 1** in its main settings.

If checkout accepts the code but **nothing** is deducted, open the promotion and **remove the extra quantity rows** in Buy and Target, leaving **product-only** rules, then try again — or add a **third** bracelet and re-apply (Medusa behavior for same-product buy-get).

**Easier demo for “two bracelets, pay for one”:** use the **standard** code **`AMB_DEMO_BRACELET_PAIR50`** (50% off each bracelet unit). Two units in the cart → same money as one full price.

**To reset demo promos from the project:** in the `backend` folder, run `npm run seed:promotions` — this recreates all **AMB_DEMO_*** codes, including `AMB_DEMO_BRACELET_PAIR50`.

---

## Pattern D — **automatic** promotion (no code)

**Good for:** “Free shipping when order is big enough.”

**Steps (conceptually):**

1. Create a **standard** promotion.
2. Mark it **automatic** (no customer code).
3. Apply to **shipping** (or as your Admin describes it).
4. Add a **cart rule** such as minimum subtotal (Admin will guide the wording).
5. Save. Test: meet the condition; shipping should update **without** typing a code.

---

## Testing checklist (for any promotion)

1. Use a **normal customer cart** on the **storefront** (same currency as the rule, e.g. INR).
2. Add products that **match** the rules.
3. If there is a **code**, type it and tap **Apply**.
4. Check **order summary**: subtotal, discount line, total.
5. If the code “works” but **total does not change**, open the promotion in Admin and look for **duplicate** quantity rules (see Pattern C).

---

## If something goes wrong

| Symptom | What to check |
|--------|----------------|
| Code not accepted | Active? Correct currency / region? Typo in code? |
| Code accepted, **no** discount | Buy-get: remove duplicate **minimum quantity** / extra **target quantity** rules. |
| Discount on wrong product | Item vs order target; product picklist in rules. |
| Automatic deal never shows | Automatic flag, dates, minimum spend, shipping method availability. |

---

## Technical note (for IT only)

Demo promotions are defined in code in `backend/src/scripts/seed-promotions.ts` and in the main `seed.ts`. Running `npm run seed:promotions` replaces existing rows with the same **AMB_DEMO_*** codes.

---

*End of guide. For server setup and API keys, see `backend/README.md`.*
