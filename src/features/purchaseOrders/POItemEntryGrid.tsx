// src/features/purchaseOrders/POItemEntryGrid.tsx
//
// The "PO variant" of the Item Entry Grid (architecture doc section
// 10.1/10.2): Item/UOM/HSN like PR's grid, plus the BRD 6.5.2.1.2 line
// columns - Rate, Discount, Pack & Fwd, Freight, Tax Type, Notes - edited
// directly in each row, with a live GST preview (lib/gst/lineTax.ts). The
// backend recalculates on save.
//
// Rows come from Approved PRs (the form's PR No. picker). When Company
// Settings allows POs without a PR, extra lines can also be added by hand.

import { useState } from "react";
import { Button, DatePicker, Input, InputNumber, Select, Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { sumPreviews, type LineTaxContext } from "../../lib/gst/lineTax";
import type { POItemRow } from "./schema";
import type { ItemOption } from "../purchaseRequisitions/PRItemEntryGrid";

type NumberField = "orderQty" | "rate" | "discountPercent" | "packForwardAmount" | "freightAmount";

export function POItemEntryGrid({
  value,
  onChange,
  itemOptions,
  taxContext,
  allowManualLines = true,
  readOnly = false,
}: {
  value: POItemRow[];
  onChange: (rows: POItemRow[]) => void;
  itemOptions: ItemOption[];
  taxContext: LineTaxContext;
  // false when Company Settings requires every PO line to come from a PR.
  allowManualLines?: boolean;
  readOnly?: boolean;
}) {
  const [newItem, setNewItem] = useState<number | undefined>(undefined);

  function patchRow(index: number, patch: Partial<POItemRow>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function addManualLine(itemId: number) {
    const opt = itemOptions.find((o) => o.id === itemId);
    onChange([
      ...value,
      {
        prItem: null,
        prNumber: null,
        item: itemId,
        itemCode: opt?.itemCode ?? "",
        description: opt?.description ?? "",
        uom: opt?.uom ?? "",
        hsnSac: opt?.hsnSac ?? "",
        orderQty: 1,
        rate: 0,
        discountPercent: 0,
        packForwardAmount: 0,
        freightAmount: 0,
        tax: taxContext.defaultTaxFor(itemId), // BRD: auto-fetched from Item master, user can change
        notes: "",
        deliveryDate: null,
      },
    ]);
    setNewItem(undefined);
  }

  const previewFor = (row: POItemRow) =>
    taxContext.preview({
      qty: row.orderQty,
      rate: row.rate,
      taxId: row.tax,
      discountPercent: row.discountPercent,
      packForwardAmount: row.packForwardAmount,
      freightAmount: row.freightAmount,
    });

  const totals = sumPreviews(value.map(previewFor));
  const money = (n: number) => n.toFixed(2);
  const missingTax = value.filter((r) => r.tax == null).length;

  const numberCell = (field: NumberField, width = 90) => (_: unknown, row: POItemRow, index: number) =>
    readOnly ? (
      row[field]
    ) : (
      <InputNumber
        style={{ width }}
        min={0}
        max={field === "discountPercent" ? 100 : field === "orderQty" ? row.prPendingQty : undefined}
        value={row[field]}
        onChange={(v) => patchRow(index, { [field]: v ?? 0 })}
      />
    );

  const columns: ColumnsType<POItemRow> = [
    { title: "PR No.", dataIndex: "prNumber", render: (v?: string | null) => v || "—" },
    { title: "Item", dataIndex: "itemCode" },
    { title: "UOM", dataIndex: "uom" },
    { title: "HSN/SAC", dataIndex: "hsnSac" },
    {
      title: "Qty",
      key: "qty",
      render: (_, row, index) =>
        row.prPendingQty != null && !readOnly ? (
          <Tooltip title={`Pending on the PR: ${row.prPendingQty}`}>{numberCell("orderQty")(_, row, index)}</Tooltip>
        ) : (
          numberCell("orderQty")(_, row, index)
        ),
    },
    { title: "Rate", key: "rate", render: numberCell("rate", 100) },
    { title: "Disc %", key: "disc", render: numberCell("discountPercent", 70) },
    { title: "P&F", key: "pf", render: numberCell("packForwardAmount") },
    { title: "Freight", key: "freight", render: numberCell("freightAmount") },
    {
      title: "Tax Type",
      key: "tax",
      render: (_, row, index) =>
        readOnly ? (
          taxContext.taxName(row.tax)
        ) : (
          <Select
            style={{ width: 120 }}
            allowClear
            placeholder="No tax"
            status={row.tax == null ? "warning" : undefined}
            value={row.tax ?? undefined}
            options={taxContext.taxOptions}
            onChange={(v) => patchRow(index, { tax: v ?? null })}
          />
        ),
    },
    { title: "Taxable", key: "taxable", render: (_, r) => money(previewFor(r).taxableValue) },
    { title: "CGST", key: "cgst", render: (_, r) => money(previewFor(r).cgst) },
    { title: "SGST", key: "sgst", render: (_, r) => money(previewFor(r).sgst) },
    { title: "IGST", key: "igst", render: (_, r) => money(previewFor(r).igst) },
    { title: "Net", key: "total", render: (_, r) => money(previewFor(r).lineTotal) },
    {
      title: "Expected Delivery",
      key: "delivery",
      render: (_, row, index) =>
        readOnly ? (
          row.deliveryDate ?? "-"
        ) : (
          <DatePicker
            style={{ width: 130 }}
            value={row.deliveryDate ? dayjs(row.deliveryDate) : null}
            onChange={(d) => patchRow(index, { deliveryDate: d ? d.format("YYYY-MM-DD") : null })}
          />
        ),
    },
    {
      title: "Notes",
      key: "notes",
      render: (_, row, index) =>
        readOnly ? row.notes : <Input style={{ width: 140 }} value={row.notes} onChange={(e) => patchRow(index, { notes: e.target.value })} />,
    },
    ...(readOnly
      ? []
      : [{ title: "", key: "remove", render: (_: unknown, __: POItemRow, index: number) => <a onClick={() => removeRow(index)}>Remove</a> }]),
  ];

  return (
    <div>
      {!readOnly && allowManualLines && (
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
          <Select
            style={{ width: 260 }}
            showSearch
            optionFilterProp="label"
            placeholder="Add an item without a PR"
            value={newItem}
            options={itemOptions.map((o) => ({ value: o.id, label: o.itemCode }))}
            onChange={setNewItem}
          />
          <Button type="dashed" disabled={!newItem} onClick={() => newItem && addManualLine(newItem)}>
            + Add
          </Button>
        </div>
      )}
      {!readOnly && !allowManualLines && value.length === 0 && (
        <div style={{ marginBottom: 12, color: "#8c8c8c" }}>Pick the PR No. above to load its lines.</div>
      )}
      {!readOnly && missingTax > 0 && (
        <div style={{ marginBottom: 12, color: "#ad6800" }}>
          {missingTax} line(s) have no Tax Type, so no GST is calculated on them. Pick one in the Tax Type column, or set
          the Tax Type on the item in Item Master.
        </div>
      )}
      <Table<POItemRow>
        dataSource={value}
        columns={columns}
        rowKey={(r, i) => `${r.prItem ?? "m"}-${r.item}-${i}`}
        pagination={false}
        scroll={{ x: "max-content" }}
      />
      <div style={{ textAlign: "right", marginTop: 8, fontWeight: 500 }}>
        Goods Value: {money(totals.taxable)} · CGST: {money(totals.cgst)} · SGST: {money(totals.sgst)} · IGST:{" "}
        {money(totals.igst)} · Net Value: {money(totals.total)}
      </div>
    </div>
  );
}
