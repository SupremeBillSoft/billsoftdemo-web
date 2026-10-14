import type { TabConfig } from "../../components/DynamicTabForm/types";
import type { ItemFormInput } from "./schema";
import { CustomFieldsSection } from "./CustomFieldsSection";

export const itemTabsConfig: TabConfig<ItemFormInput>[] = [
  {
    key: "item", label: "Item Details",
    fields: [
      { name: "itemCode", label: "Item Code", type: "text", required: true },
      { name: "itemName", label: "Item Name", type: "text", required: true },
      { name: "itemType", label: "Item Type", type: "select", required: true, options: ["Product", "Service"] },
      { name: "itemStatus", label: "Item Status", type: "select", options: ["Active", "Inactive"] },
      { name: "itemDescription", label: "Item Description", type: "text" },
      { name: "itemCategory", label: "Item Category", type: "creatable-select", options: ["Raw Material", "Consumables", "Finished Goods"] },
      { name: "brand", label: "Brand", type: "select", options: ["Brand A", "Brand B"] },
      { name: "purchaseUom", label: "Purchase UOM", type: "select", optionsSource: "units" },
      { name: "billingUom", label: "Billing UOM", type: "select", required: true, optionsSource: "units" },
      { name: "perPurchaseUom", label: "Per Purchase UOM", type: "number" },
    ],
  },
  {
    key: "pricing", label: "Pricing & Tax",
    fields: [
      { name: "hsnCode", label: "HSN/SAC Code", type: "select", optionsSource: "hsnCodes" },
      { name: "taxType", label: "Tax Type", type: "select", optionsSource: "taxes" },
      { name: "purchasePrice", label: "Purchase Price", type: "number" },
      { name: "sellingPrice", label: "Selling Price", type: "number" },
      { name: "mrp", label: "MRP", type: "number" },
      { name: "wholesaleDiscount", label: "Wholesale Discount", type: "number" },
      { name: "retailDiscount", label: "Retail Discount", type: "number" },
      { name: "memberDiscount", label: "Member Discount", type: "number" },
      { name: "recipeCost", label: "Recipe Cost", type: "number" },
      { name: "dineInPrice", label: "Dine-in Price", type: "number" },
      { name: "takeawayPrice", label: "Takeaway Price", type: "number" },
      { name: "deliveryPrice", label: "Delivery Price", type: "number" },
    ],
  },
  {
    key: "other", label: "Other Detail",
    fields: [
      { name: "perUnitWeight", label: "Per Unit Weight", type: "number" },
      { name: "packingQty", label: "Packing Qty", type: "number" },
      { name: "reorderLevel", label: "Reorder Level", type: "number" },
      { name: "drawingNo", label: "Drawing No.", type: "text" },
      { name: "procurementDays", label: "Procurement Days", type: "number" },
      { name: "shortName", label: "Short Name", type: "text" },
    ],
    renderFooter: (control) => <CustomFieldsSection control={control} />,
    errorFields: ["customFields"],
  }
];