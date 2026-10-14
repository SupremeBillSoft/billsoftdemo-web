// src/features/uom/uomTabConfig.ts

import type { TabConfig } from "../../components/DynamicTabForm/types";
import type { UomFormInput } from "./schema";

export const uomTabConfig: TabConfig<UomFormInput>[] = [
  {
    key: "general", label: "UOM Details",
    fields: [
      { name: "unitCode", label: "Unit Code", type: "text", required: true },
      { name: "unitName", label: "Unit Name", type: "text", required: true },
      { name: "unitDescription", label: "Unit Description", type: "text", required: true },
      { name: "unitStatus", label: "Unit Status", type: "select", required: true, options: ["Active", "Inactive"] },
      { name: "einvoiceUom", label: "E-Invoice UOM", type: "text", required: true, disabled: false }, // now actually read-only
      { name: "remarks", label: "Remarks", type: "text" },
    ],
  },
];