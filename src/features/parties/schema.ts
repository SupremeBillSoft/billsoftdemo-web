// src/features/parties/schema.ts

import { z } from "zod";

// ---------- Row schemas for repeatable tabs — defined HERE, the single source of truth ----------
// one-line: these live in schema.ts, not partyTabsConfig.ts, so the config
// file imports validation rules rather than owning a second copy of them.

export const itemRowSchema = z.object({
  itemCode: z.string().min(1, "Item Code is required"),
  itemCodeInPrint: z.string().max(50).optional(),
  discountPercentage: z.coerce.number().min(0).max(100).optional(),
});

export const contactRowSchema = z.object({
  contactPerson: z.string().min(1, "Contact Person is required").max(50),
  department: z.string().max(50).optional(),
  designation: z.string().max(50).optional(),
  mobile: z.string().max(20).regex(/^\d*$/, "Digits only").optional(),
  phone: z.string().max(50).regex(/^\d*$/, "Digits only").optional(),
  email: z.string().email("Invalid email").max(50).optional().or(z.literal("")),
});

export const shippingRowSchema = z.object({
  shippingPartyName: z.string().min(1, "Shipping Party Name is required").max(150),
  // A ship-to address must be usable on an invoice / e-way bill, so the
  // address lines that identify the place are mandatory, not just the name.
  shippingAddress1: z.string().min(1, "Address 1 is required").max(100),
  shippingAddress2: z.string().max(100).optional(),
  shippingCity: z.string().min(1, "City is required").max(50),
  shippingPincode: z.string().min(1, "Pincode is required").max(20).regex(/^\d*$/, "Digits only"),
  shippingState: z.string().min(1, "State is required").max(50),
  shippingCountry: z.string().min(1, "Country is required").max(50),
  shippingMobileNo: z.string().max(20).regex(/^\d*$/, "Digits only").optional(),
  shippingEmail: z.string().email("Invalid email").max(50).optional().or(z.literal("")),
  shippingOfficePhone: z.string().max(50).regex(/^\d*$/, "Digits only").optional(),
  shippingGstNo: z
    .string()
    .max(15)
    .regex(/^$|^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Enter a valid 15-character GSTIN")
    .optional(),
  shippingContactPerson: z.string().max(50).optional(),
});

export const bankRowSchema = z.object({
  bankCode: z.string().max(50).optional(),
  bankName: z.string().min(1, "Bank Name is required").max(50),
  branchName: z.string().max(50).optional(),
  accountNo: z.string().min(1, "Account No is required").max(50),
  accountType: z.enum(["Current", "Savings"]).optional(),
  ifscCode: z.string().max(20).optional(),
  switchCode: z.string().max(20).optional(),
  remarks: z.string().max(100).optional(),
});

// ---------- Main Party schema ----------

export const partySchema = z
  .object({
    partyCode: z.string().min(1, "Party Code is required").max(10).regex(/^[A-Za-z0-9]*$/, "Party Code must be alphanumeric"),
    partyName: z.string().min(1, "Party Name is required").max(150),
    category: z.string().max(50).optional(),
    status: z.enum(["Active", "Suspend/Hold", "Inactive"], { message: "Status is required" }),

    isVendor: z.boolean().default(false),
    isCustomer: z.boolean().default(false),
    isExportCustomer: z.boolean().default(false),
    isRcmApplicable: z.boolean().default(false),

    mobileNo: z.string().max(20).regex(/^\d*$/, "Mobile No must contain digits only").optional(),
    email: z.string().email("Invalid email").max(50).optional().or(z.literal("")),
    officePhone: z.string().max(50).regex(/^\d*$/, "Office Phone must contain digits only").optional(),
    website: z.string().max(50).optional(),
    contactPerson: z.string().max(50).optional(),

    address1: z.string().max(100).optional(),
    address2: z.string().max(100).optional(),
    city: z.string().max(50).optional(),
    pincode: z.string().max(20).regex(/^\d*$/, "Pincode must contain digits only").optional(),
    state: z.string().max(50).optional(),
    country: z.string().max(50).optional(),
    partyArea: z.string().max(50).optional(),

    gstNo: z.string().max(15).optional(),
    panNo: z.string().max(15).optional(),
    businessType: z.string().max(10).optional(),
    tcsPercentage: z.coerce.number().min(0).max(100).optional(),
    tdsPercentage: z.coerce.number().min(0).max(100).optional(),
    commissionRate: z.coerce.number().min(0).max(100).optional(),

    vendorCode: z.string().max(50).optional(),
    // one-line: this top-level itemCode is the ORIGINAL flagged-as-unusual
    // field from the UI_Menu_list sheet ("mandatory on a Party form" — kept
    // per your explicit "include as specified" call). It's a DIFFERENT
    // thing from the `items` array below, which is the new Item Details
    // tab from rev1/rev4 — a party can have many item-pricing rows, but the
    // sheet's single mandatory Item Code stays as its own field.
    itemCode: z.string().min(1, "Item Code is required").optional(),
    description: z.string().optional(),
    range: z.string().max(50).optional(),
    division: z.string().max(50).optional(),
    partyDistance: z.coerce.number().min(0).optional(),
    partyBankName: z.string().max(50).optional(),
    assessmentNo: z.string().max(50).optional(),
    evaluationNo: z.string().max(50).optional(),
    remarks: z.string().max(100).optional(),

    // partyType: z.string().optional(), // disabled — replaced by partySubType below, which reuses the real PartySubTypeMaster master (single-select). Kept commented, not deleted, per your call.
    partySubType: z.string().optional(), // single-select value from PartySubTypeMaster (Sub Contractor / Supplier / Consumable Supplier / Service Provider)

    // ---------- repeatable sections — the fix that was missing ----------
    items: z.array(itemRowSchema).default([]),
    contacts: z.array(contactRowSchema).default([]),
    shippingAddresses: z.array(shippingRowSchema).default([]),
    bankAccounts: z.array(bankRowSchema).default([]),

    eInvoiceEnabled: z.boolean().default(true),
    attachmentFileName: z.string().optional()
  })
  .superRefine((data, ctx) => {
    const gstRequired = data.eInvoiceEnabled && (data.isCustomer || data.isExportCustomer);
    if (gstRequired) {
      if (!data.gstNo) ctx.addIssue({ code: "custom", path: ["gstNo"], message: "GST No. is mandatory when e-invoice is enabled for a customer" });
      if (!data.address1) ctx.addIssue({ code: "custom", path: ["address1"], message: "Address is mandatory when e-invoice is enabled for a customer" });
      if (!data.city) ctx.addIssue({ code: "custom", path: ["city"], message: "City is mandatory when e-invoice is enabled for a customer" });
      if (!data.pincode) ctx.addIssue({ code: "custom", path: ["pincode"], message: "Pincode is mandatory when e-invoice is enabled for a customer" });
    }
  });

export type PartyFormInput = z.input<typeof partySchema>;
export type PartyFormValues = z.output<typeof partySchema>;