// src/features/sales/shared/SalesLineGrid.tsx
//
// Inline-editable item grid shared by every priced sales document (AG Grid).
// Same props and exports as the antd Table version, so PricedDocumentBody and
// the document forms are unchanged. Each row is edited in place (qty, rate,
// discount % or amount, tax, ...); the amount columns come from the live
// pricing preview (pricing.ts), which mirrors the server's calculation.

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button, Select } from "antd";
import type { ColumnType, ColumnsType } from "antd/es/table";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  type CellValueChangedEvent,
  type ColDef,
  type GridApi,
  type ICellEditorParams,
  type ICellRendererParams,
} from "ag-grid-community";
import type { LineTaxContext } from "../../../lib/gst/lineTax";
import type { PricedLineResult } from "./pricing";
import type { PricedLine } from "./types";

ModuleRegistry.registerModules([AllCommunityModule]);

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

const money = (n?: number | null) => (n ?? 0).toFixed(2);
const COMPUTED = { background: "#f5f5f5" };

// grid row = the form row + client-only helpers (never sent back to the form)
type GridRowOf<T> = T & { __k: string; __priced?: PricedLineResult };

// extraColumns / trailingColumns are still declared as antd columns by the
// callers; convert them so no caller has to change. Supported: title, key,
// dataIndex, width, align, render(value, row, index). Grouped columns are not.
function fromAntd<R>(cols: ColumnsType<R> | undefined, prefix: string): ColDef<R>[] {
  return (cols ?? []).map((c, n) => {
    const col = c as ColumnType<R>;
    const dataIndex = Array.isArray(col.dataIndex) ? col.dataIndex.join(".") : col.dataIndex;
    const def: ColDef<R> = {
      colId: String(col.key ?? dataIndex ?? `${prefix}${n}`),
      headerName: typeof col.title === "string" ? col.title : "",
      width: typeof col.width === "number" ? col.width : 110,
      type: col.align === "right" ? "rightAligned" : undefined,
    };
    if (dataIndex != null) (def as { field?: string }).field = String(dataIndex);
    if (col.render) {
      const render = col.render;
      def.cellRenderer = (p: ICellRendererParams<R>) =>
        (render(p.value, p.data as R, p.node?.rowIndex ?? 0) as ReactNode) ?? null;
    }
    return def;
  });
}

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
  type R = GridRowOf<T>;

  const apiRef = useRef<GridApi<R> | null>(null);
  const pendingFocus = useRef<number | null>(null);
  const [picker, setPicker] = useState<number | undefined>(undefined);

  // rows + their pricing result, so amount cells always match the preview
  const rowData = useMemo<R[]>(() => {
    const seen = new Set<string>();
    return value.map((r, i) => {
      let k = String(r.id ?? r._rowKey ?? r.item);
      if (seen.has(k)) k = `${k}#${i}`; // AG Grid needs unique row ids
      seen.add(k);
      return { ...r, __k: k, __priced: priced[i] } as R;
    });
  }, [value, priced]);

  // after adding an item, jump into its Qty cell
  useEffect(() => {
    const idx = pendingFocus.current;
    const api = apiRef.current;
    if (idx == null || !api || idx >= rowData.length) return;
    api.ensureIndexVisible(idx);
    api.setFocusedCell(idx, "quantity");
    api.startEditingCell({ rowIndex: idx, colKey: "quantity" });
    pendingFocus.current = null;
  }, [rowData]);

  function patch(index: number, changes: Partial<T>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...changes } : row)));
  }

  function addItem(itemId: number) {
    const item = itemOptions.find((o) => o.id === itemId);
    if (!item) return;
    const row = makeRow ? makeRow(item) : (newLineFor(item, taxContext) as T);
    pendingFocus.current = value.length;
    onChange([...value, row]);
    setPicker(undefined);
  }

  const missingTax = value.filter((r) => r.tax == null).length;

  // tax cell edits use labels (antd-style options are {value,label})
  const taxOptions = taxContext.taxOptions as unknown as { value: number; label: ReactNode }[];
  const taxLabelOf = (tax: unknown) => String(taxOptions.find((o) => o.value === tax)?.label ?? "");

  const edit = !readOnly;

  const numberCol = (
    colId: string,
    headerName: string,
    width: number,
    get: (r: R) => unknown,
    opts: { editable: boolean; max?: (r: R) => number | undefined; decimals?: boolean },
  ): ColDef<R> => ({
    colId,
    headerName,
    width,
    type: "rightAligned",
    valueGetter: (p) => (p.data ? (get(p.data) as number | undefined) : undefined),
    valueFormatter: (p) => (p.value == null ? "" : opts.decimals ? money(p.value) : String(p.value)),
    editable: opts.editable,
    // AG Grid re-reads the cell through valueGetter after the setter runs, so the
    // setter must store the typed value on the grid's own row copy (colId = field
    // name). The form value is then updated in onCellValueChanged.
    valueSetter: (p) => {
      (p.data as Record<string, unknown>)[colId] = p.newValue;
      return true;
    },
    cellEditor: "agNumberCellEditor",
    cellEditorParams: (p: ICellEditorParams<R>) => ({ min: 0, max: p.data ? opts.max?.(p.data) : undefined }),
  });

  const computedCol = (colId: string, headerName: string, key: keyof PricedLineResult, bold = false): ColDef<R> => ({
    colId,
    headerName,
    width: 100,
    type: "rightAligned",
    valueGetter: (p) => p.data?.__priced?.[key] as number | undefined,
    valueFormatter: (p) => money(p.value),
    cellStyle: { ...COMPUTED, fontWeight: bold ? 600 : undefined },
  });

  const columnDefs: ColDef<R>[] = [
    { colId: "sl", headerName: "#", width: 55, valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1 },
    {
      colId: "item",
      headerName: "Item",
      width: 130,
      valueGetter: (p) =>
        p.data ? (p.data.itemCode ?? itemOptions.find((o) => o.id === p.data?.item)?.itemCode ?? "") : "",
      cellStyle: { fontWeight: 600 },
    },
    {
      colId: "description",
      headerName: "Description",
      flex: 1,
      minWidth: 200,
      valueGetter: (p) => p.data?.description as string | undefined,
      editable: edit,
      valueSetter: (p) => {
        (p.data as Record<string, unknown>).description = p.newValue ?? "";
        return true;
      },
    },
    { colId: "hsnSac", headerName: "HSN/SAC", width: 100, valueGetter: (p) => p.data?.hsnSac as string | undefined },
    numberCol("quantity", "Qty", 90, (r) => Number(r.quantity ?? 0), { editable: edit, max: (r) => quantityMax?.(r) }),
    { colId: "uom", headerName: "Unit", width: 80, valueGetter: (p) => p.data?.uom as string | undefined },
    numberCol("rate", "Rate", 100, (r) => Number(r.rate ?? 0), { editable: edit }),
    ...fromAntd<R>(extraColumns as unknown as ColumnsType<R>, "extra"),
    // read-only shows the priced (effective) discount; editing shows what was typed
    numberCol(
      "discountPercent",
      "Disc %",
      80,
      (r) => (readOnly ? r.__priced?.discountPercent : Number(r.discountPercent ?? 0)),
      { editable: edit, decimals: readOnly },
    ),
    numberCol(
      "discountAmount",
      "Disc Amt",
      95,
      (r) => (readOnly ? r.__priced?.discountAmount : Number(r.discountAmount ?? 0)),
      { editable: edit, decimals: readOnly },
    ),
    {
      colId: "tax",
      headerName: "Tax",
      width: 120,
      valueGetter: (p) => (readOnly ? String(taxContext.taxName(p.data?.tax as never) ?? "") : taxLabelOf(p.data?.tax)),
      editable: edit,
      valueSetter: (p) => {
        const opt = taxOptions.find((o) => String(o.label) === p.newValue);
        (p.data as Record<string, unknown>).tax = opt ? opt.value : null;
        return true;
      },
      cellEditor: "agSelectCellEditor",
      cellEditorParams: { values: ["", ...taxOptions.map((o) => String(o.label))] },
      cellStyle: (p) => (edit && p.data?.tax == null ? { background: "#fffbe6" } : undefined),
      tooltipValueGetter: (p) =>
        edit && p.data?.tax == null ? "No tax - GST won't be charged on this line" : undefined,
    },
    computedCol("taxable", "Taxable", "taxableValue"),
    computedCol("cgst", "CGST", "cgst"),
    computedCol("sgst", "SGST", "sgst"),
    computedCol("igst", "IGST", "igst"),
    computedCol("amount", "Amount", "lineTotal", true),
    ...fromAntd<R>(trailingColumns as unknown as ColumnsType<R>, "trail"),
    ...(readOnly
      ? []
      : [
          {
            colId: "remove",
            headerName: "",
            width: 90,
            cellRenderer: (p: ICellRendererParams<R>) => {
              const row = p.data;
              if (!row || (isItemLocked?.(row) && row.id)) return null;
              const idx = p.node.rowIndex;
              return <a onClick={() => onChange(value.filter((_, j) => j !== idx))}>Remove</a>;
            },
          } as ColDef<R>,
        ]),
  ];

  function onCellValueChanged(e: CellValueChangedEvent<R>) {
    const index = e.node.rowIndex;
    if (index == null) return;
    const row = value[index];
    if (!row) return;
    const colId = e.column.getColId();
    const n = Number(e.newValue ?? 0) || 0;
    let changes: Record<string, unknown> | null = null;

    switch (colId) {
      case "description":
        changes = { description: String(e.newValue ?? "") };
        break;
      case "quantity": {
        const max = quantityMax?.(row);
        changes = { quantity: max !== undefined && n > max ? max : n };
        break;
      }
      case "rate":
        changes = { rate: n };
        break;
      // Discount % and amount are alternatives - typing one clears the other.
      case "discountPercent":
        changes = { discountPercent: Math.min(n, 100), discountAmount: 0 };
        break;
      case "discountAmount":
        changes = { discountAmount: n, discountPercent: 0 };
        break;
      case "tax": {
        const opt = taxOptions.find((o) => String(o.label) === e.newValue);
        changes = { tax: opt ? opt.value : null };
        break;
      }
    }
    if (changes) patch(index, changes as Partial<T>);
  }

  return (
    <div
      // Enter inside a cell editor must not submit the surrounding antd <Form>
      onKeyDown={(ev) => {
        const t = ev.target as HTMLElement;
        if (ev.key === "Enter" && t.closest(".ag-root-wrapper")) ev.preventDefault();
      }}
    >
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
      <AgGridReact<R>
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={{ sortable: false, resizable: true, suppressMovable: true }}
        getRowId={(p) => p.data.__k}
        domLayout="autoHeight"
        onGridReady={(e) => (apiRef.current = e.api)}
        onCellValueChanged={onCellValueChanged}
        singleClickEdit
        stopEditingWhenCellsLoseFocus
        enterNavigatesVertically
        enterNavigatesVerticallyAfterEdit
        tooltipShowDelay={300}
      />
    </div>
  );
}
