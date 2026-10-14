// src/features/docNumberFormats/types.ts

export interface DocumentNumberFormat {
  id: number;
  entryNo: number; // read-only, = id (legacy "Entry No" / "Sl No")
  doc: string;
  docType: string;
  docSubType: string;
  prefix: string;
  prefixSeparator: string;
  docNo: number; // the next number to issue - the starting number while nothing is issued
  issuedCount: number; // read-only: numbers issued under this version
  formatDigit: number;
  docSeparator: string;
  midText: string;
  midTextSeparator: string;
  finYear1: 2 | 4 | null;
  finYear2: 2 | 4 | null;
  yearSeparator: string;
  suffix: string;
  suffixSeparator: string;
  fromDate: string; // ISO date
  toDate: string | null;
  isYearFirst: boolean; // "Doc No. Display Order"
  isActive: boolean;
  finalDocFormat: string; // server-computed, read-only
  isCurrentVersion: boolean;
}

export type DocumentNumberFormatPayload = Omit<
  DocumentNumberFormat,
  "id" | "entryNo" | "issuedCount" | "toDate" | "finalDocFormat" | "isCurrentVersion"
>;
