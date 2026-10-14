import type { TabConfig } from "../../components/DynamicTabForm/types";
import type { BranchFormInput } from "./schema";


export const branchTabsConfig: TabConfig<BranchFormInput>[] = [
  {
    key: "branch", label: "Branch Details",
    fields: [
      { name: "branchCode", label: "Branch Code", type: "text", required: true },
      { name: "branchName", label: "Branch Name", type: "text", required: true },
      { name: "branchType", label: "Branch Type", type: "creatable-select", optionsSource: "branchTypes" },
      { name: "registrationNo", label: "Registration No.", type: "text", required: true },
      { name: "gstin", label: "GSTIN", type: "text" },
      { name: "pan", label: "PAN", type: "text" },
      { name: "status", label: "Status", type: "select", options: ["Active", "Inactive"] },
      { name: "remarks", label: "Remarks", type: "text" },
    ],
  },
  {
    key: "address", label: "Address Details",
    fields: [
      { name: "addressLine1", label: "Address Line 1", type: "text", required: true },
      { name: "addressLine2", label: "Address Line 2", type: "text" },
      { name: "city", label: "City", type: "text", required: true },
      { name: "state", label: "State", type: "text", required: true },
      { name: "country", label: "Country", type: "text", required: true },
      { name: "pincode", label: "Pin Code", type: "text" },
      { name: "mobileNo", label: "Mobile No.", type: "text"},
      { name: "email", label: "Email", type: "text" },
    ],
  },
  
  
];