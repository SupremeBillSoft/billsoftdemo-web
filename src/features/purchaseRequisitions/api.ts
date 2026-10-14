// src/features/purchaseRequisitions/api.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";
import type { PurchaseRequisition, PurchaseRequisitionPayload } from "./types";

const KEY = ["purchase-requisitions"] as const;

export function usePurchaseRequisitionsQuery() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<PurchaseRequisition[]>("/purchase-requisitions/");
      return data;
    },
  });
}

// Backs the PR Approval page. Key is nested under KEY so the approval
// decision mutation's invalidateQueries({ queryKey: KEY }) refreshes this
// list too - a processed PR drops out without a manual refetch.
export function usePendingPurchaseRequisitionsQuery() {
  return useQuery({
    queryKey: [...KEY, "pending"],
    queryFn: async () => {
      const { data } = await apiClient.get<PurchaseRequisition[]>("/purchase-requisitions/", {
        params: { status: "Pending" },
      });
      return data;
    },
  });
}

export function usePurchaseRequisitionQuery(id?: string) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: async () => {
      const { data } = await apiClient.get<PurchaseRequisition>(`/purchase-requisitions/${id}/`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreatePurchaseRequisitionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: PurchaseRequisitionPayload) => {
      const { data } = await apiClient.post<PurchaseRequisition>("/purchase-requisitions/", values);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdatePurchaseRequisitionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: number; values: PurchaseRequisitionPayload }) => {
      const { data } = await apiClient.patch<PurchaseRequisition>(`/purchase-requisitions/${id}/`, values);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeletePurchaseRequisitionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/purchase-requisitions/${id}/`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
