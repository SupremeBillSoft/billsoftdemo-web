// src/features/debitNotes/DNItemEntryGrid.tsx
//
// Unlike PI's/PRet's grids (locked to "one row per source line" since those
// documents can ONLY draw against a PO/Invoice's open lines), a Debit Note
// supports a standalone path too (price/quantity adjustment with nothing to
// source from) - so this is a free add/edit/remove grid, same shape as
// PO's/PR's. When linked to a Purchase Invoice, the FormPage pre-loads
// `value` from that invoice's lines (BRD 6.5.5.2 "invoice item details
// should be auto-fetched"), still editable afterwards.

import { useState } from "react";
import { Button, Input, InputNumber, Select, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { sumPreviews, type LineTaxContext } from "../../lib/gst/lineTax";
import type { DNItemRow } from "./schema";

export interface DNItemOption {
  id: number;
  itemCode: string;
  description?: string;
  uom?: string;
  hsnSac?: string;
}

function emptyDraft(): DNItemRow {
  return {
    invoiceItem: null,
    item: undefined as unknown as number,
    itemCode: "",
    description: "",
    uom: "",
    hsnSac: "",
    quantity: 1,
    rate: 0,
    tax: null,
  };
}

export function DNItemEntryGrid({
  value,
  onChange,
  itemOptions,
  taxContext,
  readOnly = false,
}: {
  value: DNItemRow[];
  onChange: (rows: DNItemRow[]) => void;
  itemOptions: DNItemOption[];
  taxContext: LineTaxContext;
  readOnly?: boolean;
}) {
  const [draft, setDraft] = useState<DNItemRow>(emptyDraft());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  function handleItemSelect(itemId: number) {
    const opt = itemOptions.find((o) => o.id === itemId);
    setDraft((prev) => ({
      ...prev,
      item: itemId,
      itemCode: opt?.itemCode ?? "",
      description: opt?.description ?? prev.description,
      uom: opt?.uom ?? prev.uom,
      hsnSac: opt?.hsnSac ?? prev.hsnSac,
      tax: taxContext.defaultTaxFor(itemId),
    }));
  }

  function handleAdd() {
    if (!draft.item || !draft.quantity) return;
    if (editingIndex !== null) {
      const next = [...value];
      next[editingIndex] = draft;
      onChange(next);
    } else {
      onChange([...value, draft]);
    }
    setDraft(emptyDraft());
    setEditingIndex(null);
  }

  function handleEdit(index: number) {
    setDraft(value[index]);
    setEditingIndex(index);
  }

  function handleRemove(index: number) {
    onChange(value.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setDraft(emptyDraft());
      setEditingIndex(null);
    }
  }

  const previewFor = (row: DNItemRow) =>
    taxContext.preview({ qty: row.quantity || 0, rate: row.rate || 0, taxId: row.tax });

  const totals = sumPreviews(value.map(previewFor));

  const columns: ColumnsType<DNItemRow> = [
    { title: "Item", dataIndex: "itemCode" },
    { title: "UOM", dataIndex: "uom" },
    { title: "HSN/SAC", dataIndex: "hsnSac" },
    { title: "Qty", dataIndex: "quantity" },
    { title: "Rate", dataIndex: "rate" },
    {
      title: "Tax Type",
      key: "taxName",
      render: (_, r) => (r.tax == null ? <span style={{ color: "#ad6800" }}>No tax</span> : taxContext.taxName(r.tax)),
    },
    { title: "Taxable", key: "taxable", render: (_, r) => previewFor(r).taxableValue.toFixed(2) },
    { title: "CGST", key: "cgst", render: (_, r) => previewFor(r).cgst.toFixed(2) },
    { title: "SGST", key: "sgst", render: (_, r) => previewFor(r).sgst.toFixed(2) },
    { title: "IGST", key: "igst", render: (_, r) => previewFor(r).igst.toFixed(2) },
    { title: "Total", key: "total", render: (_, r) => previewFor(r).lineTotal.toFixed(2) },
    ...(readOnly
      ? []
      : [
          {
            title: "",
            key: "actions",
            render: (_: unknown, __: DNItemRow, index: number) => (
              <div style={{ display: "flex", gap: 12 }}>
                <a onClick={() => handleEdit(index)}>Edit</a>
                <a onClick={() => handleRemove(index)}>Remove</a>
              </div>
            ),
          },
        ]),
  ];

  return (
    <div>
      {!readOnly && (
        <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 2 }}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Item Code</div>
            <Select
              style={{ width: "100%" }}
              showSearch
              optionFilterProp="label"
              // A line fetched from the linked invoice keeps that invoice's item.
              disabled={draft.invoiceItem != null}
              value={draft.item || undefined}
              options={itemOptions.map((o) => ({ value: o.id, label: o.itemCode }))}
              onChange={handleItemSelect}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Qty</div>
            <InputNumber style={{ width: "100%" }} min={0} value={draft.quantity} onChange={(v) => setDraft((p) => ({ ...p, quantity: v ?? 0 }))} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Rate</div>
            <InputNumber style={{ width: "100%" }} min={0} value={draft.rate} onChange={(v) => setDraft((p) => ({ ...p, rate: v ?? 0 }))} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Tax Type</div>
            <Select
              style={{ width: "100%" }}
              allowClear
              placeholder="No tax"
              value={draft.tax ?? undefined}
              options={taxContext.taxOptions}
              onChange={(v) => setDraft((p) => ({ ...p, tax: v ?? null }))}
            />
          </div>
          <div style={{ flex: 2 }}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Description</div>
            <Input value={draft.description} onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))} />
          </div>
          <Button type="dashed" onClick={handleAdd}>
            {editingIndex !== null ? "Update" : "+ Add"}
          </Button>
        </div>
      )}
      <Table<DNItemRow> dataSource={value} columns={columns} rowKey={(r, i) => `${r.item}-${i}`} pagination={false} />
      <div style={{ textAlign: "right", marginTop: 8, fontWeight: 500 }}>
        Taxable: {totals.taxable.toFixed(2)} · CGST: {totals.cgst.toFixed(2)} · SGST: {totals.sgst.toFixed(2)} · IGST:{" "}
        {totals.igst.toFixed(2)} · Grand Total: {totals.total.toFixed(2)}
      </div>
    </div>
  );
}
