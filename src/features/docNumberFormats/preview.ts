// src/features/docNumberFormats/preview.ts
//
// Client-side mirror of docnumbering/services.py build_number() - the same
// rule, so the live "Final Doc Format" never disagrees with what the server
// issues. If you change the rule, change it in BOTH places.
//
// Built purely from the entered values, in this slot order:
//   Prefix [PrefixSep] First [DocNoSep] MidText [MidTextSep] Second [SuffixSep] Suffix
// First/Second = Doc No and Year, ordered by "Doc No. Display Order".
// Doc No is zero-padded to Format Digit. A separator is written only when
// selected AND there is a part on both sides of it.
//   e.g. P + "/" + 1 + "/" + 24-25        -> P/1/24-25
//        P, year first, 5 digits, no seps -> P242500001

import type { DocumentNumberFormat } from "./types";

type PreviewInput = Pick<
  DocumentNumberFormat,
  | "prefix"
  | "prefixSeparator"
  | "formatDigit"
  | "docSeparator"
  | "midText"
  | "midTextSeparator"
  | "finYear1"
  | "finYear2"
  | "yearSeparator"
  | "suffix"
  | "suffixSeparator"
  | "isYearFirst"
  | "fromDate"
>;

// The calendar year the financial year containing `isoDate` started in.
export function financialYearStart(isoDate: string, fyStartMonth: number): number {
  const [year, month] = isoDate.split("-").map(Number);
  return month >= fyStartMonth ? year : year - 1;
}

function fyText(year: number, digits: 2 | 4 | null): string {
  return digits === 2 ? String(year).slice(-2) : String(year);
}

export function computePreview(fmt: PreviewInput, docNo: number, fyStartMonth = 4): string {
  const fyStart = fmt.fromDate ? financialYearStart(fmt.fromDate, fyStartMonth) : new Date().getFullYear();
  const yearParts: string[] = [];
  if (fmt.finYear1) yearParts.push(fyText(fyStart, fmt.finYear1));
  if (fmt.finYear2) yearParts.push(fyText(fyStart + 1, fmt.finYear2));
  const year = yearParts.join(fmt.yearSeparator ?? "");
  const number = String(docNo).padStart(fmt.formatDigit || 1, "0");

  const [first, second] = fmt.isYearFirst ? [year, number] : [number, year];
  const slots: [string, string][] = [
    [fmt.prefix ?? "", fmt.prefixSeparator ?? ""],
    [first, fmt.docSeparator ?? ""],
    [fmt.midText ?? "", fmt.midTextSeparator ?? ""],
    [second, ""],
  ];

  let result = "";
  let pendingSeparator = "";
  for (const [text, separatorAfter] of slots) {
    if (!text) continue;
    result = result ? `${result}${pendingSeparator}${text}` : text;
    pendingSeparator = separatorAfter;
  }
  if (fmt.suffix) result = result ? `${result}${fmt.suffixSeparator ?? ""}${fmt.suffix}` : fmt.suffix;
  return result;
}
