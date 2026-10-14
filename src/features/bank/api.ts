// src/features/bank/api.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";
import type { Bank } from "./types";
import type { BankFormValues } from "./schema";

const bankKeys = { all: ["banks"] as const, detail: (code: string) => [...bankKeys.all, "detail", code] as const };

export function useBanksQuery() {
  return useQuery({
    queryKey: bankKeys.all,
    queryFn: async () => (await apiClient.get<Bank[]>("/banks/")).data, // was: PaginatedResponse<Bank>
  });
}

export function useBankQuery(bankCode: string | undefined) {
  return useQuery({
    queryKey: bankKeys.detail(bankCode ?? "__new__"), // same array-cache-collision fix as every prior master
    queryFn: async () => (await apiClient.get<Bank>(`/banks/${bankCode}/`)).data,
    enabled: !!bankCode,
  });
}

export function useCreateBankMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: BankFormValues) => (await apiClient.post<Bank>("/banks/", values)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: bankKeys.all }),
  });
}

export function useUpdateBankMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bankCode, values }: { bankCode: string; values: BankFormValues }) =>
      (await apiClient.put<Bank>(`/banks/${bankCode}/`, values)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: bankKeys.all }),
  });
}