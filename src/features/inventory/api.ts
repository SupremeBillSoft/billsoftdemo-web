// src/features/inventory/api.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";
import type {
  Godown,
  GodownPayload,
  StockAdjustmentHistoryRow,
  StockAdjustmentPayload,
  StockRow,
  StockTransfer,
  StockTransferPayload,
} from "./types";

export const GODOWN_KEY = ["godowns"] as const;
export const STOCK_KEY = ["inventory-stock"] as const;
const ADJUSTMENT_KEY = ["inventory-adjustments"] as const;
const TRANSFER_KEY = ["inventory-transfers"] as const;

export function useGodownsQuery() {
  return useQuery({
    queryKey: GODOWN_KEY,
    queryFn: async () => (await apiClient.get<Godown[]>("/godowns/")).data,
  });
}

export function useSaveGodownMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: number; values: GodownPayload }) =>
      id
        ? (await apiClient.patch<Godown>(`/godowns/${id}/`, values)).data
        : (await apiClient.post<Godown>("/godowns/", values)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GODOWN_KEY }),
  });
}

export function useDeleteGodownMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/godowns/${id}/`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GODOWN_KEY }),
  });
}

export function useStockQuery(params: { godown?: number | null; search?: string; item?: number | null }) {
  return useQuery({
    queryKey: [...STOCK_KEY, params],
    queryFn: async () =>
      (
        await apiClient.get<StockRow[]>("/inventory/stock/", {
          params: { godown: params.godown ?? undefined, search: params.search || undefined, item: params.item ?? undefined },
        })
      ).data,
  });
}

export function useStockAdjustmentHistoryQuery(itemId: number | null) {
  return useQuery({
    queryKey: [...ADJUSTMENT_KEY, itemId],
    queryFn: async () =>
      (await apiClient.get<StockAdjustmentHistoryRow[]>("/inventory/adjustments/", { params: { item: itemId } })).data,
    enabled: itemId != null,
  });
}

export function useAdjustStockMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: StockAdjustmentPayload) =>
      (await apiClient.post<StockAdjustmentHistoryRow>("/inventory/adjustments/", values)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STOCK_KEY });
      queryClient.invalidateQueries({ queryKey: ADJUSTMENT_KEY });
    },
  });
}

export function useStockTransfersQuery() {
  return useQuery({
    queryKey: TRANSFER_KEY,
    queryFn: async () => (await apiClient.get<StockTransfer[]>("/inventory/transfers/")).data,
  });
}

export function useCreateStockTransferMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: StockTransferPayload) =>
      (await apiClient.post<StockTransfer>("/inventory/transfers/", values)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSFER_KEY });
      queryClient.invalidateQueries({ queryKey: STOCK_KEY });
    },
  });
}
