import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";
import type { Currency } from "./types";
import type { CurrencyFormValues } from "./schema";

const currencyKeys = { all: ["currencies"] as const, detail: (code: string) => [...currencyKeys.all, "detail", code] as const };

export function useCurrenciesQuery() {
  return useQuery({ queryKey: currencyKeys.all, queryFn: async () => (await apiClient.get<Currency[]>("/currencies/")).data });
}
export function useCurrencyQuery(currencyCode: string | undefined) {
  return useQuery({
    queryKey: currencyKeys.detail(currencyCode ?? "__new__"),
    queryFn: async () => (await apiClient.get<Currency>(`/currencies/${currencyCode}/`)).data,
    enabled: !!currencyCode,
  });
}
export function useCreateCurrencyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: CurrencyFormValues) => (await apiClient.post<Currency>("/currencies/", values)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: currencyKeys.all }),
  });
}
export function useUpdateCurrencyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ currencyCode, values }: { currencyCode: string; values: CurrencyFormValues }) =>
      (await apiClient.put<Currency>(`/currencies/${currencyCode}/`, values)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: currencyKeys.all }),
  });
}
// one-line: NOT explicitly requested (you asked for list+create) — added
// because CurrencyListPage.tsx already has a working Delete button wired to
// this; DRF's ModelViewSet gives destroy() for free, so this is a cheap
// addition to make existing UI actually functional. Remove if not wanted.
export function useDeleteCurrencyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (currencyCode: string) => apiClient.delete(`/currencies/${currencyCode}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: currencyKeys.all }),
  });
}