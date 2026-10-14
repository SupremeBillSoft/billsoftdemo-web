// src/features/sales/salesReturn/api.ts

import { makeSalesApi } from "../shared/api";
import type { SalesReturn } from "./types";

export const salesReturnApi = makeSalesApi<SalesReturn>("returns");
