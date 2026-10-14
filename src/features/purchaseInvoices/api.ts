// src/features/purchaseInvoices/api.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";
import { STOCK_KEY } from "../inventory/api";
import { PO_KEY } from "../purchaseOrders/api";
import type {
  InvoiceablePOOption,
  PendingPOLine,
  PurchaseInvoice,
  PurchaseInvoicePayload,
} from "./types";

export const PI_KEY = ["purchase-invoices"] as const;

export function usePurchaseInvoicesQuery() {
  return useQuery({
    queryKey: PI_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<PurchaseInvoice[]>("/purchase-invoices/");
      return data;
    },
  });
}

export function usePurchaseInvoiceQuery(id?: string) {
  return useQuery({
    queryKey: [...PI_KEY, id],
    queryFn: async () => {
      const { data } = await apiClient.get<PurchaseInvoice>(`/purchase-invoices/${id}/`);
      return data;
    },
    enabled: !!id,
  });
}

export function useInvoiceableOrdersQuery() {
  return useQuery({
    queryKey: [...PI_KEY, "invoiceable-orders"],
    queryFn: async () => {
      const { data } = await apiClient.get<InvoiceablePOOption[]>("/purchase-invoices/invoiceable-orders/");
      return data;
    },
  });
}

// Lines still open to invoice on a given PO - re-fetched whenever the
// Create Invoice screen's "source PO" picker changes.
export function usePendingPoLinesQuery(poId: number | null) {
  return useQuery({
    queryKey: [...PI_KEY, "pending-lines", poId],
    queryFn: async () => {
      const { data } = await apiClient.get<PendingPOLine[]>(`/purchase-orders/${poId}/pending-lines/`);
      return data;
    },
    enabled: !!poId,
  });
}

export function useCreatePurchaseInvoiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: PurchaseInvoicePayload) => {
      const { data } = await apiClient.post<PurchaseInvoice>("/purchase-invoices/", values);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PI_KEY });
      // Invoices move stock and PO pending qty.
      queryClient.invalidateQueries({ queryKey: STOCK_KEY });
      queryClient.invalidateQueries({ queryKey: PO_KEY });
    },
  });
}

export function useUpdatePurchaseInvoiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: number; values: PurchaseInvoicePayload }) => {
      const { data } = await apiClient.patch<PurchaseInvoice>(`/purchase-invoices/${id}/`, values);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PI_KEY });
      // Invoices move stock and PO pending qty.
      queryClient.invalidateQueries({ queryKey: STOCK_KEY });
      queryClient.invalidateQueries({ queryKey: PO_KEY });
    },
  });
}

export function useDeletePurchaseInvoiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/purchase-invoices/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PI_KEY });
      // Invoices move stock and PO pending qty.
      queryClient.invalidateQueries({ queryKey: STOCK_KEY });
      queryClient.invalidateQueries({ queryKey: PO_KEY });
    },
  });
}

export function useCancelPurchaseInvoiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.post<PurchaseInvoice>(`/purchase-invoices/${id}/cancel/`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PI_KEY });
      // Invoices move stock and PO pending qty.
      queryClient.invalidateQueries({ queryKey: STOCK_KEY });
      queryClient.invalidateQueries({ queryKey: PO_KEY });
    },
  });
}
