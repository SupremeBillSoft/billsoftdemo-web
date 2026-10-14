// src/features/purchaseRequisitions/PRItemEntryGrid.tsx
//
// Deliberately NOT built on the shared RepeatableTabPanel: PR needs to bulk-
// replace every row at once when a Supplier is selected (auto-loading that
// party's associated items), and RepeatableTabPanel only exposes one-row-
// at-a-time add/edit/remove via react-hook-form's useFieldArray. Rather than
// changing that shared component's contract for one caller, this is a
// simple, self-contained grid that takes/returns a plain rows array - a
// controlled component, not a useFieldArray consumer.
//
// This is also the seed for the "parameterized Item Entry Grid" shared
// component (architecture doc section 10.1/10.2): PO and Purchase Invoice
// will need the same Item/UOM/HSN columns PLUS rate+GST, so when that's
// built, this component's column set becomes the "PR variant" of it rather
// than being thrown away.

import { useState } from "react";
import { Button, DatePicker, Input, InputNumber, Select, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { PRItemRow } from "./schema";

export interface ItemOption {
  id: number;
  itemCode: string;
  description?: string;
  uom?: string;
  hsnSac?: string;
}

function emptyDraft(): PRItemRow {
  return { item: undefined as unknown as number, itemCode: "", description: "", uom: "", hsnSac: "", quantity: 1, deliveryDate: null };
}

export function PRItemEntryGrid({
  value,
  onChange,
  itemOptions,
  readOnly = false,
}: {
  value: PRItemRow[];
  onChange: (rows: PRItemRow[]) => void;
  itemOptions: ItemOption[];
  readOnly?: boolean;
}) {
  const [draft, setDraft] = useState<PRItemRow>(emptyDraft());
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

  const columns: ColumnsType<PRItemRow> = [
    { title: "Item", dataIndex: "itemCode" },
    { title: "Description", dataIndex: "description" },
    { title: "UOM", dataIndex: "uom" },
    { title: "HSN/SAC", dataIndex: "hsnSac" },
    { title: "Qty", dataIndex: "quantity" },
    { title: "Delivery Date", dataIndex: "deliveryDate", render: (v: string | null) => v ?? "-" },
    ...(readOnly
      ? []
      : [
          {
            title: "",
            key: "actions",
            render: (_: unknown, __: PRItemRow, index: number) => (
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
        <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-end" }}>
          <div style={{ flex: 2 }}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Item Code</div>
            <Select
              style={{ width: "100%" }}
              showSearch
              value={draft.item || undefined}
              options={itemOptions.map((o) => ({ value: o.id, label: o.itemCode }))}
              onChange={handleItemSelect}
              optionFilterProp="label"
            />
          </div>
          <div style={{ flex: 2 }}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Description</div>
            <Input value={draft.description} onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>UOM</div>
            <Input value={draft.uom} onChange={(e) => setDraft((p) => ({ ...p, uom: e.target.value }))} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>HSN/SAC</div>
            <Input value={draft.hsnSac} onChange={(e) => setDraft((p) => ({ ...p, hsnSac: e.target.value }))} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Qty</div>
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              value={draft.quantity}
              onChange={(v) => setDraft((p) => ({ ...p, quantity: v ?? 0 }))}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Delivery Date</div>
            <DatePicker
              style={{ width: "100%" }}
              value={draft.deliveryDate ? dayjs(draft.deliveryDate) : null}
              onChange={(d) => setDraft((p) => ({ ...p, deliveryDate: d ? d.format("YYYY-MM-DD") : null }))}
            />
          </div>
          <Button type="dashed" onClick={handleAdd}>
            {editingIndex !== null ? "Update" : "+ Add"}
          </Button>
        </div>
      )}
      <Table<PRItemRow> dataSource={value} columns={columns} rowKey={(r, i) => `${r.item}-${i}`} pagination={false} />
    </div>
  );
}
