// src/lib/gst/useGstCalculation.ts

import { useMemo } from "react";
import { computeDocumentTotals, computeLineTax, type GstLineInput } from "./computeLineTax";

export function useGstCalculation(lines: GstLineInput[]) {
  return useMemo(() => {
    const computedLines = lines.map(computeLineTax);
    return { lines: computedLines, totals: computeDocumentTotals(computedLines) };
  }, [lines]);
}
