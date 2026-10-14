import type { TabConfig } from "../../components/DynamicTabForm/types";
import type { BankFormInput } from "./schema";

export const bankTabsConfig: TabConfig<BankFormInput>[] = [
  {
    key: "general", label: "Bank Details",
    fields: [
      { name: "bankCode", label: "Bank Code", type: "text", required: true },
      { name: "bankName", label: "Bank Name", type: "text", required: true },
      { name: "branchName", label: "Branch Name", type: "text" },
      { name: "address", label: "Address", type: "text" },
      { name: "accountNo", label: "Account No", type: "text", required: true },
      { name: "accountType", label: "Account Type", type: "select", options: ["Current", "Savings"] },
      { name: "ifscCode", label: "IFSC Code", type: "text" },
      { name: "micrCode", label: "MICR Code", type: "text" },
      { name: "openingBalance", label: "Opening Balance", type: "number" },
      { name: "remarks", label: "Remarks", type: "text" },
      { name: "status", label: "Status", type: "select", required: true, options: ["Active", "Inactive"] },
    ],
  },
];