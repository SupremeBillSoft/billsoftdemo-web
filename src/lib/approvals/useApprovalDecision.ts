// src/lib/approvals/useApprovalDecision.ts
//
// One generic hook factory, reused by PR and PO (and any future approvable
// document) instead of writing "useDecidePurchaseRequisition" /
// "useDecidePurchaseOrder" as separate copies of the same mutation.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api-client";

// "Pending" releases a Hold document back to Pending (the only way out of
// Hold until the BRD defines another).
export type ApprovalDecision = "Approved" | "Rejected" | "Hold" | "Pending";

// BRD 6.5.1.2 / 6.5.2.2: "Approved by" and a reason are required for every
// decision. TODO (login): approvedBy should come from the logged-in user.
export interface DecisionDetails {
  approvedBy: string;
  reason: string;
}

export function useApprovalDecisionMutation(resourceBasePath: string, invalidateKey: readonly unknown[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, decision, ...details }: { id: number; decision: ApprovalDecision } & DecisionDetails) => {
      const { data } = await apiClient.post(`${resourceBasePath}/${id}/decision/`, { decision, ...details });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invalidateKey }),
  });
}

export function useBulkApprovalDecisionMutation(resourceBasePath: string, invalidateKey: readonly unknown[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, decision, ...details }: { ids: number[]; decision: ApprovalDecision } & DecisionDetails) => {
      const { data } = await apiClient.post(`${resourceBasePath}/bulk-decision/`, { ids, decision, ...details });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invalidateKey }),
  });
}
