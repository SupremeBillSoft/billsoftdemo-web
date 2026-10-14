// src/features/parties/types.ts

import type { PartyFormValues } from "./schema";

export interface Party extends PartyFormValues {
  id: number;
  subTypeIds?: number[];
}

export interface PartySubType {
  id: number;
  subTypeName: string;
  remarks?: string;
}