import type { TabConfig } from "../../components/DynamicTabForm/types";
import type { HSNFormInput } from "./schema";

export const hsnTabsConfig: TabConfig<HSNFormInput>[] = [
  {
    key: "hsn", label: "HSN Details",
    fields: [
      { name: "hsnCode", label: "HSN Code", type: "text", required: true },
      { name: "hsnName", label: "HSN Name", type: "text", required: true },
      { name: "itemType", label: "Item Type", type: "creatable-select", optionsSource: "hsnItemTypes" },
      { name: "productCategory", label: "Product Category", type: "creatable-select", optionsSource: "hsnProductCategories" },
      { name: "taxType", label: "Tax Type", type: "select", optionsSource: "taxes" },
      { name: "status", label: "Status", type: "select", required: true, options: ["Active", "Inactive"] },
    ],
  },
];