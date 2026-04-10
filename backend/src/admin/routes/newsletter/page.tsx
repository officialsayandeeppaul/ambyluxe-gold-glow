import { defineRouteConfig } from "@medusajs/admin-sdk";
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Select,
  Text,
  Textarea,
} from "@medusajs/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Envelope } from "@medusajs/icons";
import { useMemo, useState } from "react";
import { sdk } from "../../lib/sdk";

type Status = "subscribed" | "unsubscribed";

type Subscriber = {
  id: string;
  email: string;
  status: Status;
  created_at: string;
  updated_at: string;
  unsubscribe_reason?: string;
};

type ListResponse = {
  subscribers: Subscriber[];
  count: number;
};

function statusColor(s: Status) {
  return s === "subscribed" ? "green" : "grey";
}

const NewsletterAdminPage = () => {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | Status>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reasonDraft, setReasonDraft] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["newsletter-subscribers", q, status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (status !== "all") params.set("status", status);
      return await sdk.client.fetch<ListResponse>(`/admin/newsletter?${params.toString()}`);
    },
  });

  const rows = data?.subscribers ?? [];
  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; status?: Status; unsubscribe_reason?: string }) => {
      await sdk.client.fetch(`/admin/newsletter/${payload.id}`, {
        method: "POST",
        body: payload,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["newsletter-subscribers"] });
    },
  });

  const csv = useMemo(() => {
    const header = "email,status,created_at,updated_at";
    const lines = rows.map((r) =>
      [r.email, r.status, r.created_at, r.updated_at]
        .map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    return [header, ...lines].join("\n");
  }, [rows]);

  const downloadCsv = () => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Container className="divide-y p-0 overflow-hidden">
      <div className="px-6 py-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Heading level="h1">Newsletter</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            Manage email subscribers collected from the storefront footer.
          </Text>
        </div>
        <Button variant="secondary" onClick={downloadCsv} disabled={rows.length === 0}>
          Export CSV
        </Button>
      </div>

      <div className="px-6 py-4 grid gap-3 md:grid-cols-[1fr_220px_auto]">
        <Input placeholder="Search email..." value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <Select.Trigger>
            <Select.Value placeholder="Filter status" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="all">All</Select.Item>
            <Select.Item value="subscribed">Subscribed</Select.Item>
            <Select.Item value="unsubscribed">Unsubscribed</Select.Item>
          </Select.Content>
        </Select>
        <Button variant="secondary" onClick={() => void refetch()} isLoading={isLoading}>
          Refresh
        </Button>
      </div>

      <div className="px-6 py-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-2 max-h-[560px] overflow-auto pr-1">
          {rows.length === 0 && !isLoading ? (
            <Text size="small" className="text-ui-fg-subtle">
              No subscribers yet.
            </Text>
          ) : null}
          {rows.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSelectedId(s.id);
                setReasonDraft(s.unsubscribe_reason ?? "");
              }}
              className={`w-full text-left rounded-md border px-3 py-3 transition-colors ${
                selectedId === s.id
                  ? "border-ui-border-interactive bg-ui-bg-interactive-hover"
                  : "border-ui-border-base hover:bg-ui-bg-subtle"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <Text weight="plus">{s.email}</Text>
                <Badge color={statusColor(s.status)} size="2xsmall">
                  {s.status}
                </Badge>
              </div>
              <Text size="xsmall" className="text-ui-fg-muted mt-1">
                {new Date(s.created_at).toLocaleString("en-IN")}
              </Text>
            </button>
          ))}
        </div>

        <div className="rounded-md border border-ui-border-base p-4">
          {selected ? (
            <div className="space-y-4">
              <div>
                <Heading level="h3">{selected.email}</Heading>
                <Text size="small" className="text-ui-fg-subtle">
                  Status: {selected.status}
                </Text>
              </div>

              <div className="grid gap-2">
                <Text size="small" className="text-ui-fg-subtle">
                  Unsubscribe reason (optional)
                </Text>
                <Textarea
                  rows={4}
                  value={reasonDraft}
                  onChange={(e) => setReasonDraft(e.target.value)}
                  placeholder="Internal note / reason..."
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() =>
                      updateMutation.mutate({
                        id: selected.id,
                        unsubscribe_reason: reasonDraft,
                      })
                    }
                    isLoading={updateMutation.isPending}
                  >
                    Save Note
                  </Button>
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() =>
                      updateMutation.mutate({
                        id: selected.id,
                        status: "unsubscribed",
                        unsubscribe_reason: reasonDraft,
                      })
                    }
                    isLoading={updateMutation.isPending}
                  >
                    Mark Unsubscribed
                  </Button>
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() =>
                      updateMutation.mutate({
                        id: selected.id,
                        status: "subscribed",
                        unsubscribe_reason: "",
                      })
                    }
                    isLoading={updateMutation.isPending}
                  >
                    Mark Subscribed
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Text size="small" className="text-ui-fg-subtle">
              Select a subscriber from the left list.
            </Text>
          )}
        </div>
      </div>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "Newsletter",
  icon: Envelope,
  rank: 96,
});

export default NewsletterAdminPage;
