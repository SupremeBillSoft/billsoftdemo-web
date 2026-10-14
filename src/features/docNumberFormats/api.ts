// src/features/docNumberFormats/api.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client"; // adjust to this project's actual axios/fetch wrapper
import type { DocumentNumberFormat, DocumentNumberFormatPayload } from "./types";

const KEY = ["document-number-formats"] as const;

export function useDocumentNumberFormatsQuery(doc?: string) {
  return useQuery({
    queryKey: [...KEY, doc ?? "all"],
    queryFn: async () => {
      const { data } = await apiClient.get<DocumentNumberFormat[]>("/document-number-formats/", {
        params: doc ? { doc } : undefined,
      });
      return data;
    },
  });
}

export function useCreateDocumentNumberFormatMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: DocumentNumberFormatPayload) => {
      const { data } = await apiClient.post<DocumentNumberFormat>("/document-number-formats/", values);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateDocumentNumberFormatMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: number; values: DocumentNumberFormatPayload }) => {
      const { data } = await apiClient.patch<DocumentNumberFormat>(`/document-number-formats/${id}/`, values);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useStartNewVersionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, fromDate }: { id: number; fromDate: string }) => {
      const { data } = await apiClient.post<DocumentNumberFormat>(
        `/document-number-formats/${id}/start-new-version/`,
        { fromDate }
      );
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteDocumentNumberFormatMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/document-number-formats/${id}/`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
