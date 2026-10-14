// src/features/sales/quotation/QuotationGrid.tsx
//
// Quotation item grid, keyed in directly (no item picker):
//   - every line is typed: Description, HSN/SAC, Qty, Unit, Rate, Disc, Tax
//   - Unit is chosen from the Units master (stores the unit code)
//   - Estimation Type: Direct   -> Rate is typed
//                      Breakup  -> the line gets sub items (1.1, 1.2 ...); the line's
//                                  Rate = SUM of the sub item rates (computed, locked)
//
// Shortcut keys (work while typing in a cell too):
//   F9  insert line below      Ctrl+I  insert line above
//   F10 insert sub item        Ctrl+D  delete current line / sub item
//   F12 show / hide sub items
//
// Sub items live INSIDE their line (`line.breakups`), so `items` still has one
// entry per priced line and usePricedPreview (matches by position) and the
// server pricing keep working. Props match SalesLineGrid so PricedDocumentBody
// can take this through its `Grid` prop (itemOptions / canAddItems / makeRow are ignored).

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Button } from "antd";
import type { ColumnType, ColumnsType } from "antd/es/table";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  type CellClassParams,
  type CellStyle,
  type CellValueChangedEvent,
  type ColDef,
  type GridApi,
  type ICellEditorParams,
  type ICellRendererParams,
} from "ag-grid-community";
import type { LineTaxContext } from "../../../lib/gst/lineTax";
import { useUnitsQuery } from "../../uom/api";
import type { PricedLineResult } from "../shared/pricing";
import { newRowKey, type SalesItemOption, type SalesLineRow } from "../shared/SalesLineGrid";
ModuleRegistry.registerModules([AllCommunityModule]);

// Stored values. "Breakup" (lowercase u) matches what the earlier quotation code sent.
export const EST_DIRECT = "Direct";
export const EST_BREAKUP = "Breakup";

export interface BreakupLine {
  _rowKey: string; // client-only
  id?: number;
  description: string;
  quantity: number;
  uom: string; // unit code
  rate: number;
  hsnSac: string;
}

export type QuotationLineRow = SalesLineRow & {
  estimationType?: string;
  breakups?: BreakupLine[];
};

const newBreakup = (): BreakupLine => ({ _rowKey: newRowKey(), description: "", quantity: 0, uom: "", rate: 0, hsnSac: "" });
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const money = (n?: number | null) => (n ?? 0).toFixed(2);
const isBreakup = (r: unknown) => (r as QuotationLineRow).estimationType === EST_BREAKUP;

// A new, empty line. `item` is null because lines are keyed in, not picked from Item Master.
function blankLine<T extends SalesLineRow>(): T {
  return {
    _rowKey: newRowKey(),
    item: null,
    itemCode: "",
    description: "",
    uom: "",
    hsnSac: "",
    quantity: 1,
    rate: 0,
    discountPercent: 0,
    discountAmount: 0,
    tax: null,
    estimationType: EST_DIRECT,
    breakups: [],
  } as unknown as T;
}

// ag-Grid's own style type (not React's CSSProperties): values must be string | number
const COMPUTED: CellStyle = { background: "#f5f5f5" };
const LOCKED: CellStyle = { background: "#e6e6e6" };

// A Breakup line's Rate is always the sum of its sub item rates.
function normalizeRows<T extends SalesLineRow>(rows: T[]): T[] {
  return rows.map((r) => {
    if (!isBreakup(r)) return r;
    const sum = round2(((r as QuotationLineRow).breakups ?? []).reduce((s, b) => s + Number(b.rate || 0), 0));
    return Number(r.rate) === sum ? r : { ...r, rate: sum };
  });
}

// grid row = a line (kind "main") or one of its sub items (kind "child")
interface Meta {
  __k: string;
  __kind: "main" | "child";
  __i: number; // index of the line in `value`
  __j: number; // index of the sub item in line.breakups (-1 for a line)
  __sNo: string; // 1, 2, 2.1, 2.2 ...
  __priced?: PricedLineResult;
}

function canEdit(colId: string, row: Pick<Meta, "__kind"> & { estimationType?: unknown }): boolean {
  const child = row.__kind === "child";
  switch (colId) {
    case "description":
    case "hsnSac":
    case "uom":
    case "quantity":
      return true;
    case "estimationType":
    case "discountPercent":
    case "discountAmount":
    case "tax":
      return !child;
    case "rate":
      return child || row.estimationType !== EST_BREAKUP; // Breakup line: computed
    default:
      return false;
  }
}

// extraColumns / trailingColumns arrive as antd columns; convert, and leave sub item rows empty.
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
        (p.data as unknown as Meta | undefined)?.__kind === "child"
          ? null
          : ((render(p.value, p.data as R, (p.data as unknown as Meta)?.__i ?? 0) as ReactNode) ?? null);
    }
    return def;
  });
}

export function QuotationGrid<T extends SalesLineRow>({
  value,
  onChange,
  taxContext,
  priced,
  readOnly = false,
  isItemLocked,
  quantityMax,
  extraColumns = [],
  trailingColumns = [],
}: {
  value: T[];
  onChange: (rows: T[]) => void;
  itemOptions?: SalesItemOption[]; // accepted for compatibility, not used
  taxContext: LineTaxContext;
  priced: PricedLineResult[];
  readOnly?: boolean;
  canAddItems?: boolean; // not used
  makeRow?: (item: SalesItemOption) => T; // not used
  isItemLocked?: (row: T) => boolean;
  quantityMax?: (row: T) => number | undefined;
  extraColumns?: ColumnsType<T>;
  trailingColumns?: ColumnsType<T>;
}) {
  type R = T & Meta;

  const { data: units = [] } = useUnitsQuery();
  const apiRef = useRef<GridApi<R> | null>(null);
  const pendingFocus = useRef<{ i: number; j: number; col: string } | null>(null);
  const reverting = useRef(false);
  const [showBreakups, setShowBreakups] = useState(true);
  const [hint, setHint] = useState("");

  // Latest rows. Updated immediately by commit(), so two changes in a row (e.g. the
  // cell being edited is committed, then a line is inserted) build on each other.
  const valueRef = useRef(value);
  valueRef.current = value;
  const commit = (rows: T[]) => {
    const next = normalizeRows(rows);
    valueRef.current = next;
    onChange(next);
  };

  // keyed-in grid: always keep at least one line to type into
  useEffect(() => {
    if (!readOnly && value.length === 0) commit([blankLine<T>()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, value.length]);

  // lines, each followed by its sub items
  const rowData = useMemo<R[]>(() => {
    const out: R[] = [];
    const seen = new Set<string>();
    value.forEach((r, i) => {
      let k = String(r.id ?? r._rowKey ?? `L${i}`);
      if (seen.has(k)) k = `${k}#${i}`; // AG Grid needs unique row ids
      seen.add(k);
      out.push({ ...r, __k: k, __kind: "main", __i: i, __j: -1, __sNo: String(i + 1), __priced: priced[i] } as R);
      if (showBreakups && isBreakup(r)) {
        ((r as QuotationLineRow).breakups ?? []).forEach((b, j) => {
          out.push({
            ...b,
            __k: `${k}/${b._rowKey ?? b.id ?? j}`,
            __kind: "child",
            __i: i,
            __j: j,
            __sNo: `${i + 1}.${j + 1}`,
          } as unknown as R);
        });
      }
    });
    return out;
  }, [value, priced, showBreakups]);

  // move into a newly added row
  useEffect(() => {
    const p = pendingFocus.current;
    const api = apiRef.current;
    if (!p || !api) return;
    let idx = -1;
    api.forEachNode((n) => {
      if (n.data && n.data.__i === p.i && n.data.__j === p.j) idx = n.rowIndex ?? -1;
    });
    if (idx >= 0) {
      api.ensureIndexVisible(idx);
      api.setFocusedCell(idx, p.col);
      api.startEditingCell({ rowIndex: idx, colKey: p.col });
      pendingFocus.current = null;
    }
  }, [rowData]);

  // ---- row operations (all read valueRef so they compose) ------------------
  function patchLine(i: number, changes: Record<string, unknown>) {
    commit(valueRef.current.map((r, k) => (k === i ? ({ ...r, ...changes } as T) : r)));
  }

  function patchChild(i: number, j: number, changes: Partial<BreakupLine>) {
    commit(
      valueRef.current.map((r, k) =>
        k !== i
          ? r
          : ({ ...r, breakups: ((r as QuotationLineRow).breakups ?? []).map((b, m) => (m === j ? { ...b, ...changes } : b)) } as T),
      ),
    );
  }

  /** F9 (below) / Ctrl+I (above). `at` = line index of the current row, null = end of list. */
  function insertLine(at: number | null, where: "above" | "below") {
    const rows = valueRef.current;
    const idx = at == null ? rows.length : where === "above" ? at : at + 1;
    pendingFocus.current = { i: idx, j: -1, col: "description" };
    commit([...rows.slice(0, idx), blankLine<T>(), ...rows.slice(idx)]);
    setHint("");
  }

  /** F10 */
  function insertBreakup(i: number | null) {
    const rows = valueRef.current;
    const line = i == null ? undefined : (rows[i] as QuotationLineRow | undefined);
    if (!line) return setHint("Click a Breakup line first.");
    if (!isBreakup(line)) return setHint("Sub items can only be added under a line whose Estimation Type is Breakup.");
    const list = line.breakups ?? [];
    setShowBreakups(true);
    pendingFocus.current = { i: i!, j: list.length, col: "description" };
    commit(rows.map((r, k) => (k === i ? ({ ...r, breakups: [...list, newBreakup()] } as T) : r)));
    setHint("");
  }

  function removeChild(i: number, j: number) {
    commit(
      valueRef.current.map((r, k) =>
        k !== i ? r : ({ ...r, breakups: ((r as QuotationLineRow).breakups ?? []).filter((_, m) => m !== j) } as T),
      ),
    );
  }

  const removeLine = (i: number) => commit(valueRef.current.filter((_, k) => k !== i));

  function focusedRow(): { i: number; j: number } | null {
    const api = apiRef.current;
    const cell = api?.getFocusedCell();
    if (!api || !cell) return null;
    const d = api.getDisplayedRowAtIndex(cell.rowIndex)?.data;
    return d ? { i: d.__i, j: d.__j } : null;
  }

  function deleteCurrent() {
    const cur = focusedRow();
    if (!cur) return setHint("Click the row you want to delete.");
    if (cur.j >= 0) return removeChild(cur.i, cur.j);
    const line = valueRef.current[cur.i];
    if (line && isItemLocked?.(line) && line.id) return setHint("This line can't be deleted.");
    removeLine(cur.i);
  }

  // ---- columns -------------------------------------------------------------
  const edit = !readOnly;
  const missingTax = value.filter((r) => r.tax == null).length;
  const taxOptions = taxContext.taxOptions as unknown as { value: number; label: ReactNode }[];
  const taxLabelOf = (tax: unknown) => String(taxOptions.find((o) => o.value === tax)?.label ?? "");
  const unitCodes = units.map((u) => u.unitCode);

  // locked sub item cells (and a Breakup line's computed Rate) are grey
  const lockStyle =
    (colId: string, base?: CellStyle) =>
    (p: CellClassParams<R>): CellStyle | undefined => {
      const d = p.data;
      if (d && !canEdit(colId, d) && (d.__kind === "child" || colId === "rate")) return LOCKED;
      return base;
    };

  // AG Grid re-reads a cell through valueGetter after the setter runs, so the setter
  // stores the typed value on the grid's own row copy; the form is updated in onCellValueChanged.
  const col = (colId: string, extra: ColDef<R>, base?: CellStyle): ColDef<R> => ({
    colId,
    editable: (p) => edit && !!p.data && canEdit(colId, p.data),
    valueSetter: (p) => {
      (p.data as unknown as Record<string, unknown>)[colId] = p.newValue;
      return true;
    },
    cellStyle: lockStyle(colId, base),
    ...extra,
  });

  const numberCol = (
    colId: string,
    headerName: string,
    width: number,
    get: (r: R) => unknown,
    opts: { decimals?: boolean } = {},
  ): ColDef<R> =>
    col(colId, {
      headerName,
      width,
      type: "rightAligned",
      valueGetter: (p) => (p.data ? (get(p.data) as number | undefined) : undefined),
      valueFormatter: (p) => (p.value == null ? "" : opts.decimals ? money(p.value) : String(p.value)),
      cellEditor: "agNumberCellEditor",
      cellEditorParams: (p: ICellEditorParams<R>) => ({
        min: 0,
        max: colId === "quantity" && p.data && p.data.__kind === "main" ? quantityMax?.(p.data) : undefined,
      }),
    });

  const computedCol = (colId: string, headerName: string, key: keyof PricedLineResult, bold = false): ColDef<R> =>
    col(
      colId,
      {
        headerName,
        width: 100,
        type: "rightAligned",
        valueGetter: (p) => (p.data && p.data.__kind === "main" ? (p.data.__priced?.[key] as number | undefined) : undefined),
        valueFormatter: (p) => (p.value == null ? "" : money(p.value)),
      },
      { ...COMPUTED, ...(bold ? { fontWeight: 600 } : {}) },
    );

  const mainOnly = <V,>(r: R, get: () => V): V | "" => (r.__kind === "main" ? get() : "");

  const columnDefs: ColDef<R>[] = [
    col("sl", {
      headerName: "#",
      width: 60,
      valueGetter: (p) => p.data?.__sNo,
      cellStyle: (p) => (p.data?.__kind === "child" ? { color: "#1a3fd0" } : undefined),
    }),
    col("description", {
      headerName: "Description",
      flex: 1,
      minWidth: 220,
      valueGetter: (p) => p.data?.description as string | undefined,
    }),
    col("estimationType", {
      headerName: "Estimation Type",
      width: 140,
      valueGetter: (p) => (p.data ? mainOnly(p.data, () => (p.data as QuotationLineRow).estimationType ?? EST_DIRECT) : ""),
      cellEditor: "agSelectCellEditor",
      cellEditorParams: { values: [EST_DIRECT, EST_BREAKUP] },
    }),
    col("hsnSac", { headerName: "HSN/SAC", width: 100, valueGetter: (p) => p.data?.hsnSac as string | undefined }),
    numberCol("quantity", "Qty", 90, (r) => Number(r.quantity ?? 0)),
    col("uom", {
      headerName: "Unit",
      width: 90,
      valueGetter: (p) => p.data?.uom as string | undefined,
      cellEditor: "agSelectCellEditor",
      cellEditorParams: { values: ["", ...unitCodes] },
    }),
    numberCol("rate", "Rate", 100, (r) => Number(r.rate ?? 0)),
    ...fromAntd<R>(extraColumns as unknown as ColumnsType<R>, "extra"),
    // read-only shows the priced (effective) discount; editing shows what was typed
    numberCol(
      "discountPercent",
      "Disc %",
      80,
      (r) => (r.__kind === "child" ? undefined : readOnly ? r.__priced?.discountPercent : Number(r.discountPercent ?? 0)),
      { decimals: readOnly },
    ),
    numberCol(
      "discountAmount",
      "Disc Amt",
      95,
      (r) => (r.__kind === "child" ? undefined : readOnly ? r.__priced?.discountAmount : Number(r.discountAmount ?? 0)),
      { decimals: readOnly },
    ),
    col("tax", {
      headerName: "Tax",
      width: 120,
      valueGetter: (p) =>
        p.data
          ? mainOnly(p.data, () => (readOnly ? String(taxContext.taxName(p.data!.tax as never) ?? "") : taxLabelOf(p.data!.tax)))
          : "",
      valueSetter: (p) => {
        const opt = taxOptions.find((o) => String(o.label) === p.newValue);
        (p.data as unknown as Record<string, unknown>).tax = opt ? opt.value : null;
        return true;
      },
      cellEditor: "agSelectCellEditor",
      cellEditorParams: { values: ["", ...taxOptions.map((o) => String(o.label))] },
      // no tax picked yet: yellow cell (set below) + tooltip
      tooltipValueGetter: (p) =>
        edit && p.data?.__kind === "main" && p.data.tax == null ? "No tax - GST won't be charged on this line" : undefined,
    }),
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
              const d = p.data;
              if (!d) return null;
              if (d.__kind === "child") return <a onClick={() => removeChild(d.__i, d.__j)}>Remove</a>;
              if (isItemLocked?.(d) && d.id) return null;
              return <a onClick={() => removeLine(d.__i)}>Remove</a>;
            },
          } as ColDef<R>,
        ]),
  ];

  // a line with no tax gets a yellow Tax cell
  const taxCol = columnDefs.find((c) => c.colId === "tax");
  if (taxCol) {
    const lock = lockStyle("tax");
    taxCol.cellStyle = (p: CellClassParams<R>): CellStyle | undefined =>
      lock(p) ?? (edit && p.data?.__kind === "main" && p.data.tax == null ? { background: "#fffbe6" } : undefined);
  }

  function onCellValueChanged(e: CellValueChangedEvent<R>) {
    if (reverting.current) return;
    const d = e.data;
    const colId = e.column.getColId();
    const i = d.__i;
    const n = Number(e.newValue ?? 0) || 0;

    // ----- sub item cell
    if (d.__kind === "child") {
      if (colId === "description" || colId === "uom" || colId === "hsnSac") {
        patchChild(i, d.__j, { [colId]: String(e.newValue ?? "") });
      } else if (colId === "quantity" || colId === "rate") {
        patchChild(i, d.__j, { [colId]: n });
      }
      return;
    }

    // ----- line cell
    const row = valueRef.current[i];
    if (!row) return;
    const line = row as QuotationLineRow;
    let changes: Record<string, unknown> | null = null;

    switch (colId) {
      case "description":
      case "uom":
      case "hsnSac":
        changes = { [colId]: String(e.newValue ?? "") };
        break;
      case "quantity": {
        const max = quantityMax?.(row);
        changes = { quantity: max !== undefined && n > max ? max : n };
        break;
      }
      case "rate":
        changes = { rate: n };
        break;
      case "discountPercent": // % and amount are alternatives - typing one clears the other
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
      case "estimationType": {
        const next = e.newValue === EST_BREAKUP ? EST_BREAKUP : EST_DIRECT;
        if (next === (line.estimationType ?? EST_DIRECT)) return;
        if (next === EST_BREAKUP) {
          // Rate becomes the sum of the sub items; start with one empty sub item
          const list = line.breakups?.length ? line.breakups : [newBreakup()];
          pendingFocus.current = { i, j: 0, col: "description" };
          changes = { estimationType: EST_BREAKUP, breakups: list };
        } else {
          if ((line.breakups ?? []).length && !window.confirm("Switching to Direct will remove this line's sub items. Continue?")) {
            reverting.current = true;
            e.node.setDataValue("estimationType", e.oldValue);
            reverting.current = false;
            return;
          }
          changes = { estimationType: EST_DIRECT, breakups: [] };
        }
        break;
      }
    }
    if (changes) patchLine(i, changes);
  }

  // Shortcut keys. Handled here (not by AG Grid) so they also work while a cell is being edited.
  function onKeyDown(ev: KeyboardEvent<HTMLDivElement>) {
    if (!(ev.target as HTMLElement).closest(".ag-root-wrapper")) return;
    // Enter inside a cell editor must not submit the surrounding antd <Form>
    if (ev.key === "Enter") return ev.preventDefault();

    const key = ev.key;
    const ctrl = ev.ctrlKey || ev.metaKey;
    const isShortcut = key === "F9" || key === "F10" || key === "F12" || (ctrl && (key.toLowerCase() === "i" || key.toLowerCase() === "d"));
    if (!isShortcut) return;
    ev.preventDefault();
    if (readOnly) {
      if (key === "F12") setShowBreakups((s) => !s);
      return;
    }

    const cur = focusedRow(); // read before the edit is committed
    apiRef.current?.stopEditing(); // commit the cell being typed in, then act on the latest rows
    if (key === "F9") insertLine(cur?.i ?? null, "below");
    else if (key === "F10") insertBreakup(cur?.i ?? null);
    else if (key === "F12") setShowBreakups((s) => !s);
    else if (ctrl && key.toLowerCase() === "i") insertLine(cur?.i ?? null, "above");
    else if (ctrl && key.toLowerCase() === "d") deleteCurrent();
  }

  return (
    <div onKeyDown={onKeyDown}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        {!readOnly && (
          <>
            <Button size="small" onClick={() => insertLine(focusedRow()?.i ?? null, "below")}>F9 Insert Line</Button>
            <Button size="small" onClick={() => insertLine(focusedRow()?.i ?? null, "above")}>Ctrl+I Insert Above</Button>
            <Button size="small" onClick={() => insertBreakup(focusedRow()?.i ?? null)}>F10 Insert Sub Item</Button>
            <Button size="small" danger onClick={deleteCurrent}>Ctrl+D Delete</Button>
          </>
        )}
        <Button size="small" onClick={() => setShowBreakups((s) => !s)}>
          F12 {showBreakups ? "Hide" : "Show"} Sub Items
        </Button>
        {hint && <span style={{ color: "#ff4d4f", fontSize: 12 }}>{hint}</span>}
      </div>
      {!readOnly && missingTax > 0 && (
        <div style={{ marginBottom: 8, color: "#ad6800" }}>
          {missingTax} line(s) have no tax - pick one in the Tax column.
        </div>
      )}
      <AgGridReact<R>
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={{ sortable: false, resizable: true, suppressMovable: true }}
        getRowId={(p) => p.data.__k}
        getRowStyle={(p) => (p.data?.__kind === "child" ? { background: "#f1f9ff" } : undefined)}
        domLayout="autoHeight"
        onGridReady={(ev) => (apiRef.current = ev.api)}
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
