// src/features/purchaseReturns/PRetItemEntryGrid.tsx
//
// Same "one row per source line" shape as PIItemEntryGrid - a Purchase
// Return's rows are constrained to the source invoice's still-returnable
// lines, each capped at that line's returnableQty (invoiced qty minus
// whatever other saved returns already hold). Each line carries its Tax
// Type (defaults to the invoice line's) and the godown the goods go back
// out of (defaults to the godown they were received into).

import { InputNumber, Select, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { sumPreviews, type LineTaxContext } from "../../lib/gst/lineTax";
import type { ReturnableInvoiceLine } from "./types";
import type { PRetItemRow } from "./schema";

export function PRetItemEntryGrid({
  returnableLines,
  value,
  onChange,
  taxContext,
  godownOptions,
  readOnly = false,
}: {
  returnableLines: ReturnableInvoiceLine[];
  value: PRetItemRow[];
  onChange: (rows: PRetItemRow[]) => void;
  taxContext: LineTaxContext;
  godownOptions: { value: number; label: string }[];
  readOnly?: boolean;
}) {
  const rowFor = (line: ReturnableInvoiceLine) => value.find((r) => r.invoiceItem === line.id);

  function updateRow(line: ReturnableInvoiceLine, patch: Partial<PRetItemRow>) {
    const existing = rowFor(line);
    const next: PRetItemRow = existing
      ? { ...existing, ...patch }
      : {
          invoiceItem: line.id,
          item: line.item,
          itemCode: line.itemCode ?? "",
          description: line.description,
          uom: line.uom,
          hsnSac: line.hsnSac,
          returnedQty: 0,
          rate: Number(line.rate),
          tax: line.tax,
          godown: line.godown,
          ...patch,
        };

    const withoutThis = value.filter((r) => r.invoiceItem !== line.id);
    // A 0-qty row isn't part of this return - drop it.
    onChange(next.returnedQty ? [...withoutThis, next] : withoutThis);
  }

  const previewFor = (line: ReturnableInvoiceLine) => {
    const row = rowFor(line);
    if (!row || !row.returnedQty) return null;
    return taxContext.preview({ qty: row.returnedQty, rate: row.rate, taxId: row.tax });
  };

  const totals = sumPreviews(returnableLines.map(previewFor).filter((p): p is NonNullable<typeof p> => !!p));
  const money = (n?: number) => (n != null ? n.toFixed(2) : "-");

  const columns: ColumnsType<ReturnableInvoiceLine> = [
    { title: "Item", dataIndex: "itemCode" },
    { title: "UOM", dataIndex: "uom" },
    { title: "HSN/SAC", dataIndex: "hsnSac" },
    { title: "Invoiced Qty", dataIndex: "invoicedQty" },
    { title: "Returnable", dataIndex: "returnableQty" },
    {
      title: "Return Qty",
      key: "thisQty",
      render: (_, line) => (
        <InputNumber
          style={{ width: 100 }}
          min={0}
          max={line.returnableQty}
          disabled={readOnly}
          value={rowFor(line)?.returnedQty ?? 0}
          onChange={(v) => updateRow(line, { returnedQty: v ?? 0 })}
        />
      ),
    },
    { title: "Rate", dataIndex: "rate" },
    {
      title: "Tax Type",
      key: "tax",
      render: (_, line) => (
        <Select
          style={{ width: 120 }}
          allowClear
          placeholder="No tax"
          status={rowFor(line) && rowFor(line)?.tax == null ? "warning" : undefined}
          disabled={readOnly || !rowFor(line)}
          value={(rowFor(line)?.tax ?? line.tax) ?? undefined}
          options={taxContext.taxOptions}
          onChange={(v) => updateRow(line, { tax: v ?? null })}
        />
      ),
    },
    {
      title: "Godown (stock out)",
      key: "godown",
      render: (_, line) => (
        <Select
          style={{ width: 140 }}
          disabled={readOnly || !rowFor(line)}
          value={(rowFor(line)?.godown ?? line.godown) ?? undefined}
          options={godownOptions}
          onChange={(v) => updateRow(line, { godown: v ?? null })}
        />
      ),
    },
    { title: "Taxable", key: "taxable", render: (_, line) => money(previewFor(line)?.taxableValue) },
    { title: "CGST", key: "cgst", render: (_, line) => money(previewFor(line)?.cgst) },
    { title: "SGST", key: "sgst", render: (_, line) => money(previewFor(line)?.sgst) },
    { title: "IGST", key: "igst", render: (_, line) => money(previewFor(line)?.igst) },
    { title: "Line Total", key: "total", render: (_, line) => money(previewFor(line)?.lineTotal) },
  ];

  return (
    <div>
      <Table<ReturnableInvoiceLine>
        dataSource={returnableLines}
        columns={columns}
        rowKey="id"
        pagination={false}
        scroll={{ x: "max-content" }}
      />
      <div style={{ textAlign: "right", marginTop: 8, fontWeight: 500 }}>
        Taxable: {totals.taxable.toFixed(2)} · CGST: {totals.cgst.toFixed(2)} · SGST: {totals.sgst.toFixed(2)} · IGST:{" "}
        {totals.igst.toFixed(2)} · Grand Total: {totals.total.toFixed(2)}
      </div>
      {returnableLines.length === 0 && (
        <div style={{ color: "#999", marginTop: 12 }}>
          Select a source Purchase Invoice above to load its returnable lines.
        </div>
      )}
    </div>
  );
}
