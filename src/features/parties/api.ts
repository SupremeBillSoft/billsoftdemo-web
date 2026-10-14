// src/features/parties/api.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";
import type { Party, PartySubType } from "./types";
import type { PartyFormValues } from "./schema";

const partyKeys = {
  all: ["parties"] as const,
  detail: (partyCode: string) => [...partyKeys.all, "detail", partyCode] as const,
};

const partySubTypeKeys = {
  all: ["party-sub-types"] as const,
};

// one-line: the payload actually sent to the API — PartyFormValues plus
// subTypeIds, which is NOT a schema-validated form field (the form binds to
// the human-readable `partySubType` name instead, via FieldRenderer's
// string-only options contract). PartyMasterFormPage computes this at
// submit time, translating name -> id before it ever reaches here.
export type PartyApiPayload = PartyFormValues & { subTypeIds?: number[] };

export function usePartiesQuery() {
  return useQuery({
    queryKey: partyKeys.all,
    queryFn: async () => {
      // one-line: DRF's plain ModelViewSet list returns a raw array, not the
      // {results, total} envelope our earlier mock types assumed — matching
      // what the backend actually sends, not what we originally guessed.
      const { data } = await apiClient.get<Party[]>("/parties/");
      return data;
    },
  });
}

export function usePartyQuery(partyCode: string | undefined) {
  return useQuery({
    // one-line: "__new__" is a key that will never match a real party code
    // OR the list query's key — this guarantees `data` is genuinely
    // undefined when disabled, instead of silently inheriting whatever
    // happens to be cached under a key it accidentally shares.
    queryKey: partyKeys.detail(partyCode ?? "__new__"),
    queryFn: async () => {
      const { data } = await apiClient.get<Party>(`/parties/${partyCode}/`);
      return data;
    },
    enabled: !!partyCode,
  });
}

export function useCreatePartyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: PartyApiPayload) => {
      const { data } = await apiClient.post<Party>("/parties/", values);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: partyKeys.all }),
  });
}

export function useUpdatePartyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ partyCode, values }: { partyCode: string; values: PartyApiPayload }) => {
      const { data } = await apiClient.put<Party>(`/parties/${partyCode}/`, values);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: partyKeys.all }),
  });
}

export function useDeletePartyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (partyCode: string) => {
      await apiClient.delete(`/parties/${partyCode}/`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: partyKeys.all }),
  });
}

export function usePartySubTypesQuery() {
  return useQuery({
    queryKey: partySubTypeKeys.all,
    queryFn: async () => {
      const { data } = await apiClient.get<PartySubType[]>("/party-sub-types/");
      return data;
    },
  });
}

export function useCreatePartySubTypeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: { subTypeName: string; remarks?: string }) => {
      const { data } = await apiClient.post<PartySubType>("/party-sub-types/", values);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: partySubTypeKeys.all }),
  });
}
export function usePartyLookupQuery(kind: PartyKind) {
  return useQuery({
    queryKey: ["parties", "lookup", kind],
    queryFn: async () => {
      const { data } = await apiClient.get<PartyLookup[]>("/parties/", { params: { kind } });
      return data;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
