// src/features/sales/shared/SalesLineGrid.tsx
//
// Inline-editable item grid shared by every priced sales document. Each
// row is edited in place (qty, rate, discount % or amount, tax, ...); the
// amount columns come from the live pricing preview (pricing.ts), which
// mirrors the server's calculation.

import { useState } from "react";
import { Button, Input, InputNumber, Select, Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { LineTaxContext } from "../../../lib/gst/lineTax";
import type { PricedLineResult } from "./pricing";
import type { PricedLine } from "./types";

export type SalesLineRow = PricedLine & Record<string, unknown>;

export interface SalesItemOption {
  id: number;
  itemCode: string;
  itemName: string;
  itemDescription?: string;
  billingUom?: string;
  hsnCode?: string;
  sellingPrice?: number | null;
  itemType?: string;
}

// Unsaved rows have no id yet; this client-only key keeps each row's
// inputs stable while rows are added / removed (the server ignores it).
export function newRowKey(): string {
  return crypto.randomUUID();
}

export function newLineFor(item: SalesItemOption, taxContext: LineTaxContext): SalesLineRow {
  return {
    _rowKey: newRowKey(),
    item: item.id,
    itemCode: item.itemCode,
    description: item.itemDescription || item.itemName,
    uom: item.billingUom ?? "",
    hsnSac: item.hsnCode ?? "",
    quantity: 1,
    rate: Number(item.sellingPrice ?? 0),
    discountPercent: 0,
    discountAmount: 0,
    tax: taxContext.defaultTaxFor(item.id),
  };
}

const money = (n?: number) => (n ?? 0).toFixed(2);

export function SalesLineGrid<T extends SalesLineRow>({
  value,
  onChange,
  itemOptions,
  taxContext,
  priced,
  readOnly = false,
  canAddItems = true,
  makeRow,
  isItemLocked,
  quantityMax,
  extraColumns = [],
  trailingColumns = [],
}: {
  value: T[];
  onChange: (rows: T[]) => void;
  itemOptions: SalesItemOption[];
  taxContext: LineTaxContext;
  priced: PricedLineResult[];
  readOnly?: boolean;
  canAddItems?: boolean;
  makeRow?: (item: SalesItemOption) => T;
  isItemLocked?: (row: T) => boolean;
  quantityMax?: (row: T) => number | undefined;
  extraColumns?: ColumnsType<T>;
  trailingColumns?: ColumnsType<T>;
}) {
  const [picker, setPicker] = useState<number | undefined>(undefined);

  function patch(index: number, changes: Partial<T>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...changes } : row)));
  }

  function addItem(itemId: number) {
    const item = itemOptions.find((o) => o.id === itemId);
    if (!item) return;
    const row = makeRow ? makeRow(item) : (newLineFor(item, taxContext) as T);
    onChange([...value, row]);
    setPicker(undefined);
  }

  const missingTax = value.filter((r) => r.tax == null).length;

  const numberCell = (field: "quantity" | "rate" | "discountPercent" | "discountAmount", width: number) =>
    (_: unknown, row: T, index: number) =>
      readOnly ? (
        String(row[field] ?? "")
      ) : (
        <InputNumber
          style={{ width }}
          min={0}
          max={field === "discountPercent" ? 100 : field === "quantity" ? quantityMax?.(row) : undefined}
          value={Number(row[field] ?? 0)}
          onChange={(v) => {
            const next = { [field]: v ?? 0 } as Partial<T>;
            // Discount % and amount are alternatives - typing one clears the other.
            if (field === "discountPercent") (next as Record<string, unknown>).discountAmount = 0;
            if (field === "discountAmount") (next as Record<string, unknown>).discountPercent = 0;
            patch(index, next);
          }}
        />
      );

  const columns: ColumnsType<T> = [
    { title: "#", key: "sl", width: 40, render: (_, __, i) => i + 1 },
    {
      title: "Item",
      key: "item",
      render: (_, row) => (
        <span>
          <strong>{row.itemCode ?? itemOptions.find((o) => o.id === row.item)?.itemCode}</strong>
        </span>
      ),
    },
    {
      title: "Description",
      key: "description",
      render: (_, row, i) =>
        readOnly ? row.description : (
          <Input style={{ width: 180 }} value={row.description} onChange={(e) => patch(i, { description: e.target.value } as Partial<T>)} />
        ),
    },
    { title: "HSN/SAC", dataIndex: "hsnSac" },
    { title: "Qty", key: "qty", render: numberCell("quantity", 90) },
    { title: "Unit", dataIndex: "uom" },
    { title: "Rate", key: "rate", render: numberCell("rate", 100) },
    ...extraColumns,
    {
      title: "Disc %",
      key: "dp",
      render: (_, row, i) => (readOnly ? money(priced[i]?.discountPercent) : numberCell("discountPercent", 70)(_, row, i)),
    },
    {
      title: "Disc Amt",
      key: "da",
      render: (_, row, i) => (readOnly ? money(priced[i]?.discountAmount) : numberCell("discountAmount", 90)(_, row, i)),
    },
    {
      title: "Tax",
      key: "tax",
      render: (_, row, i) =>
        readOnly ? (
          taxContext.taxName(row.tax)
        ) : (
          <Tooltip title={row.tax == null ? "No tax - GST won't be charged on this line" : undefined}>
            <Select
              style={{ width: 110 }}
              allowClear
              placeholder="No tax"
              status={row.tax == null ? "warning" : undefined}
              value={row.tax ?? undefined}
              options={taxContext.taxOptions}
              onChange={(v) => patch(i, { tax: v ?? null } as Partial<T>)}
            />
          </Tooltip>
        ),
    },
    { title: "Taxable", key: "taxable", render: (_, __, i) => money(priced[i]?.taxableValue) },
    { title: "CGST", key: "cgst", render: (_, __, i) => money(priced[i]?.cgst) },
    { title: "SGST", key: "sgst", render: (_, __, i) => money(priced[i]?.sgst) },
    { title: "IGST", key: "igst", render: (_, __, i) => money(priced[i]?.igst) },
    { title: "Amount", key: "amount", render: (_, __, i) => <strong>{money(priced[i]?.lineTotal)}</strong> },
    ...trailingColumns,
    ...(readOnly
      ? []
      : [
          {
            title: "",
            key: "remove",
            render: (_: unknown, row: T, i: number) =>
              isItemLocked?.(row) && row.id ? null : <a onClick={() => onChange(value.filter((_, j) => j !== i))}>Remove</a>,
          },
        ]),
  ];

  return (
    <div>
      {!readOnly && canAddItems && (
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
          <Select
            style={{ width: 340 }}
            showSearch
            optionFilterProp="label"
            placeholder="Add item - search by code or name"
            value={picker}
            options={itemOptions.map((o) => ({ value: o.id, label: `${o.itemCode} - ${o.itemName}` }))}
            onChange={(v) => {
              setPicker(v);
              addItem(v);
            }}
          />
          <Button type="dashed" disabled={!picker} onClick={() => picker && addItem(picker)}>
            + Add Row
          </Button>
        </div>
      )}
      {!readOnly && missingTax > 0 && (
        <div style={{ marginBottom: 8, color: "#ad6800" }}>
          {missingTax} line(s) have no tax - pick one in the Tax column, or set the item's Tax Type in Item Master.
        </div>
      )}
      <Table<T>
        dataSource={value}
        columns={columns}
        rowKey={(row) => String(row.id ?? row._rowKey ?? row.item)}
        pagination={false}
        size="small"
        scroll={{ x: "max-content" }}
        locale={{ emptyText: "No items yet" }}
      />
    </div>
  );
}
