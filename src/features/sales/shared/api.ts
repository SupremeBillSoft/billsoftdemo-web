// src/features/sales/shared/api.ts
//
// One data-access pattern for every sales document, all persisted by the
// backend (/api/sales/<resource>/) - nothing is kept only in the browser.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../lib/api-client";
import { STOCK_KEY } from "../../inventory/api";
import type { ListParams } from "./types";

export const SALES_KEY = ["sales"] as const;

function cleanParams(params?: ListParams) {
  if (!params) return undefined;
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""));
}

export function makeSalesApi<TDoc, TPayload = Partial<TDoc>>(resource: string) {
  const base = `/sales/${resource}/`;
  const key = [...SALES_KEY, resource] as const;

  function useInvalidate() {
    const queryClient = useQueryClient();
    return () => {
      // A sales document can change other documents (order quantities,
      // challan status) and stock, so refresh all sales data + stock.
      queryClient.invalidateQueries({ queryKey: SALES_KEY });
      queryClient.invalidateQueries({ queryKey: STOCK_KEY });
    };
  }

  return {
    key,

    useList(params?: ListParams, enabled = true) {
      return useQuery({
        queryKey: [...key, "list", cleanParams(params) ?? {}],
        queryFn: async () => (await apiClient.get<TDoc[]>(base, { params: cleanParams(params) })).data,
        enabled,
      });
    },

    /** One-off GET outside a hook (e.g. load an order's pending lines on pick). */
    async fetchPath<T>(path: string, params?: ListParams): Promise<T> {
      return (await apiClient.get<T>(`${base}${path}`, { params: cleanParams(params) })).data;
    },

    useOne(id?: string | number | null) {
      return useQuery({
        queryKey: [...key, "one", String(id)],
        queryFn: async () => (await apiClient.get<TDoc>(`${base}${id}/`)).data,
        enabled: id !== undefined && id !== null && id !== "",
      });
    },

    useGet<T>(path: string, params?: ListParams, enabled = true) {
      return useQuery({
        queryKey: [...key, "get", path, cleanParams(params) ?? {}],
        queryFn: async () => (await apiClient.get<T>(`${base}${path}`, { params: cleanParams(params) })).data,
        enabled,
      });
    },

    useCreate() {
      const invalidate = useInvalidate();
      return useMutation({
        mutationFn: async (values: TPayload) => (await apiClient.post<TDoc>(base, values)).data,
        onSuccess: invalidate,
      });
    },

    useUpdate() {
      const invalidate = useInvalidate();
      return useMutation({
        mutationFn: async ({ id, values }: { id: number; values: TPayload }) =>
          (await apiClient.patch<TDoc>(`${base}${id}/`, values)).data,
        onSuccess: invalidate,
      });
    },

    useDelete() {
      const invalidate = useInvalidate();
      return useMutation({
        mutationFn: async (id: number) => {
          await apiClient.delete(`${base}${id}/`);
        },
        onSuccess: invalidate,
      });
    },

    /** POST to a detail action (`{id}/{action}/`) or a list action (`{action}/`). */
    useAction<TResult = TDoc>() {
      const invalidate = useInvalidate();
      return useMutation({
        mutationFn: async ({ id, action, body }: { id?: number; action: string; body?: unknown }) =>
          (await apiClient.post<TResult>(id ? `${base}${id}/${action}/` : `${base}${action}/`, body ?? {})).data,
        onSuccess: invalidate,
      });
    },
  };
}
