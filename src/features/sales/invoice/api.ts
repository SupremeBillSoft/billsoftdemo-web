// src/features/sales/invoice/api.ts

import { makeSalesApi } from "../shared/api";
import type { SalesInvoice } from "./types";

export const invoiceApi = makeSalesApi<SalesInvoice>("invoices");
