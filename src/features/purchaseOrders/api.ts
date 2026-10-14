// src/features/purchaseOrders/api.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";
import type { OrderablePR, PurchaseOrder, PurchaseOrderPayload } from "./types";

export const PO_KEY = ["purchase-orders"] as const;

export function usePurchaseOrdersQuery() {
  return useQuery({
    queryKey: PO_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<PurchaseOrder[]>("/purchase-orders/");
      return data;
    },
  });
}

export function usePurchaseOrderQuery(id?: string) {
  return useQuery({
    queryKey: [...PO_KEY, id],
    queryFn: async () => {
      const { data } = await apiClient.get<PurchaseOrder>(`/purchase-orders/${id}/`);
      return data;
    },
    enabled: !!id,
  });
}

// BRD 6.5.2.1.2: "display the list of PR No.s based on the Party Code
// selected" - the selected supplier's Approved PRs plus PRs raised without a
// supplier, each with the lines still left to order.
export function useApprovedPurchaseRequisitionsQuery(supplierId?: number | null) {
  return useQuery({
    queryKey: [...PO_KEY, "approved-requisitions", supplierId],
    queryFn: async () => {
      const { data } = await apiClient.get<OrderablePR[]>("/purchase-orders/approved-requisitions/", {
        params: { supplier: supplierId },
      });
      return data;
    },
    enabled: !!supplierId,
  });
}

export function useCreatePurchaseOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: PurchaseOrderPayload) => {
      const { data } = await apiClient.post<PurchaseOrder>("/purchase-orders/", values);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PO_KEY });
      // A PO changes how much of each PR line is still open to order.
      queryClient.invalidateQueries({ queryKey: ["purchase-requisitions"] });
    },
  });
}

export function useUpdatePurchaseOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: number; values: PurchaseOrderPayload }) => {
      const { data } = await apiClient.patch<PurchaseOrder>(`/purchase-orders/${id}/`, values);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PO_KEY });
      // A PO changes how much of each PR line is still open to order.
      queryClient.invalidateQueries({ queryKey: ["purchase-requisitions"] });
    },
  });
}

export function useDeletePurchaseOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/purchase-orders/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PO_KEY });
      // A PO changes how much of each PR line is still open to order.
      queryClient.invalidateQueries({ queryKey: ["purchase-requisitions"] });
    },
  });
}

// Backs the PO Approval page (?status=Pending / Hold). Nested under PO_KEY so
// a decision's invalidateQueries({ queryKey: PO_KEY }) refreshes it too.
export function usePurchaseOrdersByStatusQuery(status: "Pending" | "Hold") {
  return useQuery({
    queryKey: [...PO_KEY, "status", status],
    queryFn: async () => {
      const { data } = await apiClient.get<PurchaseOrder[]>("/purchase-orders/", { params: { status } });
      return data;
    },
  });
}
