// src/features/purchaseInvoices/PIItemEntryGrid.tsx
//
// One editable row per invoice line.
//  - PO mode: rows come from the source PO's pending lines (the form
//    pre-fills them, BRD 6.5.3.2 "update the item details based on Purchase
//    order selected"); the item is fixed, Invoice Qty is capped at what's
//    still pending, and each line picks the godown the goods go into.
//  - Freight mode: a standalone freight bill - free rows of Service items,
//    each taxed at its own rate, no godown (services aren't stocked).
// Rate CAN differ from the PO's - that discrepancy is exactly what a 3-way
// match / later Debit Note exists to catch, so the field isn't locked.

import { Button, Input, InputNumber, Select, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { sumPreviews, type LineTaxContext } from "../../lib/gst/lineTax";
import type { PIItemRow } from "./schema";
import type { PIType } from "./types";

export interface PIItemOption {
  id: number;
  itemCode: string;
  description?: string;
  uom?: string;
  hsnSac?: string;
  itemType?: string;
}

type NumberField = "invoicedQty" | "rate" | "discountPercent" | "packForwardAmount" | "freightAmount";

export function PIItemEntryGrid({
  mode,
  value,
  onChange,
  pendingQtyByPoItem,
  itemOptions,
  godownOptions,
  taxContext,
  readOnly = false,
}: {
  mode: PIType;
  value: PIItemRow[];
  onChange: (rows: PIItemRow[]) => void;
  pendingQtyByPoItem: Map<number, number>;
  itemOptions: PIItemOption[];
  godownOptions: { value: number; label: string }[];
  taxContext: LineTaxContext;
  readOnly?: boolean;
}) {
  const isPO = mode === "PO";
  const serviceOptions = itemOptions.filter((o) => o.itemType === "Service");

  function patchRow(index: number, patch: Partial<PIItemRow>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function addFreightRow() {
    onChange([
      ...value,
      {
        poItem: null,
        item: undefined as unknown as number,
        itemCode: "",
        description: "",
        uom: "",
        hsnSac: "",
        invoicedQty: 1,
        rate: 0,
        discountPercent: 0,
        packForwardAmount: 0,
        freightAmount: 0,
        tax: null,
        godown: null,
        secondaryUom: "",
        conversionRate: null,
        remarks: "",
      },
    ]);
  }

  function selectService(index: number, itemId: number) {
    const opt = itemOptions.find((o) => o.id === itemId);
    patchRow(index, {
      item: itemId,
      itemCode: opt?.itemCode ?? "",
      description: opt?.description ?? "",
      uom: opt?.uom ?? "",
      hsnSac: opt?.hsnSac ?? "",
      tax: taxContext.defaultTaxFor(itemId), // the service's own GST rate
    });
  }

  const previewFor = (row: PIItemRow) =>
    taxContext.preview({
      qty: row.invoicedQty,
      rate: row.rate,
      taxId: row.tax,
      discountPercent: row.discountPercent,
      packForwardAmount: row.packForwardAmount,
      freightAmount: row.freightAmount,
    });

  const numberCell = (field: NumberField, max?: number) => (_: unknown, row: PIItemRow, index: number) => (
    <InputNumber
      style={{ width: 100 }}
      min={0}
      max={max}
      disabled={readOnly}
      value={row[field]}
      onChange={(v) => patchRow(index, { [field]: v ?? 0 })}
    />
  );

  const money = (n: number) => n.toFixed(2);
  const totals = sumPreviews(value.map(previewFor));
  const missingTax = value.filter((r) => r.tax == null).length;

  const columns: ColumnsType<PIItemRow> = [
    isPO
      ? { title: "Item", dataIndex: "itemCode" }
      : {
          title: "Service Item",
          key: "item",
          render: (_, row, index) => (
            <Select
              style={{ width: 160 }}
              showSearch
              optionFilterProp="label"
              disabled={readOnly}
              value={row.item || undefined}
              options={serviceOptions.map((o) => ({ value: o.id, label: o.itemCode }))}
              onChange={(v) => selectService(index, v)}
            />
          ),
        },
    { title: "UOM", dataIndex: "uom" },
    { title: "HSN/SAC", dataIndex: "hsnSac" },
    ...(isPO
      ? [{
          title: "Pending",
          key: "pending",
          render: (_: unknown, row: PIItemRow) => (row.poItem != null ? pendingQtyByPoItem.get(row.poItem) ?? "-" : "-"),
        }]
      : []),
    {
      title: "Qty",
      key: "qty",
      render: (_, row, index) =>
        numberCell("invoicedQty", row.poItem != null ? pendingQtyByPoItem.get(row.poItem) : undefined)(_, row, index),
    },
    { title: "Rate", key: "rate", render: numberCell("rate") },
    { title: "Disc %", key: "disc", render: numberCell("discountPercent", 100) },
    ...(isPO
      ? [
          { title: "P&F", key: "pf", render: numberCell("packForwardAmount") },
          { title: "Freight", key: "freight", render: numberCell("freightAmount") },
        ]
      : []),
    {
      title: "Tax Type",
      key: "tax",
      render: (_, row, index) => (
        <Select
          style={{ width: 120 }}
          allowClear
          placeholder="No tax"
          status={row.tax == null ? "warning" : undefined}
          disabled={readOnly}
          value={row.tax ?? undefined}
          options={taxContext.taxOptions}
          onChange={(v) => patchRow(index, { tax: v ?? null })}
        />
      ),
    },
    ...(isPO
      ? [
          {
            title: "Godown",
            key: "godown",
            render: (_: unknown, row: PIItemRow, index: number) => (
              <Select
                style={{ width: 140 }}
                disabled={readOnly}
                value={row.godown ?? undefined}
                options={godownOptions}
                onChange={(v) => patchRow(index, { godown: v ?? null })}
              />
            ),
          },
          {
            title: "Alt. Unit / Conv.",
            key: "altUnit",
            render: (_: unknown, row: PIItemRow, index: number) => (
              <div style={{ display: "flex", gap: 4 }}>
                <Input
                  style={{ width: 70 }}
                  placeholder="Unit"
                  disabled={readOnly}
                  value={row.secondaryUom}
                  onChange={(e) => patchRow(index, { secondaryUom: e.target.value })}
                />
                <InputNumber
                  style={{ width: 80 }}
                  min={0}
                  placeholder="Rate"
                  disabled={readOnly}
                  value={row.conversionRate ?? undefined}
                  onChange={(v) => patchRow(index, { conversionRate: v || null })}
                />
              </div>
            ),
          },
          {
            title: "Alt. Qty",
            key: "altQty",
            render: (_: unknown, row: PIItemRow) =>
              row.conversionRate ? `${(row.invoicedQty * row.conversionRate).toFixed(3)} ${row.secondaryUom}` : "-",
          },
        ]
      : []),
    { title: "Goods Value", key: "taxable", render: (_, row) => money(previewFor(row).taxableValue) },
    { title: "CGST", key: "cgst", render: (_, row) => money(previewFor(row).cgst) },
    { title: "SGST", key: "sgst", render: (_, row) => money(previewFor(row).sgst) },
    { title: "IGST", key: "igst", render: (_, row) => money(previewFor(row).igst) },
    { title: "Net Value", key: "total", render: (_, row) => money(previewFor(row).lineTotal) },
    {
      title: "Remarks",
      key: "remarks",
      render: (_, row, index) => (
        <Input
          style={{ width: 140 }}
          disabled={readOnly}
          value={row.remarks}
          onChange={(e) => patchRow(index, { remarks: e.target.value })}
        />
      ),
    },
    ...(readOnly
      ? []
      : [{ title: "", key: "remove", render: (_: unknown, __: PIItemRow, index: number) => <a onClick={() => removeRow(index)}>Remove</a> }]),
  ];

  return (
    <div>
      {!isPO && !readOnly && (
        <Button type="dashed" onClick={addFreightRow} style={{ marginBottom: 12 }}>
          + Add Service Line
        </Button>
      )}
      {!readOnly && missingTax > 0 && (
        <div style={{ marginBottom: 12, color: "#ad6800" }}>
          {missingTax} line(s) have no Tax Type, so no GST is calculated on them. Pick one in the Tax Type column.
        </div>
      )}
      <Table<PIItemRow>
        dataSource={value}
        columns={columns}
        rowKey={(r, i) => `${r.poItem ?? "f"}-${r.item}-${i}`}
        pagination={false}
        scroll={{ x: "max-content" }}
      />
      <div style={{ textAlign: "right", marginTop: 8, fontWeight: 500 }}>
        Goods Value: {money(totals.taxable)} · CGST: {money(totals.cgst)} · SGST: {money(totals.sgst)} · IGST:{" "}
        {money(totals.igst)} · Net Value: {money(totals.total)}
      </div>
      {isPO && value.length === 0 && (
        <div style={{ color: "#999", marginTop: 12 }}>Select a supplier and an Approved Purchase Order to load its pending lines.</div>
      )}
    </div>
  );
}
