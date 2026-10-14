// src/features/sales/shared/PricedDocumentBody.tsx
//
// Items grid + totals footer + custom fields + remarks, shared by the
// Quotation / Sale Order / Invoice / Return / Credit Note forms. The form
// owns the values; this renders them and reports edits back by field.

import { useMemo } from "react";
import { Divider, Grid, Input } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { LineTaxContext } from "../../../lib/gst/lineTax";
import { useItemsQuery } from "../../items/api";
import { CustomFieldsEditor } from "./components";
import { DocumentTotalsPanel, type DocumentPricingValues } from "./DocumentTotals";
import type { PricingOptions } from "./pricing";
import { SalesLineGrid, type SalesItemOption, type SalesLineRow } from "./SalesLineGrid";
import { usePricedPreview } from "./schema";
import type { CustomField } from "./types";

export interface PricedBodyValues<T extends SalesLineRow> extends DocumentPricingValues {
  items: T[];
  customFields: CustomField[];
  remarks: string;
}

export function useSalesItemOptions(): SalesItemOption[] {
  const { data: items = [] } = useItemsQuery();
  return useMemo(
    () =>
      (items as unknown as (SalesItemOption & { status?: string })[])
        .filter((i) => i.status !== "Inactive")
        .map((i) => ({
          id: i.id,
          itemCode: i.itemCode,
          itemName: i.itemName,
          itemDescription: i.itemDescription,
          billingUom: i.billingUom,
          hsnCode: i.hsnCode,
          sellingPrice: i.sellingPrice,
          itemType: i.itemType,
        })),
    [items]
  );
}

export function PricedDocumentBody<T extends SalesLineRow>({
  values,
  setField,
  buyerState,
  taxContext,
  readOnly = false,
  itemsError,
  pricingExtra,
  gridProps,
  Grid = SalesLineGrid,   // <-- add
}: {
  values: PricedBodyValues<T>;
  setField: <K extends keyof PricedBodyValues<T>>(name: K, value: PricedBodyValues<T>[K]) => void;
  buyerState: string;
  taxContext: LineTaxContext;
  readOnly?: boolean;
  itemsError?: string;
  pricingExtra?: Pick<PricingOptions, "export" | "zeroRated">;
  gridProps?: {
    canAddItems?: boolean;
    makeRow?: (item: SalesItemOption) => T;
    isItemLocked?: (row: T) => boolean;
    quantityMax?: (row: T) => number | undefined;
    extraColumns?: ColumnsType<T>;
    trailingColumns?: ColumnsType<T>;
  };
  Grid?: typeof SalesLineGrid;   // <-- add
}) {
  const itemOptions = useSalesItemOptions();
  const priced = usePricedPreview(values, buyerState, taxContext, pricingExtra);

  return (
    <>
      <Divider titlePlacement="start">Items</Divider>          
        <Grid<T>                       // was <SalesLineGrid<T>
        value={values.items ?? []}
        onChange={(rows) => setField("items", rows)}
        itemOptions={itemOptions}
        taxContext={taxContext}
        priced={priced.lines}
        readOnly={readOnly}
        {...gridProps}
      />
      {itemsError && <div style={{ color: "#ff4d4f", marginTop: 6 }}>{itemsError}</div>}

      <DocumentTotalsPanel
        value={values}
        onChange={(changes) => {
          for (const [key, v] of Object.entries(changes)) {
            setField(key as keyof PricedBodyValues<T>, v as never);
          }
        }}
        totals={priced.totals}
        pricedCharges={priced.charges}
        taxContext={taxContext}
        readOnly={readOnly}
      />

      <Divider titlePlacement="start">Custom Fields</Divider>
      <CustomFieldsEditor
        value={values.customFields ?? []}
        onChange={(rows) => setField("customFields", rows)}
        readOnly={readOnly}
      />

      <div style={{ marginTop: 16 }}>
        <div style={{ marginBottom: 4 }}>Remarks</div>
        <Input.TextArea
          rows={2}
          disabled={readOnly}
          value={values.remarks ?? ""}
          onChange={(e) => setField("remarks", e.target.value)}
        />
      </div>
    </>
  );
}
