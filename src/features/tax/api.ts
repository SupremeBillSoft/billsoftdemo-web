// src/features/tax/api.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";
import type { Tax } from "./types";
import type { TaxFormValues } from "./schema";

const taxKeys = { all: ["taxes"] as const, detail: (id: number | string) => [...taxKeys.all, "detail", id] as const };

export function useTaxesQuery() {
  return useQuery({
    queryKey: taxKeys.all,
    queryFn: async () => (await apiClient.get<Tax[]>("/taxes/")).data,
  });
}
export function useTaxQuery(id: string | undefined) {
  return useQuery({
    queryKey: taxKeys.detail(id ?? "__new__"),
    queryFn: async () => (await apiClient.get<Tax>(`/taxes/${id}/`)).data,
    enabled: !!id,
  });
}
export function useCreateTaxMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: TaxFormValues) => (await apiClient.post<Tax>("/taxes/", values)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: taxKeys.all }),
  });
}
export function useUpdateTaxMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: number; values: TaxFormValues }) => (await apiClient.put<Tax>(`/taxes/${id}/`, values)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: taxKeys.all }),
  });
}