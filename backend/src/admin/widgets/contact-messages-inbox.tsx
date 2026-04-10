import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { Badge, Button, Container, Heading, Input, Select, Text, Textarea } from "@medusajs/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { sdk } from "../lib/sdk";

type ContactMessageStatus = "new" | "in_progress" | "resolved";

type ContactMessage = {
  id: string;
  created_at: string;
  updated_at: string;
  status: ContactMessageStatus;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  admin_note?: string;
};

type ContactMessageListResponse = {
  messages: ContactMessage[];
  count: number;
};

function statusBadgeColor(status: ContactMessageStatus) {
  if (status === "resolved") return "green";
  if (status === "in_progress") return "orange";
  return "blue";
}

function prettyStatus(status: ContactMessageStatus): string {
  return status === "in_progress" ? "In Progress" : status[0].toUpperCase() + status.slice(1);
}

function prettySubject(s: string): string {
  const map: Record<string, string> = {
    general: "General Inquiry",
    bespoke: "Bespoke Design",
    order: "Order Inquiry",
    appointment: "Appointment",
    other: "Other",
  };
  return map[s] ?? s;
}

const ContactMessagesInboxWidget = () => {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | ContactMessageStatus>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["contact-messages", q, status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (status !== "all") params.set("status", status);
      const res = await sdk.client.fetch<ContactMessageListResponse>(
        `/admin/contact-messages?${params.toString()}`,
      );
      return res;
    },
  });

  const rows = data?.messages ?? [];
  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      status?: ContactMessageStatus;
      admin_note?: string;
    }) => {
      await sdk.client.fetch<{ message: ContactMessage }>(
        `/admin/contact-messages/${payload.id}`,
        {
          method: "POST",
          body: payload,
        },
      );
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["contact-messages"] });
    },
  });

  return (
    <Container className="divide-y p-0 overflow-hidden">
      <div className="px-6 py-4">
        <Heading level="h2">Contact Inbox</Heading>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          Messages submitted from storefront Contact page.
        </Text>
      </div>

      <div className="px-6 py-4 grid gap-3 md:grid-cols-[1fr_220px_auto]">
        <Input
          placeholder="Search name, email, subject, or message..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <Select.Trigger>
            <Select.Value placeholder="Filter status" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="all">All statuses</Select.Item>
            <Select.Item value="new">New</Select.Item>
            <Select.Item value="in_progress">In Progress</Select.Item>
            <Select.Item value="resolved">Resolved</Select.Item>
          </Select.Content>
        </Select>
        <Button variant="secondary" onClick={() => void refetch()} isLoading={isLoading}>
          Refresh
        </Button>
      </div>

      <div className="px-6 py-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-2 max-h-[520px] overflow-auto pr-1">
          {rows.length === 0 && !isLoading ? (
            <Text size="small" className="text-ui-fg-subtle">
              No contact messages.
            </Text>
          ) : null}
          {rows.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setSelectedId(m.id);
                setNoteDraft(m.admin_note ?? "");
              }}
              className={`w-full text-left rounded-md border px-3 py-3 transition-colors ${
                selectedId === m.id
                  ? "border-ui-border-interactive bg-ui-bg-interactive-hover"
                  : "border-ui-border-base hover:bg-ui-bg-subtle"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <Text weight="plus">{m.name}</Text>
                <Badge color={statusBadgeColor(m.status)} size="2xsmall">
                  {prettyStatus(m.status)}
                </Badge>
              </div>
              <Text size="small" className="text-ui-fg-subtle">
                {m.email}
                {m.phone ? ` · ${m.phone}` : ""}
              </Text>
              <Text size="small" className="mt-1">
                {prettySubject(m.subject)}
              </Text>
              <Text size="xsmall" className="text-ui-fg-muted mt-1">
                {new Date(m.created_at).toLocaleString("en-IN")}
              </Text>
            </button>
          ))}
        </div>

        <div className="rounded-md border border-ui-border-base p-4">
          {selected ? (
            <div className="space-y-4">
              <div>
                <Heading level="h3">{selected.name}</Heading>
                <Text size="small" className="text-ui-fg-subtle">
                  {selected.email}
                  {selected.phone ? ` · ${selected.phone}` : ""}
                </Text>
              </div>
              <div>
                <Text size="small" className="text-ui-fg-subtle">
                  Subject
                </Text>
                <Text>{prettySubject(selected.subject)}</Text>
              </div>
              <div>
                <Text size="small" className="text-ui-fg-subtle">
                  Message
                </Text>
                <Text className="whitespace-pre-wrap">{selected.message}</Text>
              </div>
              <div className="grid gap-2">
                <Text size="small" className="text-ui-fg-subtle">
                  Admin note
                </Text>
                <Textarea
                  rows={4}
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Add internal note..."
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() =>
                      updateMutation.mutate({
                        id: selected.id,
                        admin_note: noteDraft,
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
                        status: "in_progress",
                      })
                    }
                    isLoading={updateMutation.isPending}
                  >
                    Mark In Progress
                  </Button>
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() =>
                      updateMutation.mutate({
                        id: selected.id,
                        status: "resolved",
                      })
                    }
                    isLoading={updateMutation.isPending}
                  >
                    Mark Resolved
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Text size="small" className="text-ui-fg-subtle">
              Select a message from the left list.
            </Text>
          )}
        </div>
      </div>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "order.list.before",
});

export default ContactMessagesInboxWidget;
