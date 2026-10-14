// src/features/purchaseInvoices/PurchaseInvoiceFormPage.tsx

import { useEffect, useMemo, useState } from "react";
import { Button, DatePicker, Divider, Form, Input, Radio, Select, message } from "antd";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";
import {
  useCreatePurchaseInvoiceMutation,
  useInvoiceableOrdersQuery,
  usePendingPoLinesQuery,
  usePurchaseInvoiceQuery,
  useUpdatePurchaseInvoiceMutation,
} from "./api";
import {
  purchaseInvoiceSchema,
  type PIItemRow,
  type PurchaseInvoiceFormInput,
  type PurchaseInvoiceFormValues,
} from "./schema";
import { PIItemEntryGrid, type PIItemOption } from "./PIItemEntryGrid";
import { usePartiesQuery } from "../parties/api"; // adjust to actual export name
import { useItemsQuery } from "../items/api"; // adjust to actual export name
import { useGodownsQuery } from "../inventory/api";
import { useLineTaxContext } from "../../lib/gst/lineTax";
import { showApiErrorPopup } from "../../lib/apiError";
import { isUsableSupplier } from "../../lib/partyEligibility";
import type { PendingPOLine } from "./types";

const dateInput = (readOnly: boolean, nullable = false) =>
  function DateField({ field }: { field: { value?: string | null; onChange: (v: string | null) => void } }) {
    return (
      <DatePicker
        style={{ width: "100%" }}
        disabled={readOnly}
        value={field.value ? dayjs(field.value) : null}
        onChange={(d) => field.onChange(d ? d.format("YYYY-MM-DD") : nullable ? null : "")}
      />
    );
  };

export function PurchaseInvoiceFormPage({ readOnly = false }: { readOnly?: boolean }) {
  const { invoiceNo } = useParams();
  const isCreate = !invoiceNo;
  const navigate = useNavigate();

  const { data: existing } = usePurchaseInvoiceQuery(invoiceNo);
  const { data: parties = [] } = usePartiesQuery();
  const { data: items = [] } = useItemsQuery();
  const { data: invoiceableOrders = [] } = useInvoiceableOrdersQuery();
  const { data: godowns = [] } = useGodownsQuery();
  const createMutation = useCreatePurchaseInvoiceMutation();
  const updateMutation = useUpdatePurchaseInvoiceMutation();

  const { control, handleSubmit, setValue, watch, reset } = useForm<
    PurchaseInvoiceFormInput,
    unknown,
    PurchaseInvoiceFormValues
  >({
    resolver: zodResolver(purchaseInvoiceSchema),
    defaultValues: {
      invoiceType: "PO",
      purchaseOrder: null,
      supplier: undefined as unknown as number,
      invoiceDate: dayjs().format("YYYY-MM-DD"),
      supplierInvoiceNo: "",
      supplierInvoiceDate: dayjs().format("YYYY-MM-DD"),
      inwardNo: "",
      inwardDate: null,
      purchaseType: "",
      dueDate: null,
      paymentTerms: "",
      remarks: "",
      items: [],
    },
  });

  useEffect(() => {
    if (existing) reset(existing as unknown as PurchaseInvoiceFormInput);
  }, [existing, reset]);

  const invoiceType = watch("invoiceType") ?? "PO";
  const supplierId = watch("supplier");
  const purchaseOrderId = watch("purchaseOrder");

  const supplierState = useMemo(
    () => (parties.find((p: any) => p.id === supplierId) as any)?.state ?? "",
    [parties, supplierId]
  );
  const taxContext = useLineTaxContext(supplierState);

  const itemOptions: PIItemOption[] = useMemo(
    () =>
      items.map((i: any) => ({
        id: Number(i.id),
        itemCode: i.itemCode,
        description: i.itemDescription || i.itemName,
        uom: i.billingUom,
        hsnSac: i.hsnCode,
        itemType: i.itemType,
      })),
    [items]
  );
  const godownOptions = godowns
    .filter((g) => g.status === "Active")
    .map((g) => ({ value: g.id, label: g.isMain ? `${g.name} (Main)` : g.name }));
  const mainGodownId = godowns.find((g) => g.isMain)?.id ?? null;

  // BRD 6.5.3.2: "display the PO list based on Party selected".
  const posForSupplier = invoiceableOrders.filter((po) => po.supplier === supplierId);

  // Pending lines of the PO. Create: pre-fill the grid once they load.
  // Edit: the server's pendingQty excludes what THIS invoice consumed - add
  // it back so the cap matches what the backend allows.
  const { data: fetchedPendingLines = [] } = usePendingPoLinesQuery(
    invoiceType === "PO" ? (purchaseOrderId ?? existing?.purchaseOrder ?? null) : null
  );
  const pendingQtyByPoItem = useMemo(() => {
    const map = new Map<number, number>();
    for (const line of fetchedPendingLines) map.set(line.id, Number(line.pendingQty));
    if (!isCreate && existing) {
      for (const line of existing.items) {
        if (line.poItem != null) map.set(line.poItem, (map.get(line.poItem) ?? 0) + Number(line.invoicedQty));
      }
    }
    return map;
  }, [fetchedPendingLines, existing, isCreate]);

  const [prefillForPo, setPrefillForPo] = useState<number | null>(null);
  useEffect(() => {
    if (!prefillForPo || fetchedPendingLines.length === 0) return;
    setValue(
      "items",
      fetchedPendingLines.map((line: PendingPOLine) => ({
        poItem: line.id,
        item: line.item,
        itemCode: line.itemCode ?? itemOptions.find((o) => o.id === line.item)?.itemCode ?? "",
        description: line.description,
        uom: line.uom,
        hsnSac: line.hsnSac,
        invoicedQty: Number(line.pendingQty),
        rate: Number(line.rate),
        discountPercent: Number(line.discountPercent ?? 0),
        packForwardAmount: Number(line.packForwardAmount ?? 0),
        freightAmount: Number(line.freightAmount ?? 0),
        tax: line.tax,
        godown: mainGodownId,
        secondaryUom: "",
        conversionRate: null,
        remarks: line.notes ?? "",
      }))
    );
    setPrefillForPo(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchedPendingLines, prefillForPo]);

  function handleTypeChange(next: "PO" | "Freight") {
    setValue("invoiceType", next);
    setValue("purchaseOrder", null);
    setValue("items", []);
  }

  function handleSupplierChange(next: number) {
    setValue("supplier", next);
    if (invoiceType === "PO") {
      setValue("purchaseOrder", null);
      setValue("items", []);
    }
  }

  function handleSelectPO(poId: number) {
    setValue("purchaseOrder", poId);
    setValue("items", []);
    setPrefillForPo(poId);
  }

  const onSubmit = async (values: PurchaseInvoiceFormValues) => {
    try {
      if (isCreate) {
        await createMutation.mutateAsync(values);
      } else {
        await updateMutation.mutateAsync({ id: Number(invoiceNo), values });
      }
    } catch (error) {
      showApiErrorPopup("Could not save the Purchase Invoice", error);
      return;
    }
    message.success("Saved Successfully");
    navigate("/purchase/invoice");
  };

  const poOptions = posForSupplier.map((po) => ({ value: po.id, label: `${po.poNumber} (${po.poDate})` }));
  if (existing?.purchaseOrder && !poOptions.some((o) => o.value === existing.purchaseOrder)) {
    poOptions.push({ value: existing.purchaseOrder, label: existing.poNumber ?? String(existing.purchaseOrder) });
  }

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      {!isCreate && existing && (
        <div style={{ display: "flex", gap: 24 }}>
          <Form.Item label="Invoice No.">
            <Input value={existing.invoiceNumber} disabled />
          </Form.Item>
          <Form.Item label="Status">
            <Input value={existing.status} disabled />
          </Form.Item>
        </div>
      )}

      <Form.Item label="Invoice Type">
        <Radio.Group
          disabled={readOnly || !isCreate}
          value={invoiceType}
          onChange={(e) => handleTypeChange(e.target.value)}
          options={[
            { value: "PO", label: "Purchase Order Based" },
            { value: "Freight", label: "Freight (standalone, service at its own GST rate)" },
          ]}
        />
      </Form.Item>

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
                options={parties
                  .filter((p: any) => isUsableSupplier(p) || p.id === field.value)
                  .map((p: any) => ({ value: p.id, label: `${p.partyCode} - ${p.partyName}` }))}
              />
            )}
          />
        </Form.Item>
        {invoiceType === "PO" && (
          <Form.Item label="Purchase Order (Approved, with pending qty)" style={{ flex: 2 }}>
            <Select
              disabled={readOnly || !isCreate || !supplierId}
              placeholder={supplierId ? "Select PO" : "Select a supplier first"}
              showSearch
              optionFilterProp="label"
              value={purchaseOrderId ?? undefined}
              options={poOptions}
              onChange={handleSelectPO}
            />
          </Form.Item>
        )}
        <Form.Item label="Invoice Date" style={{ flex: 1 }}>
          <Controller name="invoiceDate" control={control} render={dateInput(readOnly)} />
        </Form.Item>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", columnGap: 24 }}>
        <Form.Item label="Party Bill No.">
          <Controller name="supplierInvoiceNo" control={control} render={({ field }) => <Input {...field} disabled={readOnly} />} />
        </Form.Item>
        <Form.Item label="Party Bill Date">
          <Controller name="supplierInvoiceDate" control={control} render={dateInput(readOnly)} />
        </Form.Item>
        <Form.Item label="Inward No.">
          <Controller name="inwardNo" control={control} render={({ field }) => <Input {...field} disabled={readOnly} />} />
        </Form.Item>
        <Form.Item label="Inward Date">
          <Controller name="inwardDate" control={control} render={dateInput(readOnly, true)} />
        </Form.Item>
        <Form.Item label="Purchase Type">
          <Controller name="purchaseType" control={control} render={({ field }) => <Input {...field} disabled={readOnly} />} />
        </Form.Item>
        <Form.Item label="Due Date">
          <Controller name="dueDate" control={control} render={dateInput(readOnly, true)} />
        </Form.Item>
        <Form.Item label="Payment Terms">
          <Controller name="paymentTerms" control={control} render={({ field }) => <Input {...field} disabled={readOnly} />} />
        </Form.Item>
      </div>

      <Divider>Items</Divider>
      <Controller
        name="items"
        control={control}
        render={({ field }) => (
          <PIItemEntryGrid
            mode={invoiceType}
            value={field.value as PIItemRow[]}
            onChange={field.onChange}
            pendingQtyByPoItem={pendingQtyByPoItem}
            itemOptions={itemOptions}
            godownOptions={godownOptions}
            taxContext={taxContext}
            readOnly={readOnly}
          />
        )}
      />

      <Divider />
      <Form.Item label="Remarks">
        <Controller name="remarks" control={control} render={({ field }) => <Input.TextArea {...field} disabled={readOnly} />} />
      </Form.Item>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Button onClick={() => navigate("/purchase/invoice")}>{readOnly ? "Close" : "Cancel"}</Button>
        {!readOnly && (
          <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
            Save Changes
          </Button>
        )}
      </div>
    </Form>
  );
}
