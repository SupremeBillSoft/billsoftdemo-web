// src/features/purchaseOrders/PurchaseOrderFormPage.tsx

import { useEffect, useMemo, useState } from "react";
import { Button, DatePicker, Divider, Form, Input, Select, message } from "antd";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";
import {
  useApprovedPurchaseRequisitionsQuery,
  useCreatePurchaseOrderMutation,
  usePurchaseOrderQuery,
  useUpdatePurchaseOrderMutation,
} from "./api";
import {
  purchaseOrderSchema,
  type POItemRow,
  type PurchaseOrderFormInput,
  type PurchaseOrderFormValues,
} from "./schema";
import type { OrderablePR } from "./types";
import { POItemEntryGrid } from "./POItemEntryGrid";
import { usePartiesQuery } from "../parties/api"; // adjust to actual export name
import { useItemsQuery } from "../items/api"; // adjust to actual export name
import { useLineTaxContext } from "../../lib/gst/lineTax";
import { showApiErrorPopup } from "../../lib/apiError";
import { useCompanySettingsQuery } from "../settings/api";
import { isUsableSupplier } from "../../lib/partyEligibility";

const DATE_FIELDS = [
  { name: "quotationDate", label: "Quotation Date" },
  { name: "validityDate", label: "Validity" },
] as const;

const TEXT_FIELDS = [
  { name: "raisedBy", label: "Raised By" },
  { name: "quotationNo", label: "Quotation No." },
  { name: "kindAttn", label: "Kind Attn." },
  { name: "otherReference", label: "Other Reference" },
  { name: "deliveryTo", label: "Delivery To" },
  { name: "delivery", label: "Delivery" },
] as const;

// One grid row per open PR line, pre-filled with the qty still left to
// order (the user can lower it to split the PR across several POs).
function rowsFromPR(pr: OrderablePR, defaultTaxFor: (itemId: number) => number | null): POItemRow[] {
  return pr.lines.map((line) => ({
    prItem: line.id,
    prNumber: pr.prNumber,
    prPendingQty: Number(line.pendingOrderQty),
    item: line.item,
    itemCode: line.itemCode,
    description: line.description,
    uom: line.uom,
    hsnSac: line.hsnSac,
    orderQty: Number(line.pendingOrderQty),
    rate: 0, // rate is not on a PR - the user fills it in here
    discountPercent: 0,
    packForwardAmount: 0,
    freightAmount: 0,
    tax: defaultTaxFor(line.item),
    notes: "",
    deliveryDate: line.deliveryDate,
  }));
}

export function PurchaseOrderFormPage({ readOnly = false }: { readOnly?: boolean }) {
  const { poNo } = useParams();
  const isCreate = !poNo;
  const navigate = useNavigate();

  const { data: existing } = usePurchaseOrderQuery(poNo);
  const { data: parties = [] } = usePartiesQuery();
  const { data: items = [] } = useItemsQuery();
  const { data: companySettings } = useCompanySettingsQuery();
  // Legacy ISPoWithoutPR: off (default) = every PO line comes from a PR.
  const allowManualLines = companySettings?.allowPoWithoutPr ?? false;
  const createMutation = useCreatePurchaseOrderMutation();
  const updateMutation = useUpdatePurchaseOrderMutation();

  const eligibleSuppliers = useMemo(() => parties.filter((p: any) => isUsableSupplier(p)), [parties]);

  const itemOptions = useMemo(
    () =>
      items.map((i: any) => ({
        id: i.id,
        itemCode: i.itemCode,
        description: i.itemDescription || i.itemName,
        uom: i.billingUom,
        hsnSac: i.hsnCode,
      })),
    [items]
  );

  const { control, handleSubmit, setValue, getValues, watch, reset } = useForm<
    PurchaseOrderFormInput,
    unknown,
    PurchaseOrderFormValues
  >({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      supplier: undefined as unknown as number,
      poDate: dayjs().format("YYYY-MM-DD"),
      raisedBy: "",
      quotationNo: "",
      quotationDate: null,
      validityDate: null,
      kindAttn: "",
      otherReference: "",
      deliveryTo: "",
      delivery: "",
      terms: "",
      paymentTerms: "",
      currencyCode: "",
      dispatchDetails: "",
      remarks: "",
      items: [],
    },
  });

  useEffect(() => {
    if (existing) reset(existing);
  }, [existing, reset]);

  const supplierId = watch("supplier");
  const supplierState = useMemo(
    () => (parties.find((p: any) => p.id === supplierId) as any)?.state ?? "",
    [parties, supplierId]
  );
  // Tax picker options, each item's default tax, and the preview math -
  // company State (Company Settings) vs this supplier's State.
  const taxContext = useLineTaxContext(supplierState);
  const { data: approvedPRs = [] } = useApprovedPurchaseRequisitionsQuery(supplierId);
  // PRs picked in this session. Lines already saved on an existing PO keep
  // their PR No. on the row itself, so this only tracks what's being added.
  const [selectedPrIds, setSelectedPrIds] = useState<number[]>([]);

  function currentRows(): POItemRow[] {
    return (getValues("items") ?? []) as POItemRow[];
  }

  function handleSupplierChange(nextSupplier: number) {
    setValue("supplier", nextSupplier);
    // The PR list depends on the supplier - drop rows sourced from PRs
    // picked for the previous one.
    const pickedPrLineIds = new Set(
      approvedPRs.filter((pr) => selectedPrIds.includes(pr.id)).flatMap((pr) => pr.lines.map((l) => l.id))
    );
    setValue("items", currentRows().filter((row) => !row.prItem || !pickedPrLineIds.has(row.prItem)));
    setSelectedPrIds([]);
  }

  function handlePrSelectionChange(nextIds: number[]) {
    const removed = approvedPRs.filter((pr) => selectedPrIds.includes(pr.id) && !nextIds.includes(pr.id));
    const added = approvedPRs.filter((pr) => nextIds.includes(pr.id) && !selectedPrIds.includes(pr.id));

    const removedLineIds = new Set(removed.flatMap((pr) => pr.lines.map((l) => l.id)));
    let rows = currentRows().filter((row) => !row.prItem || !removedLineIds.has(row.prItem));
    const presentLineIds = new Set(rows.map((row) => row.prItem).filter((id): id is number => id != null));
    for (const pr of added) {
      rows = [
        ...rows,
        ...rowsFromPR(pr, taxContext.defaultTaxFor).filter((row) => !presentLineIds.has(row.prItem as number)),
      ];
    }
    setValue("items", rows);
    setSelectedPrIds(nextIds);
  }


  const onSubmit = async (values: PurchaseOrderFormValues) => {
    try {
      if (isCreate) {
        await createMutation.mutateAsync(values);
      } else {
        await updateMutation.mutateAsync({ id: Number(poNo), values });
      }
    } catch (error) {
      showApiErrorPopup("Could not save the Purchase Order", error);
      return;
    }
    message.success("Saved Successfully");
    navigate("/purchase/order");
  };

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      {!isCreate && existing && (
        <div style={{ display: "flex", gap: 24 }}>
          <Form.Item label="PO No.">
            <Input value={existing.poNumber} disabled />
          </Form.Item>
          <Form.Item label="Status">
            <Input value={existing.status} disabled />
          </Form.Item>
          {existing.approvedBy && (
            <Form.Item label="Approved / Decided By">
              <Input value={existing.approvedBy} disabled />
            </Form.Item>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 24 }}>
        <Form.Item label="Supplier" style={{ flex: 2 }}>
          <Controller
            name="supplier"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                onChange={handleSupplierChange}
                disabled={readOnly || !isCreate}
                showSearch
                optionFilterProp="label"
                options={eligibleSuppliers.map((p: any) => ({ value: p.id, label: `${p.partyCode} - ${p.partyName}` }))}
              />
            )}
          />
        </Form.Item>
        {existing && existing.prNumbers.length > 0 && (
          <Form.Item label="Linked PR No." style={{ flex: 1 }}>
            <Input value={existing.prNumbers.join(", ")} disabled />
          </Form.Item>
        )}
        {!readOnly && (
          <Form.Item
            label={existing ? "Add lines from PR No." : allowManualLines ? "PR No. (Approved, optional)" : "PR No. (Approved)"}
            style={{ flex: 2 }}
          >
            <Select
              mode="multiple"
              allowClear
              disabled={!supplierId}
              placeholder={
                !supplierId ? "Select a supplier first" : allowManualLines ? "Standalone PO if left blank" : "Select PR No."
              }
              value={selectedPrIds}
              onChange={handlePrSelectionChange}
              optionFilterProp="label"
              options={approvedPRs.map((pr) => ({
                value: pr.id,
                label: `${pr.prNumber} (${pr.prDate})${pr.supplier == null ? " - no supplier" : ""}`,
              }))}
            />
          </Form.Item>
        )}
        <Form.Item label="PO Date" style={{ flex: 1 }}>
          <Controller
            name="poDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                style={{ width: "100%" }}
                disabled={readOnly}
                value={field.value ? dayjs(field.value) : null}
                onChange={(d) => field.onChange(d ? d.format("YYYY-MM-DD") : "")}
              />
            )}
          />
        </Form.Item>
        <Form.Item label="Currency" style={{ flex: 1 }}>
          <Controller name="currencyCode" control={control} render={({ field }) => <Input {...field} disabled={readOnly} />} />
        </Form.Item>
      </div>

      <div style={{ display: "flex", gap: 24 }}>
        <Form.Item label="Payment Terms" style={{ flex: 1 }}>
          <Controller name="paymentTerms" control={control} render={({ field }) => <Input {...field} disabled={readOnly} />} />
        </Form.Item>
        <Form.Item label="Terms" style={{ flex: 2 }}>
          <Controller name="terms" control={control} render={({ field }) => <Input {...field} disabled={readOnly} />} />
        </Form.Item>
        <Form.Item label="Dispatch Through" style={{ flex: 2 }}>
          <Controller name="dispatchDetails" control={control} render={({ field }) => <Input {...field} disabled={readOnly} />} />
        </Form.Item>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", columnGap: 24 }}>
        {TEXT_FIELDS.map(({ name, label }) => (
          <Form.Item key={name} label={label}>
            <Controller name={name} control={control} render={({ field }) => <Input {...field} disabled={readOnly} />} />
          </Form.Item>
        ))}
        {DATE_FIELDS.map(({ name, label }) => (
          <Form.Item key={name} label={label}>
            <Controller
              name={name}
              control={control}
              render={({ field }) => (
                <DatePicker
                  style={{ width: "100%" }}
                  disabled={readOnly}
                  value={field.value ? dayjs(field.value) : null}
                  onChange={(d) => field.onChange(d ? d.format("YYYY-MM-DD") : null)}
                />
              )}
            />
          </Form.Item>
        ))}
      </div>

      <Divider>Items</Divider>
      <Controller
        name="items"
        control={control}
        render={({ field }) => (
          <POItemEntryGrid
            value={field.value as POItemRow[]}
            onChange={field.onChange}
            itemOptions={itemOptions}
            taxContext={taxContext}
            allowManualLines={allowManualLines}
            readOnly={readOnly}
          />
        )}
      />

      <Divider />
      <Form.Item label="Remarks">
        <Controller name="remarks" control={control} render={({ field }) => <Input.TextArea {...field} disabled={readOnly} />} />
      </Form.Item>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Button onClick={() => navigate("/purchase/order")}>{readOnly ? "Close" : "Cancel"}</Button>
        {!readOnly && (
          <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
            Save Changes
          </Button>
        )}
      </div>
    </Form>
  );
}
