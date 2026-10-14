// src/features/sales/shared/pricing.ts
//
// Live preview mirror of billsoft-backend/sales/pricing.py price_document -
// same steps, same rounding points, so what the screen shows is what the
// server saves. If you change the rule, change it in BOTH places.
//
//   gross    = qty x rate (0 for a free line)
//   discount = % of gross, or the amount given (each derived from the other)
//   taxable  = gross - discount, or backed out of a tax-inclusive rate
//   document discount before tax is shared across lines by taxable value
//   GST per line: CGST+SGST if place of supply = company state, else IGST;
//   exports are inter-state, zero-rated under LUT
//   + additional charges (own tax), - after-tax discount, + adjustment,
//   rounded to the rupee when round-off is on.

import { computeLineTax } from "../../../lib/gst/computeLineTax";
import { round2, taxRatePercent } from "../../../lib/gst/lineTax";
import type { Tax } from "../../tax/types";
import type { DiscountType } from "./types";

export const EXPORT_STATE = "OUTSIDE INDIA";

export interface PricingLineInput {
  quantity: number | string;
  rate: number | string;
  discountPercent?: number | string;
  discountAmount?: number | string;
  tax?: number | null;
  isFree?: boolean;
}

export interface PricingChargeInput {
  amount: number | string;
  tax?: number | null;
}

export interface PricingOptions {
  buyerState: string;
  priceIncludesTax?: boolean;
  docDiscountType?: DiscountType;
  docDiscountValue?: number | string;
  docDiscountBeforeTax?: boolean;
  roundOffEnabled?: boolean;
  adjustmentAmount?: number | string;
  export?: boolean;
  zeroRated?: boolean;
}

export interface PricedLineResult {
  discountPercent: number;
  discountAmount: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  lineTotal: number;
}

export interface PricedChargeResult {
  amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  total: number;
}

export interface DocumentTotals {
  totalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalCess: number;
  totalCharges: number;
  docDiscountAmount: number;
  roundOffAmount: number;
  netAmount: number;
}

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function priceDocument(
  lines: PricingLineInput[],
  charges: PricingChargeInput[],
  options: PricingOptions,
  context: { sellerState: string; getTax: (id: number | null | undefined) => Tax | undefined }
): { lines: PricedLineResult[]; charges: PricedChargeResult[]; totals: DocumentTotals } {
  const buyerState = options.export ? EXPORT_STATE : options.buyerState ?? "";
  const sellerState = context.sellerState;
  const intra = sellerState === buyerState && !options.export;

  const rateOf = (taxId: number | null | undefined) => {
    if (options.zeroRated) return { gst: 0, cess: 0 };
    const tax = context.getTax(taxId);
    return { gst: taxRatePercent(tax, intra), cess: num(tax?.cessPercentage) };
  };

  // 1. gross, line discount, taxable
  const work = lines.map((line) => {
    const { gst, cess } = rateOf(line.tax);
    const gross = line.isFree ? 0 : num(line.quantity) * num(line.rate);
    let percent = num(line.discountPercent);
    let amount = num(line.discountAmount);
    if (percent) amount = round2((gross * percent) / 100);
    else if (amount && gross) percent = round2((amount / gross) * 100);
    const net = gross - amount;
    const taxable = options.priceIncludesTax ? net / (1 + (gst + cess) / 100) : net;
    return { taxable, gst, cess, percent, amount: round2(amount) };
  });

  // 2. document discount before tax, apportioned by taxable value
  const base = work.reduce((sum, w) => sum + w.taxable, 0);
  let docDiscount = 0;
  if (num(options.docDiscountValue)) {
    docDiscount =
      options.docDiscountType === "Amount"
        ? round2(num(options.docDiscountValue))
        : round2((base * num(options.docDiscountValue)) / 100);
  }
  const beforeTax = options.docDiscountBeforeTax !== false;
  if (beforeTax && docDiscount && base) {
    let remaining = docDiscount;
    work.forEach((w, index) => {
      const share = index === work.length - 1 ? remaining : round2((docDiscount * w.taxable) / base);
      w.taxable -= share;
      remaining -= share;
    });
  }

  // 3. GST per line
  const pricedLines = work.map((w) => {
    const r = computeLineTax({
      taxableValue: Math.max(w.taxable, 0),
      gstRatePercent: w.gst,
      cessRatePercent: w.cess,
      sellerState,
      buyerState,
    });
    return {
      discountPercent: w.percent,
      discountAmount: w.amount,
      taxableValue: r.taxableValue,
      cgst: r.cgst,
      sgst: r.sgst,
      igst: r.igst,
      cess: r.cess,
      lineTotal: r.lineTotal,
    };
  });

  // 4. charges
  const pricedCharges = charges.map((c) => {
    const { gst, cess } = c.tax ? rateOf(c.tax) : { gst: 0, cess: 0 };
    const r = computeLineTax({ taxableValue: num(c.amount), gstRatePercent: gst, cessRatePercent: cess, sellerState, buyerState });
    return { amount: r.taxableValue, cgst: r.cgst, sgst: r.sgst, igst: r.igst, cess: r.cess, total: r.lineTotal };
  });

  // 5. totals
  const sum = <T,>(rows: T[], pick: (row: T) => number) => rows.reduce((acc, row) => acc + pick(row), 0);
  const grossTotal = sum(pricedLines, (l) => l.lineTotal) + sum(pricedCharges, (c) => c.total);
  const afterTaxDiscount = beforeTax ? 0 : docDiscount;
  const beforeRound = grossTotal - afterTaxDiscount + num(options.adjustmentAmount);
  const rounded = options.roundOffEnabled !== false ? Math.round(beforeRound) : beforeRound;

  return {
    lines: pricedLines,
    charges: pricedCharges,
    totals: {
      totalTaxable: round2(sum(pricedLines, (l) => l.taxableValue) + sum(pricedCharges, (c) => c.amount)),
      totalCgst: round2(sum(pricedLines, (l) => l.cgst) + sum(pricedCharges, (c) => c.cgst)),
      totalSgst: round2(sum(pricedLines, (l) => l.sgst) + sum(pricedCharges, (c) => c.sgst)),
      totalIgst: round2(sum(pricedLines, (l) => l.igst) + sum(pricedCharges, (c) => c.igst)),
      totalCess: round2(sum(pricedLines, (l) => l.cess) + sum(pricedCharges, (c) => c.cess)),
      totalCharges: round2(sum(pricedCharges, (c) => c.total)),
      docDiscountAmount: docDiscount,
      roundOffAmount: round2(rounded - beforeRound),
      netAmount: round2(rounded),
    },
  };
}
