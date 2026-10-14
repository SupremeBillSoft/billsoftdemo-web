// src/features/units/api.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";
import type { Unit } from "./types";
import type { UomFormValues } from "./schema";

const unitKeys = {
  all: ["units"] as const,
  detail: (unitCode: string) => [...unitKeys.all, "detail", unitCode] as const,
};

export function useUnitsQuery() {
  return useQuery({
    queryKey: unitKeys.all,
    queryFn: async () => {
      const { data } = await apiClient.get<Unit[]>("/units/");
      return data;
    },
  });
}

export function useUnitQuery(unitCode: string | undefined) {
  return useQuery({
    queryKey: unitKeys.detail(unitCode ?? "__new__"), // one-line: same "__new__" fix from Party's array-cache bug — never collides with the list's own key
    queryFn: async () => {
      const { data } = await apiClient.get<Unit>(`/units/${unitCode}/`);
      return data;
    },
    enabled: !!unitCode,
  });
}

export function useCreateUnitMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: UomFormValues) => {
      const { data } = await apiClient.post<Unit>("/units/", values);
      return data;
    },
    // one-line: invalidating ["units"] means EVERY consumer — Unit Master's
    // own list, AND Item Master's UOM dropdown — refetches automatically.
    // This is what makes the new unit appear back in Item Master with no
    // extra wiring beyond this one line.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: unitKeys.all }),
  });
}

export function useUpdateUnitMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ unitCode, values }: { unitCode: string; values: UomFormValues }) => {
      const { data } = await apiClient.put<Unit>(`/units/${unitCode}/`, values);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: unitKeys.all }),
  });
}