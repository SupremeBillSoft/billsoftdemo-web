// src/features/parties/types.ts

import type { PartyFormValues } from "./schema";

// one-line: a stored Party is form values PLUS a generated id — kept
// separate from PartyFormValues so "data with an id" and "draft form input"
// stay distinct types, same reasoning as the earlier types.ts/schema.ts split.
export interface Party extends PartyFormValues {
  id: string;
}