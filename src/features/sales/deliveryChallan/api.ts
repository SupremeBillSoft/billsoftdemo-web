// src/features/sales/deliveryChallan/api.ts

import { makeSalesApi } from "../shared/api";
import type { DeliveryChallan } from "./types";

export const deliveryChallanApi = makeSalesApi<DeliveryChallan>("delivery-challans");
