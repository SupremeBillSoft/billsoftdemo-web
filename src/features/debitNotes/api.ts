// src/features/debitNotes/api.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";
import type { DebitNote, DebitNotePayload, LinkableInvoiceOption } from "./types";

export const DN_KEY = ["debit-notes"] as const;

export function useDebitNotesQuery() {
  return useQuery({
    queryKey: DN_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<DebitNote[]>("/debit-notes/");
      return data;
    },
  });
}

export function useDebitNoteQuery(id?: string) {
  return useQuery({
    queryKey: [...DN_KEY, id],
    queryFn: async () => {
      const { data } = await apiClient.get<DebitNote>(`/debit-notes/${id}/`);
      return data;
    },
    enabled: !!id,
  });
}

// Backs the "Link to Invoice (search and select)" picker - Active Purchase
// Invoices, narrowed to the selected supplier when one is chosen.
export function useLinkableInvoicesQuery(supplierId?: number | null) {
  return useQuery({
    queryKey: [...DN_KEY, "linkable-invoices", supplierId ?? null],
    queryFn: async () => {
      const { data } = await apiClient.get<LinkableInvoiceOption[]>("/debit-notes/linkable-invoices/", {
        params: { supplier: supplierId ?? undefined },
      });
      return data;
    },
  });
}

export function useCreateDebitNoteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: DebitNotePayload) => {
      const { data } = await apiClient.post<DebitNote>("/debit-notes/", values);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DN_KEY }),
  });
}

export function useUpdateDebitNoteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: number; values: DebitNotePayload }) => {
      const { data } = await apiClient.patch<DebitNote>(`/debit-notes/${id}/`, values);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DN_KEY }),
  });
}

export function useDeleteDebitNoteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/debit-notes/${id}/`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DN_KEY }),
  });
}

export function useCancelDebitNoteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.post<DebitNote>(`/debit-notes/${id}/cancel/`);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DN_KEY }),
  });
}
