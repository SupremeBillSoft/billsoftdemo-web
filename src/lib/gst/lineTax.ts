// src/lib/gst/lineTax.ts
//
// Client-side mirror of the backend's line pricing (purchase/serializers.py
// price_line + purchase/gst_resolution.py) for the live preview:
//   taxable = qty x rate - discount% + P&F + freight
//   rate    = the line's Tax master row: CGST%+SGST% intra-state, IGST%
//             inter-state (company State vs supplier State)

import { useMemo } from "react";
import { computeLineTax, type GstLineResult } from "./computeLineTax";
import { useItemGstOptionsQuery } from "./useItemGstOptions";
import { useTaxesQuery } from "../../features/tax/api";
import type { Tax } from "../../features/tax/types";

export interface LineAmountsInput {
  qty: number;
  rate: number;
  taxId?: number | null;
  discountPercent?: number;
  packForwardAmount?: number;
  freightAmount?: number;
}

export interface LinePreview extends GstLineResult {
  discountAmount: number;
}

function pct(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function taxRatePercent(tax: Tax | undefined, intraState: boolean): number {
  if (!tax) return 0;
  const split = pct(tax.cgstPercentage) + pct(tax.sgstPercentage);
  const igst = pct(tax.igstPercentage);
  return intraState ? split || igst : igst || split;
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// One hook for every purchase grid: the Tax picker options, each item's
// default tax, and a preview function for a line.
export function useLineTaxContext(buyerState: string) {
  const { data: taxes = [] } = useTaxesQuery();
  const { data: gstOptions } = useItemGstOptionsQuery();
  const sellerState = gstOptions?.sellerState ?? "";

  return useMemo(() => {
    const taxById = new Map(taxes.map((t) => [Number(t.id), t]));
    const defaultTaxByItem = new Map((gstOptions?.items ?? []).map((o) => [Number(o.id), o.taxId]));
    const intraState = sellerState === buyerState;

    const taxOptions = taxes
      .filter((t) => t.status !== "Inactive")
      .map((t) => ({ value: Number(t.id), label: t.taxName }));

    function defaultTaxFor(itemId: number | undefined): number | null {
      return itemId != null ? defaultTaxByItem.get(Number(itemId)) ?? null : null;
    }

    function preview(line: LineAmountsInput): LinePreview {
      const gross = pct(line.qty) * pct(line.rate);
      const discountAmount = round2((gross * pct(line.discountPercent)) / 100);
      const taxableValue = gross - discountAmount + pct(line.packForwardAmount) + pct(line.freightAmount);
      const tax = line.taxId != null ? taxById.get(Number(line.taxId)) : undefined;
      const result = computeLineTax({
        taxableValue,
        gstRatePercent: taxRatePercent(tax, intraState),
        cessRatePercent: pct(tax?.cessPercentage),
        sellerState,
        buyerState,
      });
      return { ...result, discountAmount };
    }

    function taxName(taxId: number | null | undefined): string {
      return taxId != null ? taxById.get(Number(taxId))?.taxName ?? "-" : "-";
    }

    function getTax(taxId: number | null | undefined): Tax | undefined {
      return taxId != null ? taxById.get(Number(taxId)) : undefined;
    }

    return { taxOptions, defaultTaxFor, preview, taxName, getTax, sellerState };
  }, [taxes, gstOptions, sellerState, buyerState]);
}

export type LineTaxContext = ReturnType<typeof useLineTaxContext>;

export function sumPreviews(previews: LinePreview[]) {
  return previews.reduce(
    (acc, p) => ({
      taxable: acc.taxable + p.taxableValue,
      cgst: acc.cgst + p.cgst,
      sgst: acc.sgst + p.sgst,
      igst: acc.igst + p.igst,
      cess: acc.cess + p.cess,
      total: acc.total + p.lineTotal,
    }),
    { taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0, total: 0 }
  );
}
