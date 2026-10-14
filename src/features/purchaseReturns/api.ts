// src/features/purchaseReturns/api.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";
import { STOCK_KEY } from "../inventory/api";
import type {
  PurchaseReturn,
  PurchaseReturnPayload,
  ReturnableInvoiceLine,
  ReturnableInvoiceOption,
} from "./types";

export const PRET_KEY = ["purchase-returns"] as const;

export function usePurchaseReturnsQuery() {
  return useQuery({
    queryKey: PRET_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<PurchaseReturn[]>("/purchase-returns/");
      return data;
    },
  });
}

export function usePurchaseReturnQuery(id?: string) {
  return useQuery({
    queryKey: [...PRET_KEY, id],
    queryFn: async () => {
      const { data } = await apiClient.get<PurchaseReturn>(`/purchase-returns/${id}/`);
      return data;
    },
    enabled: !!id,
  });
}

export function useReturnableInvoicesQuery() {
  return useQuery({
    queryKey: [...PRET_KEY, "returnable-invoices"],
    queryFn: async () => {
      const { data } = await apiClient.get<ReturnableInvoiceOption[]>("/purchase-returns/returnable-invoices/");
      return data;
    },
  });
}

export function useReturnableInvoiceLinesQuery(invoiceId: number | null) {
  return useQuery({
    queryKey: [...PRET_KEY, "returnable-lines", invoiceId],
    queryFn: async () => {
      const { data } = await apiClient.get<ReturnableInvoiceLine[]>(`/purchase-invoices/${invoiceId}/returnable-lines/`);
      return data;
    },
    enabled: !!invoiceId,
  });
}

export function useCreatePurchaseReturnMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: PurchaseReturnPayload) => {
      const { data } = await apiClient.post<PurchaseReturn>("/purchase-returns/", values);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRET_KEY });
      queryClient.invalidateQueries({ queryKey: STOCK_KEY }); // returns take stock out
    },
  });
}

export function useUpdatePurchaseReturnMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: number; values: PurchaseReturnPayload }) => {
      const { data } = await apiClient.patch<PurchaseReturn>(`/purchase-returns/${id}/`, values);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRET_KEY });
      queryClient.invalidateQueries({ queryKey: STOCK_KEY }); // returns take stock out
    },
  });
}

export function useDeletePurchaseReturnMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/purchase-returns/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRET_KEY });
      queryClient.invalidateQueries({ queryKey: STOCK_KEY }); // returns take stock out
    },
  });
}
