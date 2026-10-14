// src/features/sales/shared/types.ts
//
// Shapes shared by every priced sales document (Quotation, Sale Order,
// Invoice, Return, Credit Note) - mirror of sales/serializers.py.

export type DiscountType = "Percent" | "Amount";

export interface PricedLine {
  id?: number;
  item: number;
  itemCode?: string;
  description: string;
  uom: string;
  hsnSac: string;
  quantity: number | string;
  rate: number | string;
  discountPercent: number | string;
  discountAmount: number | string;
  tax: number | null;
  taxName?: string | null;
  taxableValue?: string;
  cgst?: string;
  sgst?: string;
  igst?: string;
  cess?: string;
  lineTotal?: string;
}

export interface AdditionalCharge {
  id?: number;
  name: string;
  amount: number | string;
  tax: number | null;
  taxName?: string | null;
  total?: string;
}

export interface PricedDocumentFields {
  customer: number;
  customerName?: string;
  placeOfSupply: string;
  priceIncludesTax: boolean;
  docDiscountType: DiscountType;
  docDiscountValue: number | string;
  docDiscountBeforeTax: boolean;
  roundOffEnabled: boolean;
  adjustmentAmount: number | string;
  remarks: string;
  customFields: CustomField[];
  charges: AdditionalCharge[];
  totalTaxable?: string;
  totalCgst?: string;
  totalSgst?: string;
  totalIgst?: string;
  totalCess?: string;
  totalCharges?: string;
  docDiscountAmount?: string;
  roundOffAmount?: string;
  netAmount?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomField {
  name: string;
  value: string;
}

export interface ListParams {
  [key: string]: string | number | undefined | null;
}
