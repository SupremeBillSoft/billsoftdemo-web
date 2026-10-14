// src/features/sales/enquiry/api.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../lib/api-client";
import { makeSalesApi, SALES_KEY } from "../shared/api";
import type { Enquiry, EnquiryFollowUp } from "./types";

export const enquiryApi = makeSalesApi<Enquiry>("enquiries");

export type FollowUpPayload = Partial<Omit<EnquiryFollowUp, "id">>;

export function useAddFollowUpMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: number; values: FollowUpPayload }) =>
      (await apiClient.post<Enquiry>(`/sales/enquiries/${id}/follow-ups/`, values)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SALES_KEY }),
  });
}

export function useUpdateFollowUpMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, followUpId, values }: { id: number; followUpId: number; values: FollowUpPayload }) =>
      (await apiClient.patch<Enquiry>(`/sales/enquiries/${id}/follow-ups/${followUpId}/`, values)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SALES_KEY }),
  });
}
