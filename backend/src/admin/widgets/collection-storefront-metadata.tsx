import { defineWidgetConfig } from "@medusajs/admin-sdk";
import type { AdminCollection, DetailWidgetProps } from "@medusajs/framework/types";
import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Switch,
  Text,
  Textarea,
} from "@medusajs/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { sdk } from "../lib/sdk";

const HERO_MAX_BYTES = 8 * 1024 * 1024;
const HERO_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif";

function readString(m: Record<string, unknown> | undefined, key: string): string {
  const v = m?.[key];
  if (v == null) return "";
  return typeof v === "string" ? v : String(v);
}

function readBool(m: Record<string, unknown> | undefined, key: string): boolean {
  const v = m?.[key];
  return v === true || v === "true" || v === "1" || v === 1;
}

function SaveModal({
  open,
  ok,
  message,
  onClose,
}: {
  open: boolean;
  ok: boolean;
  message: string;
  onClose: () => void;
}) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483000] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[1px]"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="col-sf-save-modal-title"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-xl border border-ui-border-strong bg-ui-bg-base shadow-elevation-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-ui-border-base">
          <Heading id="col-sf-save-modal-title" level="h2">
            {ok ? "Saved" : "Could not save"}
          </Heading>
        </div>
        <div className="px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle leading-relaxed">
            {message}
          </Text>
        </div>
        <div className="px-6 py-4 flex justify-end border-t border-ui-border-base">
          <Button type="button" variant="primary" onClick={onClose}>
            OK
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const CollectionStorefrontMetadataWidget = ({
  data: collection,
}: DetailWidgetProps<AdminCollection>) => {
  const qc = useQueryClient();

  const [tagline, setTagline] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [longDesc, setLongDesc] = useState("");
  const [heroImage, setHeroImage] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [showOnHomepage, setShowOnHomepage] = useState(false);
  const [uploadHint, setUploadHint] = useState<string | null>(null);

  const heroFileRef = useRef<HTMLInputElement>(null);

  const [saveModal, setSaveModal] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    const m = (collection.metadata ?? undefined) as Record<string, unknown> | undefined;
    setTagline(readString(m, "storefront_tagline"));
    setShortDesc(readString(m, "storefront_short"));
    setLongDesc(readString(m, "storefront_long"));
    setHeroImage(readString(m, "hero_image"));
    setSortOrder(readString(m, "sort_order"));
    setShowOnHomepage(readBool(m, "storefront_home"));
    setUploadHint(null);
  }, [collection.id, collection.metadata]);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      const patch: Record<string, string> = {
        storefront_tagline: tagline.trim(),
        storefront_short: shortDesc.trim(),
        storefront_long: longDesc.trim(),
        hero_image: heroImage.trim(),
        sort_order: sortOrder.trim(),
        storefront_home: showOnHomepage ? "true" : "false",
      };

      const merged: Record<string, unknown> = {
        ...((collection.metadata as Record<string, unknown> | undefined) ?? {}),
      };

      for (const [k, v] of Object.entries(patch)) {
        if (k === "storefront_home") {
          merged[k] = v;
          continue;
        }
        if (v === "") {
          delete merged[k];
          continue;
        }
        merged[k] = v;
      }

      return sdk.admin.productCollection.update(collection.id, { metadata: merged });
    },
    onSuccess: () => {
      void qc.invalidateQueries();
      setSaveModal({
        ok: true,
        message:
          "Storefront collection fields saved. Refresh the public site to see updates (or wait for cache).",
      });
    },
    onError: (e: Error) => {
      setSaveModal({
        ok: false,
        message: e?.message || "Something went wrong. Try again.",
      });
    },
  });

  const { mutateAsync: uploadHero, isPending: isUploading } = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > HERO_MAX_BYTES) {
        throw new Error(`Image must be ${Math.floor(HERO_MAX_BYTES / (1024 * 1024))} MB or smaller.`);
      }
      const { files } = await sdk.admin.upload.create({ files: [file] });
      const url = files?.[0]?.url;
      if (!url || typeof url !== "string") {
        throw new Error("Upload finished but no file URL was returned.");
      }
      return url;
    },
    onSuccess: (url) => {
      setHeroImage(url);
      setUploadHint(null);
    },
    onError: (e: Error) => {
      setUploadHint(e?.message || "Upload failed.");
    },
  });

  return (
    <Container className="divide-y divide-dashed p-0 mb-6 border border-ui-border-strong rounded-lg overflow-hidden bg-ui-bg-subtle/30">
      <SaveModal
        open={saveModal != null}
        ok={saveModal?.ok ?? true}
        message={saveModal?.message ?? ""}
        onClose={() => setSaveModal(null)}
      />

      <div className="px-6 py-4 space-y-1">
        <Heading level="h2">Amby Luxe — collection on the website</Heading>
        <Text size="small" className="text-ui-fg-muted max-w-4xl">
          The public <span className="text-ui-fg-base">title</span> and{" "}
          <span className="text-ui-fg-base">handle</span> come from Medusa’s main collection fields
          below. These rows map to storefront metadata keys:{" "}
          <span className="font-mono text-ui-fg-subtle text-[11px]">
            storefront_tagline, storefront_short, storefront_long, hero_image, sort_order, storefront_home
          </span>
          .
        </Text>
        <Text size="small" className="text-ui-fg-subtle">
          Current: <span className="text-ui-fg-base font-medium">{collection.title}</span>
          <span className="mx-2 text-ui-fg-muted">·</span>
          <span className="font-mono text-xs">{collection.handle}</span>
        </Text>
      </div>

      <div className="px-6 py-4 w-full grid gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 rounded-md border border-ui-border-base bg-ui-bg-base/40 px-4 py-3">
          <div className="space-y-1 min-w-0">
            <Label htmlFor="col-storefront-home">Show on homepage strip</Label>
            <Text size="small" className="text-ui-fg-muted max-w-xl">
              When on, this collection appears in the homepage “Collections” section. Off = still on{" "}
              <span className="font-mono text-[11px]">/collections</span> if published.
            </Text>
          </div>
          <Switch
            id="col-storefront-home"
            checked={showOnHomepage}
            onCheckedChange={setShowOnHomepage}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2 lg:gap-8 lg:items-start">
          <div className="space-y-2 min-w-0">
            <Label>Tagline (gold line above title)</Label>
            <Input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. Enduring Elegance"
            />
          </div>
          <div className="space-y-2 min-w-0">
            <Label>Sort order on /collections</Label>
            <Input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              placeholder="1"
            />
            <Text size="small" className="text-ui-fg-muted">
              Lower number appears first on <span className="font-mono text-[11px]">/collections</span> and
              among homepage collections. Leave empty: known handles (timeless, heritage, celestial) keep
              1–3; other handles sort after them (unless you set a number).
            </Text>
          </div>
        </div>

        <div className="space-y-2 min-w-0">
          <Label>Short description (homepage strip & cards)</Label>
          <Textarea
            rows={3}
            className="min-h-[4.5rem] break-words [overflow-wrap:anywhere]"
            value={shortDesc}
            onChange={(e) => setShortDesc(e.target.value)}
            placeholder="One or two sentences for teaser text."
          />
        </div>

        <div className="space-y-2 min-w-0">
          <Label>Long description (/collections page body)</Label>
          <Textarea
            rows={6}
            className="min-h-[9rem] break-words [overflow-wrap:anywhere]"
            value={longDesc}
            onChange={(e) => setLongDesc(e.target.value)}
            placeholder="Editorial paragraph shown next to the hero image."
          />
        </div>

        <div className="space-y-3 min-w-0">
          <Label>Hero image (collections page)</Label>
          <Text size="small" className="text-ui-fg-muted leading-relaxed block">
            Upload from your computer — stored by Medusa and linked automatically. The storefront loads
            this URL (no need to host the file in Vite <span className="font-mono text-[11px]">public/</span>
            ). JPEG, PNG, WebP, GIF, AVIF — max {Math.floor(HERO_MAX_BYTES / (1024 * 1024))} MB.
          </Text>
          <input
            ref={heroFileRef}
            type="file"
            accept={HERO_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              if (!file.type.startsWith("image/")) {
                setUploadHint("Please choose an image file.");
                return;
              }
              void uploadHero(file).catch(() => undefined);
            }}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={isUploading || isPending}
              onClick={() => heroFileRef.current?.click()}
            >
              {isUploading ? "Uploading…" : "Upload image"}
            </Button>
            {heroImage ? (
              <Button
                type="button"
                variant="secondary"
                disabled={isPending}
                onClick={() => {
                  setHeroImage("");
                  setUploadHint(null);
                }}
              >
                Clear hero
              </Button>
            ) : null}
          </div>
          {uploadHint ? (
            <Text size="small" className="text-red-600">
              {uploadHint}
            </Text>
          ) : null}
          {heroImage ? (
            <div className="rounded-lg border border-ui-border-base bg-ui-bg-base p-3 max-w-md overflow-hidden">
              <Text size="small" className="text-ui-fg-muted font-mono break-all block mb-2">
                {heroImage}
              </Text>
              <img
                src={
                  /^https?:\/\//i.test(heroImage)
                    ? heroImage
                    : `${(import.meta.env.VITE_BACKEND_URL ?? "").replace(/\/$/, "")}${heroImage.startsWith("/") ? heroImage : `/${heroImage}`}`
                }
                alt="Hero preview"
                className="max-h-40 w-auto max-w-full rounded object-contain"
              />
            </div>
          ) : null}
          <details className="rounded-md border border-ui-border-base bg-ui-bg-subtle/40 px-4 py-3">
            <summary className="cursor-pointer text-sm text-ui-fg-muted select-none">
              Optional: paste URL instead of uploading
            </summary>
            <div className="pt-3 space-y-2">
              <Input
                value={heroImage}
                onChange={(e) => {
                  setHeroImage(e.target.value);
                  setUploadHint(null);
                }}
                placeholder="https://… or /images/products/…"
              />
              <Text size="small" className="text-ui-fg-muted">
                Use only if the image is already hosted (e.g. CDN or storefront <span className="font-mono">public/</span>
                ).
              </Text>
            </div>
          </details>
        </div>
      </div>

      <div className="px-6 py-4 flex justify-end bg-ui-bg-base border-t border-ui-border-base">
        <Button
          type="button"
          variant="primary"
          disabled={isPending}
          onClick={() => void mutateAsync()}
        >
          {isPending ? "Saving…" : "Save storefront fields"}
        </Button>
      </div>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "product_collection.details.before",
});

export default CollectionStorefrontMetadataWidget;
