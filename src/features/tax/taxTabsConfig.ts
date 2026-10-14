// src/features/tax/taxTabsConfig.ts

import type { TabConfig } from "../../components/DynamicTabForm/types";
import type { TaxFormInput } from "./schema";

export const taxTabsConfig: TabConfig<TaxFormInput>[] = [
  {
    key: "general", label: "Tax Details",
    fields: [
      { name: "taxCode", label: "Tax Code", type: "number", disabled: false },
      { name: "taxName", label: "Tax Name", type: "text", required: true },
      { name: "taxType", label: "Tax Type", type: "select", required: true, options: ["GST", "VAT", "Sales Tax"] },
      { name: "cgstPercentage", label: "CGST Percentage", type: "number", showWhen: { field: "taxType", equals: "GST" } },
      { name: "sgstPercentage", label: "SGST Percentage", type: "number", showWhen: { field: "taxType", equals: "GST" } },
      { name: "igstPercentage", label: "IGST Percentage", type: "number", showWhen: { field: "taxType", equals: "GST" } },
      { name: "cessPercentage", label: "CESS Percentage", type: "number", showWhen: { field: "taxType", equals: "GST" } },
      { name: "vatPercentage", label: "VAT Percentage", type: "number", showWhen: { field: "taxType", equals: "VAT" } },
      { name: "salesTaxPercentage", label: "Sales Tax Percentage", type: "number", showWhen: { field: "taxType", equals: "Sales Tax" } },
      { name: "status", label: "Status", type: "select", required: true, options: ["Active", "Inactive"] },
    ],
  },
];