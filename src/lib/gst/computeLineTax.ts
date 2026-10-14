// src/lib/gst/computeLineTax.ts
//
// Client-side mirror of common/gst/engine.py - used by LineItemsGrid (and
// any future line-items UI) for a live total as the user types. The server
// recomputes authoritatively at save time; this is a preview only, never
// trusted as the final tax figure.

export interface GstLineInput {
  taxableValue: number;
  gstRatePercent: number;
  cessRatePercent?: number;
  sellerState: string;
  buyerState: string;
}

export interface GstLineResult {
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  lineTotal: number;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function computeLineTax(input: GstLineInput): GstLineResult {
  const { taxableValue, gstRatePercent, cessRatePercent = 0, sellerState, buyerState } = input;
  const intraState = sellerState === buyerState;

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (intraState) {
    const halfRate = gstRatePercent / 2;
    cgst = round2((taxableValue * halfRate) / 100);
    sgst = round2((taxableValue * halfRate) / 100);
  } else {
    igst = round2((taxableValue * gstRatePercent) / 100);
  }

  const cess = round2((taxableValue * cessRatePercent) / 100);
  const lineTotal = round2(taxableValue + cgst + sgst + igst + cess);

  return { taxableValue: round2(taxableValue), cgst, sgst, igst, cess, lineTotal };
}

export interface GstDocumentTotals {
  totalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalCess: number;
  grandTotal: number;
}

export function computeDocumentTotals(lines: GstLineResult[]): GstDocumentTotals {
  const sum = (key: keyof GstLineResult) => round2(lines.reduce((acc, l) => acc + l[key], 0));
  return {
    totalTaxable: sum("taxableValue"),
    totalCgst: sum("cgst"),
    totalSgst: sum("sgst"),
    totalIgst: sum("igst"),
    totalCess: sum("cess"),
    grandTotal: sum("lineTotal"),
  };
}
