// src/features/parties/partyTabsConfig.ts

import type { TabConfig } from "../../components/DynamicTabForm/types";
import type { EmployeeFormInput } from "./schema";

export const employeeTabsConfig: TabConfig<EmployeeFormInput>[] = [
  {
    key: "Employee", label: "Employee Details",
    fields: [      
      { name: "EmployeeCode", label: "Employee Code", type: "text", required: true },
      { name: "EmployeeName", label: "Employee Name", type: "text", required: true },
      { name: "Address", label: "Address", type: "text" },
      { name: "MobileNumber", label: "Mobile Number", type: "text" },
      { name: "Qualification", label: "Qualification", type: "text" },
      { name: "DateOfJoining", label: "Date Of Joining", type: "date" },
      { name: "DateOfBirth", label: "Date Of Birth", type: "date" },
      { name: "BloodGroup", label: "Blood Group", type: "select", options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
      { name: "Department", label: "Department", type: "creatable-select", options: ["HR", "Finance", "Purchase", "Sales"] },
      { name: "Designation", label: "Designation", type: "creatable-select", options: ["Manager", "Executive", "Intern"] },      
      { name: "Status", label: "Status", type: "select", required: true, options: ["Active", "Inactive"] },
    ],
  },
  
];