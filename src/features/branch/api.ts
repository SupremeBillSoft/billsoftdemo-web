// src/features/branch/api.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";
import type { Branch } from "./types";
import type { BranchFormValues } from "./schema";

const branchKeys = { all: ["branches"] as const, detail: (code: string) => [...branchKeys.all, "detail", code] as const };

export function useBranchesQuery() {
  return useQuery({ queryKey: branchKeys.all, queryFn: async () => (await apiClient.get<Branch[]>("/branches/")).data });
}
export function useBranchQuery(branchCode: string | undefined) {
  return useQuery({
    queryKey: branchKeys.detail(branchCode ?? "__new__"),
    queryFn: async () => (await apiClient.get<Branch>(`/branches/${branchCode}/`)).data,
    enabled: !!branchCode,
  });
}
export function useCreateBranchMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: BranchFormValues) => (await apiClient.post<Branch>("/branches/", values)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: branchKeys.all }),
  });
}
export function useUpdateBranchMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ branchCode, values }: { branchCode: string; values: BranchFormValues }) =>
      (await apiClient.put<Branch>(`/branches/${branchCode}/`, values)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: branchKeys.all }),
  });
}

// ---- Branch Type — check these two exist; this is the likely missing piece ----
interface BranchType { id: number; name: string; }

export function useBranchTypesQuery() {
  return useQuery({ queryKey: ["branchTypes"], queryFn: async () => (await apiClient.get<BranchType[]>("/branch-types/")).data });
}
export function useCreateBranchTypeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => (await apiClient.post<BranchType>("/branch-types/", { name })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branchTypes"] }),
  });
}