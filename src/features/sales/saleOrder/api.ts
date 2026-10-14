// src/features/sales/saleOrder/api.ts

import { makeSalesApi } from "../shared/api";
import type { SaleOrder } from "./types";

export const saleOrderApi = makeSalesApi<SaleOrder>("sale-orders");
