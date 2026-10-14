// src/features/sales/creditNote/api.ts

import { makeSalesApi } from "../shared/api";
import type { CreditNote } from "./types";

export const creditNoteApi = makeSalesApi<CreditNote>("credit-notes");
