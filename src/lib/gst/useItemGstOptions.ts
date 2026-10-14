// src/lib/gst/useItemGstOptions.ts
//
// GET /item-gst-options/ - each active Item's DEFAULT Tax master id (the
// item's own tax_type, else its HSN's) plus the company's State from
// Company Settings. Item-entry grids pre-select that tax on each line (the
// user can change it - BRD "Tax Type" per line) and preview tax with
// lib/gst/lineTax.ts. Still only a PREVIEW: the backend recalculates on save.

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api-client";

export interface ItemGstOption {
  id: number;
  taxId: number | null;
}

interface ItemGstOptionsResponse {
  sellerState: string;
  items: ItemGstOption[];
}

export const ITEM_GST_OPTIONS_KEY = ["item-gst-options"] as const;

export function useItemGstOptionsQuery() {
  return useQuery({
    queryKey: ITEM_GST_OPTIONS_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<ItemGstOptionsResponse>("/item-gst-options/");
      return data;
    },
    staleTime: 5 * 60 * 1000, // tax rates don't change minute to minute
  });
}
