// src/features/sales/enquiry/types.ts - mirror of sales EnquirySerializer.

import type { CustomField } from "../shared/types";

export interface EnquiryFollowUp {
  id: number;
  followUpDate: string;
  followUpTime: string | null;
  mode: string;
  notes: string;
  outcome: string;
  isDone: boolean;
  createdBy?: string;
}

export type FollowUpState = "closed" | "none" | "overdue" | "today" | "upcoming";

export interface Enquiry {
  id: number;
  enquiryNumber: string;
  enquiryDate: string;
  enquiryMode: string;
  referenceBy: string;
  area: string;
  industryType: string;
  companyType: string;
  customer: number | null;
  customerName: string;
  address: string;
  volume: string;
  feasibility: boolean | null;
  businessType: string;
  contactPerson: string;
  contactNumber: string;
  email: string;
  website: string;
  enquiryDetails: string;
  division: string;
  preparedBy: string;
  status: "Open" | "Closed";
  customFields: CustomField[];
  followUps: EnquiryFollowUp[];
  nextFollowUpDate: string | null;
  nextFollowUpTime: string | null;
  followUpState: FollowUpState;
  createdAt?: string;
}

const opts = (values: string[]) => values.map((v) => ({ value: v, label: v }));

// Option lists carried over from the legacy Enquiry screen.
export const ENQUIRY_MODES = opts([
  "Direct Marketing",
  "Tele Marketing",
  "Existing Customer Reference",
  "Customer Direct Visit",
  "Others",
]);
export const INDUSTRY_TYPES = opts(["Retail", "Manufacturing", "FMCG", "Others"]);
export const COMPANY_TYPES = opts(["LTD", "Proprietorship", "Partnership", "Others"]);
export const BUSINESS_TYPES = opts(["B2B", "B2C", "C2C", "C2B", "Others"]);
export const DIVISIONS = opts(["All", "New Machine", "AMC", "Machine Service", "Others"]);
export const FOLLOW_UP_MODES = opts(["Call", "Visit", "Email", "WhatsApp", "Meeting", "Others"]);
