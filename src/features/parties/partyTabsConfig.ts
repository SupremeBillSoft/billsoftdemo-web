// src/features/parties/partyTabsConfig.ts

import type { TabConfig } from "../../components/DynamicTabForm/types";
import { itemRowSchema, contactRowSchema, shippingRowSchema, bankRowSchema } from "./schema";
import type { PartyFormInput } from "./schema";

export const partyTabsConfig: TabConfig<PartyFormInput>[] = [
  {
    key: "general", label: "General Details",
    fields: [
      // one-line: Party Code now BEFORE Party Name — this tab only. The
      // list-page column order (Party Name first) is unrelated and unchanged.
      { name: "partyCode", label: "Party Code", type: "text", required: true, disabled: true },
      { name: "partyName", label: "Party Name", type: "text", required: true },
      { name: "status", label: "Status", type: "select", required: true, options: ["Active", "Suspend/Hold", "Inactive"] },
      { name: "address1", label: "Address 1", type: "text" },
      { name: "address2", label: "Address 2", type: "text" },
      { name: "city", label: "City", type: "text" },
      { name: "pincode", label: "Pincode", type: "text" },
      { name: "state", label: "State", type: "text" },
      { name: "country", label: "Country", type: "text" },
      { name: "mobileNo", label: "Mobile No", type: "text" },
      { name: "email", label: "Email", type: "text" },
      { name: "officePhone", label: "Office Phone", type: "text" },
      { name: "website", label: "Website", type: "text" },
      { name: "contactPerson", label: "Party Contact Person", type: "text" },
      // one-line: the three independent checkboxes from Issue #4 — replace
      // the old free-text partyType entirely. isVendor stays isVendor at the
      // field/API level; only its label changes to "Sales Vendor."
    ],
  },
  {
    key: "item", label: "Item Details", repeatable: true,
    arrayFieldName: "items",
    columns: 3,
    rowFields: [
      { name: "itemCode", label: "Item Code", type: "select", optionsSource: "items" },
      { name: "itemCodeInPrint", label: "Item Code in Print", type: "text" },
      { name: "discountPercentage", label: "Discount Percentage", type: "number" },
    ],
    summaryColumns: [
      { label: "Item Code", fieldName: "itemCode" },
      { label: "Discount Percentage", fieldName: "discountPercentage" },
      { label: "Item Code in Print", fieldName: "itemCodeInPrint" },
    ],
    rowSchema: itemRowSchema,
  },
  {
    key: "other", label: "Other Details",
    fields: [
      { name: "vendorCode", label: "Vendor Code", type: "text" },
      { name: "range", label: "Range", type: "text" },
      { name: "division", label: "Division", type: "text" },
      { name: "partyArea", label: "Party Area", type: "text" },
      { name: "partyDistance", label: "Party Distance", type: "number" },
      { name: "category", label: "Category", type: "text" },
      { name: "assessmentNo", label: "Assessment No.", type: "text" },
      { name: "evaluationNo", label: "Evaluation No.", type: "text" },
      // { name: "partyType", label: "Party Type", type: "creatable-select", options: ["Sub Contractor", "Supplier", "Consumable Supplier", "Service Provider"] }, // disabled — replaced by partySubType below
      // one-line: real API-backed, single-select. optionsSource "partySubTypes"
      // is hydrated in PartyMasterFormPage from usePartySubTypesQuery(); the
      // onAddNew handler (also hydrated there) opens a small inline modal that
      // POSTs to the real PartySubTypeMaster endpoint — no new page needed.
      { name: "isCustomer", label: "Customer", type: "checkbox" },
      { name: "isExportCustomer", label: "Customer Export", type: "checkbox" },
      { name: "isVendor", label: "Sales Vendor", type: "checkbox" },
      { name: "partySubType", label: "Sub Type", type: "select", optionsSource: "partySubTypes" },
      { name: "remarks", label: "Remarks", type: "text" },
    ],
  },
  {
    key: "contact", label: "Contact Details", repeatable: true,
    arrayFieldName: "contacts",
    columns: 6,
    rowFields: [
      { name: "contactPerson", label: "Contact Person", type: "text" },
      { name: "department", label: "Department", type: "text" },
      { name: "designation", label: "Designation", type: "text" },
      { name: "mobile", label: "Mobile", type: "text" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "email", label: "Email", type: "text" },
    ],
    summaryColumns: [
      { label: "Contact Person", fieldName: "contactPerson" },
      { label: "Designation", fieldName: "designation" },
      { label: "Mobile", fieldName: "mobile" },
      { label: "Email", fieldName: "email" },
    ],
    rowSchema: contactRowSchema,
  },
  {
    key: "shipping", label: "Shipping Address", repeatable: true,
    arrayFieldName: "shippingAddresses",
    columns: 4,
    rowFields: [
      { name: "shippingPartyName", label: "Shipping Party Name", type: "text", required: true },
      { name: "shippingAddress1", label: "Address 1", type: "text", required: true },
      { name: "shippingAddress2", label: "Address 2", type: "text" },
      { name: "shippingCity", label: "City", type: "text", required: true },
      { name: "shippingPincode", label: "Pincode", type: "text", required: true },
      { name: "shippingState", label: "State", type: "text", required: true },
      { name: "shippingCountry", label: "Country", type: "text", required: true },
      { name: "shippingMobileNo", label: "Mobile No", type: "text" },
      { name: "shippingEmail", label: "Email", type: "text" },
      { name: "shippingOfficePhone", label: "Office Phone", type: "text" },
      { name: "shippingGstNo", label: "GST No.", type: "text" },
      { name: "shippingContactPerson", label: "Contact Person", type: "text" },
    ],
    summaryColumns: [
      { label: "Shipping Party Name", fieldName: "shippingPartyName" },
      { label: "Address", fieldName: "shippingAddress1" },
      { label: "City", fieldName: "shippingCity" },
      { label: "Pincode", fieldName: "shippingPincode" },
    ],
    rowSchema: shippingRowSchema,
  },
  {
    key: "tax", label: "Tax & Compliance",
    fields: [
      { name: "gstNo", label: "GST No.", type: "text" },
      { name: "panNo", label: "PAN No.", type: "text" },
      { name: "isRcmApplicable", label: "Is RCM Applicable", type: "checkbox" },
      { name: "businessType", label: "Business Type", type: "select", options: ["B2B", "SEZWP", "SEZWOP", "EXPWP", "EXPWOP", "DEXP", "B2C"] },
      { name: "tcsPercentage", label: "TCS Percentage", type: "number" },
      { name: "tdsPercentage", label: "TDS Percentage", type: "number" },
      { name: "commissionRate", label: "Commission Rate", type: "number" },
    ],
  },
  {
    key: "bank", label: "Bank Details", repeatable: true,
    arrayFieldName: "bankAccounts",
    columns: 5,
    rowFields: [
      { name: "bankCode", label: "Bank Code", type: "text" },
      { name: "bankName", label: "Bank Name", type: "text" },
      { name: "branchName", label: "Branch Name", type: "text" },
      { name: "accountNo", label: "Account No", type: "text" },
      { name: "accountType", label: "Account Type", type: "select", options: ["Current", "Savings"] },
      { name: "ifscCode", label: "IFSC Code", type: "text" },
      { name: "switchCode", label: "Switch Code", type: "text" },
      { name: "remarks", label: "Remarks", type: "text" },
    ],
    summaryColumns: [
      { label: "Bank Name", fieldName: "bankName" },
      { label: "Account No", fieldName: "accountNo" },
      { label: "IFSC Code", fieldName: "ifscCode" },
    ],
    rowSchema: bankRowSchema,
  },
];