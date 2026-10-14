// src/features/sales/shared/components.tsx
//
// Small building blocks reused across the sales screens.

import { useEffect, useState, type ReactNode } from "react";
import { Button, DatePicker, Input, Modal, Select, Tag } from "antd";
import { DownOutlined, UpOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useGodownsQuery } from "../../inventory/api";
import type { CustomField, ListParams } from "./types";

export const money = (value?: number | string | null) =>
  Number(value ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const today = () => dayjs().format("YYYY-MM-DD");

// BRD 6.2.2: inactive / suspended parties can't be picked on a new
// transaction (the backend enforces it too).
const BLOCKED_PARTY_STATUSES = new Set(["Inactive", "Suspend/Hold"]);

export interface CustomerParty {
  id: number;
  partyCode: string;
  partyName: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstNo?: string;
  mobileNo?: string;
  email?: string;
  partyContactPerson?: string;
  isCustomer?: boolean;
  isExportCustomer?: boolean;
  status?: string;
  shippingAddresses?: {
    shippingPartyName?: string;
    shippingAddress1?: string;
    shippingAddress2?: string;
    shippingCity?: string;
    shippingState?: string;
    shippingPincode?: string;
    shippingGstNo?: string;
  }[];
}

export function isUsableCustomer(party: CustomerParty, exportOnly = false): boolean {
  if (BLOCKED_PARTY_STATUSES.has(party.status ?? "")) return false;
  return exportOnly ? !!party.isExportCustomer : !!(party.isCustomer || party.isExportCustomer);
}

export function partyAddress(party?: CustomerParty): string {
  if (!party) return "";
  return [party.address1, party.address2, party.city, party.state, party.pincode].filter(Boolean).join(", ");
}

export function customerOptions(parties: CustomerParty[], exportOnly = false, keepId?: number | null) {
  return parties
    .filter((p) => isUsableCustomer(p, exportOnly) || p.id === keepId)
    .map((p) => ({ value: p.id, label: `${p.partyCode} - ${p.partyName}` }));
}

export const STATUS_COLOR: Record<string, string> = {
  Open: "blue",
  Closed: "default",
  Draft: "default",
  Sent: "blue",
  Accepted: "green",
  Declined: "red",
  Converted: "purple",
  Expired: "orange",
  Pending: "gold",
  Completed: "green",
  Active: "green",
  Cancelled: "red",
  Unpaid: "gold",
  "Partially Refunded": "blue",
  Refunded: "green",
};

export function StatusTag({ status }: { status: string }) {
  return <Tag color={STATUS_COLOR[status] ?? "default"}>{status}</Tag>;
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <h2 style={{ margin: 0 }}>{title}</h2>
      {action}
    </div>
  );
}

export function SummaryCards({ cards }: { cards: { label: string; value: number | string | undefined }[] }) {
  return (
    <div style={{ display: "flex", gap: 16, marginBottom: 18 }}>
      {cards.map((c) => (
        <div key={c.label} style={{ border: "1px solid #E4E1DA", borderRadius: 8, padding: "12px 20px", minWidth: 180 }}>
          <div style={{ fontSize: 12, color: "#6b6b6b" }}>{c.label}</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{c.value ?? "-"}</div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Search & Filter panel - the filters are sent to the server (?search=,
// ?status=, ?from=, ?to=, ...) when the user presses Search.
// ---------------------------------------------------------------------------

export interface FilterField {
  name: string;
  label: string;
  type?: "text" | "select" | "date";
  options?: { value: string; label: string }[];
}

export const DATE_RANGE_FIELDS: FilterField[] = [
  { name: "from", label: "From Date", type: "date" },
  { name: "to", label: "To Date", type: "date" },
];

export function FilterPanel({ fields, onApply }: { fields: FilterField[]; onApply: (params: ListParams) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ListParams>({});

  const set = (name: string, value: string | undefined) => setDraft((d) => ({ ...d, [name]: value }));

  return (
    <div style={{ border: "1px solid #E4E1DA", borderRadius: 8, padding: 16, marginBottom: 18 }}>
      <div
        style={{ cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <UpOutlined /> : <DownOutlined />} Search & Filter
      </div>
      {open && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 14 }}>
            {fields.map((f) => (
              <div key={f.name}>
                <div style={{ fontSize: 11.5, marginBottom: 5 }}>{f.label}</div>
                {f.type === "select" ? (
                  <Select
                    allowClear
                    style={{ width: "100%" }}
                    placeholder="All"
                    options={f.options}
                    value={(draft[f.name] as string) ?? undefined}
                    onChange={(v) => set(f.name, v)}
                  />
                ) : f.type === "date" ? (
                  <DatePicker
                    style={{ width: "100%" }}
                    value={draft[f.name] ? dayjs(String(draft[f.name])) : null}
                    onChange={(d) => set(f.name, d ? d.format("YYYY-MM-DD") : undefined)}
                  />
                ) : (
                  <Input value={(draft[f.name] as string) ?? ""} onChange={(e) => set(f.name, e.target.value)} />
                )}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <Button type="primary" onClick={() => onApply(draft)}>
              Search
            </Button>
            <Button
              onClick={() => {
                setDraft({});
                onApply({});
              }}
            >
              Show All
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom fields (BRD "Add custom fields") - name / value rows.
// ---------------------------------------------------------------------------

export function CustomFieldsEditor({
  value,
  onChange,
  readOnly = false,
}: {
  value: CustomField[];
  onChange: (rows: CustomField[]) => void;
  readOnly?: boolean;
}) {
  const rows = value ?? [];
  const patch = (i: number, changes: Partial<CustomField>) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, ...changes } : r)));

  return (
    <div>
      {rows.map((row, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
          <Input
            style={{ width: 220 }}
            placeholder="Field name"
            disabled={readOnly}
            value={row.name}
            onChange={(e) => patch(i, { name: e.target.value })}
          />
          <Input
            style={{ width: 320 }}
            placeholder="Value"
            disabled={readOnly}
            value={row.value}
            onChange={(e) => patch(i, { value: e.target.value })}
          />
          {!readOnly && <a onClick={() => onChange(rows.filter((_, j) => j !== i))}>Remove</a>}
        </div>
      ))}
      {!readOnly && (
        <Button size="small" type="dashed" onClick={() => onChange([...rows, { name: "", value: "" }])}>
          + Add Custom Field
        </Button>
      )}
      {readOnly && rows.length === 0 && <span style={{ color: "#8c8c8c" }}>None</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Godown picker used when a conversion creates an invoice (stock leaves
// from the chosen godown).
// ---------------------------------------------------------------------------

export function GodownPickerModal({
  open,
  title,
  loading,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  title: string;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (godown: number) => void;
}) {
  const { data: godowns = [] } = useGodownsQuery();
  const active = godowns.filter((g) => g.status !== "Inactive");
  const [godown, setGodown] = useState<number | undefined>();

  useEffect(() => {
    if (open && godown === undefined) setGodown(active.find((g) => g.isMain)?.id ?? active[0]?.id);
  }, [open, active, godown]);

  return (
    <Modal
      open={open}
      title={title}
      okText="Create Invoice"
      confirmLoading={loading}
      okButtonProps={{ disabled: !godown }}
      onCancel={onCancel}
      onOk={() => godown && onSubmit(godown)}
      destroyOnHidden
    >
      <div style={{ marginBottom: 6 }}>Dispatch stock from godown</div>
      <Select
        style={{ width: "100%" }}
        value={godown}
        onChange={setGodown}
        options={active.map((g) => ({ value: g.id, label: `${g.name}${g.isMain ? " (Main)" : ""}` }))}
      />
    </Modal>
  );
}

// Text prompt (close reason, decline note, ...) as a modal.
export function ReasonModal({
  open,
  title,
  label,
  required,
  loading,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  title: string;
  label: string;
  required?: boolean;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <Modal
      open={open}
      title={title}
      confirmLoading={loading}
      okButtonProps={{ disabled: required && !reason.trim() }}
      onCancel={() => {
        setReason("");
        onCancel();
      }}
      onOk={() => {
        onSubmit(reason.trim());
        setReason("");
      }}
      destroyOnHidden
    >
      <div style={{ marginBottom: 6 }}>{label}</div>
      <Input.TextArea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
    </Modal>
  );
}

// react-hook-form invalid-submit handler: line-level errors (row 3 qty...)
// have no field on screen to sit under, so list every message in a popup.
export function showFormErrors(errors: unknown) {
  const messages: string[] = [];
  const walk = (node: unknown, path: string) => {
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    if (typeof obj.message === "string" && obj.message) {
      messages.push(path ? `${path}: ${obj.message}` : obj.message);
      return;
    }
    for (const [key, child] of Object.entries(obj)) {
      if (key === "ref" || key === "type") continue;
      const label = /^\d+$/.test(key) ? `Line ${Number(key) + 1}` : key === "root" ? "" : key;
      walk(child, [path, label].filter(Boolean).join(" › "));
    }
  };
  walk(errors, "");
  Modal.error({
    title: "Please fix the following",
    content: <div style={{ whiteSpace: "pre-line" }}>{messages.join("\n") || "Some fields are invalid."}</div>,
    centered: true,
  });
}

/** Active godowns as Select options, plus the main godown as the default. */
export function useGodownOptions() {
  const { data: godowns = [] } = useGodownsQuery();
  const active = godowns.filter((g) => g.status !== "Inactive");
  return {
    options: active.map((g) => ({ value: g.id, label: g.name })),
    defaultGodown: active.find((g) => g.isMain)?.id ?? active[0]?.id ?? null,
  };
}
