// src/features/settings/api.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";
import { ITEM_GST_OPTIONS_KEY } from "../../lib/gst/useItemGstOptions";

export const USER_ROLES = ["Super Admin", "Admin", "Manager", "User"] as const;
export type UserRole = (typeof USER_ROLES)[number];

// BRD 6.7.1 Company Settings - one record per tenant.
export interface CompanySettings {
  businessName: string;
  phone: string;
  email: string;
  address1: string;
  address2: string;
  city: string;
  pincode: string;
  state: string; // the company's own State - decides CGST+SGST vs IGST
  country: string;
  gstRegistered: boolean;
  gstin: string;
  panNo: string;
  financialYearStartMonth: number; // 1-12, default 4 (April) - drives the year in document numbers
  allowPoWithoutPr: boolean; // legacy ISPoWithoutPR - off = every PO line comes from a PR
  // Role-based auto approval: a PR/PO created by a user with one of these
  // roles is approved automatically. Takes effect once login exists.
  autoApprovePrRoles: UserRole[];
  autoApprovePoRoles: UserRole[];
  // --- Sales ---
  allowNegativeStockOnSales: boolean; // bill ahead of stock, with a warning
  einvoiceEnabled: boolean; // GST e-invoicing (aggregate turnover above Rs 5 crore)
  aato10crOrMore: boolean; // Rs 10 crore+: report to the IRP within 30 days
  ewayBillThreshold: number | string; // consignment value needing an e-way bill
  ewayBillIntraStateThresholds: Record<string, number | string>; // state -> higher intra-state limit
  lutNumber: string; // Letter of Undertaking - zero-rated exports without IGST
  lutValidTill: string | null;
  updatedAt?: string;
}

const KEY = ["company-settings"] as const;

export function useCompanySettingsQuery() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => (await apiClient.get<CompanySettings>("/company-settings/")).data,
  });
}

export function useUpdateCompanySettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<CompanySettings>) =>
      (await apiClient.patch<CompanySettings>("/company-settings/", values)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
      // The company State feeds every purchase screen's tax preview.
      queryClient.invalidateQueries({ queryKey: ITEM_GST_OPTIONS_KEY });
      // The financial-year start month changes the year in document numbers.
      queryClient.invalidateQueries({ queryKey: ["document-number-formats"] });
    },
  });
}
