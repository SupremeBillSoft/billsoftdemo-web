import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";
import type { HSN } from "./types";
import type { HSNFormValues } from "./schema";

const hsnKeys = { all: ["hsns"] as const, detail: (code: string) => [...hsnKeys.all, "detail", code] as const };

export function useHSNsQuery() {
  return useQuery({ queryKey: hsnKeys.all, queryFn: async () => (await apiClient.get<HSN[]>("/hsn/")).data });
}
export function useHSNQuery(hsnCode: string | undefined) {
  return useQuery({
    queryKey: hsnKeys.detail(hsnCode ?? "__new__"),
    queryFn: async () => (await apiClient.get<HSN>(`/hsn/${hsnCode}/`)).data,
    enabled: !!hsnCode,
  });
}
export function useCreateHSNMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: HSNFormValues) => (await apiClient.post<HSN>("/hsn/", values)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: hsnKeys.all }),
  });
}
export function useUpdateHSNMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ hsnCode, values }: { hsnCode: string; values: HSNFormValues }) =>
      (await apiClient.put<HSN>(`/hsn/${hsnCode}/`, values)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: hsnKeys.all }),
  });
}

interface Lookup { id: number; name: string; }

export function useHSNItemTypesQuery() {
  return useQuery({ queryKey: ["hsnItemTypes"], queryFn: async () => (await apiClient.get<Lookup[]>("/hsn-item-types/")).data });
}
export function useCreateHSNItemTypeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => (await apiClient.post<Lookup>("/hsn-item-types/", { name })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hsnItemTypes"] }),
  });
}
export function useHSNProductCategoriesQuery() {
  return useQuery({ queryKey: ["hsnProductCategories"], queryFn: async () => (await apiClient.get<Lookup[]>("/hsn-product-categories/")).data });
}
export function useCreateHSNProductCategoryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => (await apiClient.post<Lookup>("/hsn-product-categories/", { name })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hsnProductCategories"] }),
  });
}