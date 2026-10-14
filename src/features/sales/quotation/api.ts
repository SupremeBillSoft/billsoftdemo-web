// src/features/sales/quotation/api.ts

import { makeSalesApi } from "../shared/api";
import type { Quotation } from "./types";

export const quotationApi = makeSalesApi<Quotation>("quotations");
