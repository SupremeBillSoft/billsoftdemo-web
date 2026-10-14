// src/features/purchaseReturns/PurchaseReturnFormPage.tsx

import { useEffect, useMemo } from "react";
import { Button, DatePicker, Divider, Form, Input, InputNumber, Select, Table, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";
import {
  useCreatePurchaseReturnMutation,
  useReturnableInvoiceLinesQuery,
  useReturnableInvoicesQuery,
  usePurchaseReturnQuery,
  useUpdatePurchaseReturnMutation,
} from "./api";
import {
  purchaseReturnSchema,
  type PRetItemRow,
  type PurchaseReturnFormInput,
  type PurchaseReturnFormValues,
} from "./schema";
import { PRetItemEntryGrid } from "./PRetItemEntryGrid";
import { usePartiesQuery } from "../parties/api"; // adjust to actual export name
import { usePurchaseInvoiceQuery } from "../purchaseInvoices/api";
import { useGodownsQuery } from "../inventory/api";
import { useLineTaxContext } from "../../lib/gst/lineTax";
import { showApiErrorPopup } from "../../lib/apiError";
import type { PurchaseReturnItem, ReturnableInvoiceLine } from "./types";
import { REFUND_STATUS_COLOR } from "./refundStatus";

const READONLY_COLUMNS: ColumnsType<PurchaseReturnItem> = [
  { title: "Item", dataIndex: "itemCode" },
  { title: "UOM", dataIndex: "uom" },
  { title: "HSN/SAC", dataIndex: "hsnSac" },
  { title: "Returned Qty", dataIndex: "returnedQty" },
  { title: "Rate", dataIndex: "rate" },
  { title: "Tax Type", dataIndex: "taxName", render: (v?: string | null) => v ?? "-" },
  { title: "Godown", dataIndex: "godownName", render: (v?: string | null) => v ?? "-" },
  { title: "Taxable", dataIndex: "taxableValue", render: (v?: number) => (v != null ? Number(v).toFixed(2) : "-") },
  { title: "CGST", dataIndex: "cgst", render: (v?: number) => (v != null ? Number(v).toFixed(2) : "-") },
  { title: "SGST", dataIndex: "sgst", render: (v?: number) => (v != null ? Number(v).toFixed(2) : "-") },
  { title: "IGST", dataIndex: "igst", render: (v?: number) => (v != null ? Number(v).toFixed(2) : "-") },
  { title: "Line Total", dataIndex: "lineTotal", render: (v?: number) => (v != null ? Number(v).toFixed(2) : "-") },
];

export function PurchaseReturnFormPage({ readOnly = false }: { readOnly?: boolean }) {
  const { returnNo } = useParams();
  const isCreate = !returnNo;
  const navigate = useNavigate();

  const { data: existing } = usePurchaseReturnQuery(returnNo);
  const { data: parties = [] } = usePartiesQuery();
  const { data: godowns = [] } = useGodownsQuery();
  const { data: returnableInvoices = [] } = useReturnableInvoicesQuery();
  const createMutation = useCreatePurchaseReturnMutation();
  const updateMutation = useUpdatePurchaseReturnMutation();

  const { control, handleSubmit, setValue, watch, reset } = useForm<
    PurchaseReturnFormInput,
    unknown,
    PurchaseReturnFormValues
  >({
    resolver: zodResolver(purchaseReturnSchema),
    defaultValues: {
      purchaseInvoice: undefined as unknown as number,
      supplier: undefined as unknown as number,
      returnDate: dayjs().format("YYYY-MM-DD"),
      reason: "",
      remarks: "",
      amountRefunded: 0,
      items: [],
    },
  });

  useEffect(() => {
    if (existing) reset({ ...existing, amountRefunded: Number(existing.amountRefunded) });
  }, [existing, reset]);

  const purchaseInvoiceId = watch("purchaseInvoice");

  // Create: the invoice's still-returnable lines.
  const { data: createModeLines = [] } = useReturnableInvoiceLinesQuery(isCreate ? purchaseInvoiceId || null : null);
  // Edit: every saved return already holds its quantity, so the server's
  // returnableQty excludes what THIS return took - add it back, and keep
  // lines this return fully used up (they'd otherwise vanish from the grid).
  const { data: sourceInvoice } = usePurchaseInvoiceQuery(
    !isCreate && existing ? String(existing.purchaseInvoice) : undefined
  );
  const editModeLines: ReturnableInvoiceLine[] = useMemo(() => {
    if (!sourceInvoice || !existing) return [];
    const heldHere = new Map<number, number>();
    for (const line of existing.items) {
      heldHere.set(line.invoiceItem, (heldHere.get(line.invoiceItem) ?? 0) + Number(line.returnedQty));
    }
    return sourceInvoice.items
      .filter((line) => line.id != null)
      .map((line) => ({
        id: line.id as number,
        item: line.item,
        itemCode: line.itemCode,
        description: line.description,
        uom: line.uom,
        hsnSac: line.hsnSac,
        invoicedQty: Number(line.invoicedQty),
        returnableQty: Number(line.returnableQty ?? 0) + (heldHere.get(line.id as number) ?? 0),
        rate: Number(line.rate),
        tax: line.tax,
        godown: line.godown,
      }))
      .filter((line) => line.returnableQty > 0);
  }, [sourceInvoice, existing]);
  const returnableLines = isCreate ? createModeLines : editModeLines;

  function handleSelectSourceInvoice(invoiceId: number) {
    setValue("purchaseInvoice", invoiceId);
    const inv = returnableInvoices.find((p) => p.id === invoiceId);
    if (inv) setValue("supplier", inv.supplier);
    setValue("items", []);
  }

  const supplierId = watch("supplier");
  const supplierState = useMemo(
    () => (parties.find((p: any) => p.id === supplierId) as any)?.state ?? "",
    [parties, supplierId]
  );
  const taxContext = useLineTaxContext(supplierState);
  const godownOptions = godowns.map((g) => ({ value: g.id, label: g.isMain ? `${g.name} (Main)` : g.name }));

  // Estimated net for the Balance display, using the same preview math as
  // the grid. The server recalculates on save and caps the refund at the
  // real net amount.
  const rows = (watch("items") ?? []) as PRetItemRow[];
  const previewNet = rows.reduce(
    (sum, row) => sum + taxContext.preview({ qty: Number(row.returnedQty), rate: Number(row.rate), taxId: row.tax }).lineTotal,
    0
  );
  const netAmount = readOnly && existing ? Number(existing.netAmount) : previewNet;
  const amountRefunded = Number(watch("amountRefunded") ?? 0);

  const onSubmit = async (values: PurchaseReturnFormValues) => {
    try {
      if (isCreate) {
        await createMutation.mutateAsync(values);
      } else {
        await updateMutation.mutateAsync({ id: Number(returnNo), values });
      }
    } catch (error) {
      showApiErrorPopup("Could not save the Purchase Return", error);
      return;
    }
    message.success("Saved Successfully");
    navigate("/purchase/return");
  };

  const invoiceOptions = returnableInvoices.map((inv) => ({ value: inv.id, label: inv.invoiceNumber }));
  if (existing && !invoiceOptions.some((o) => o.value === existing.purchaseInvoice)) {
    invoiceOptions.push({ value: existing.purchaseInvoice, label: existing.invoiceNumber });
  }

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      {!isCreate && existing && (
        <div style={{ display: "flex", gap: 24, alignItems: "flex-end" }}>
          <Form.Item label="Return No.">
            <Input value={existing.returnNumber} disabled />
          </Form.Item>
          <Form.Item label="Status">
            <Tag color={REFUND_STATUS_COLOR[existing.status] ?? "default"}>{existing.status}</Tag>
          </Form.Item>
        </div>
      )}

      <div style={{ display: "flex", gap: 24 }}>
        <Form.Item label="Source Purchase Invoice (Active, with returnable qty)" style={{ flex: 2 }}>
          <Controller
            name="purchaseInvoice"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                disabled={readOnly || !isCreate}
                showSearch
                optionFilterProp="label"
                options={invoiceOptions}
                onChange={handleSelectSourceInvoice}
              />
            )}
          />
        </Form.Item>
        <Form.Item label="Supplier" style={{ flex: 2 }}>
          <Controller
            name="supplier"
            control={control}
            render={({ field }) => (
              <Select {...field} disabled options={parties.map((p: any) => ({ value: p.id, label: `${p.partyCode} - ${p.partyName}` }))} />
            )}
          />
        </Form.Item>
        <Form.Item label="Return Date" style={{ flex: 1 }}>
          <Controller
            name="returnDate"
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
      </div>

      <Form.Item label="Reason">
        <Controller name="reason" control={control} render={({ field }) => <Input {...field} disabled={readOnly} />} />
      </Form.Item>

      <Divider>Items</Divider>
      {readOnly && existing ? (
        <Table<PurchaseReturnItem> dataSource={existing.items} columns={READONLY_COLUMNS} rowKey={(r, i) => `${r.item}-${i}`} pagination={false} />
      ) : (
        <Controller
          name="items"
          control={control}
          render={({ field }) => (
            <PRetItemEntryGrid
              returnableLines={returnableLines}
              value={field.value as PRetItemRow[]}
              onChange={field.onChange}
              taxContext={taxContext}
              godownOptions={godownOptions}
              readOnly={readOnly}
            />
          )}
        />
      )}

      <Divider>Refund</Divider>
      <div style={{ display: "flex", gap: 24 }}>
        <Form.Item label="Net Amount" style={{ flex: 1 }}>
          <InputNumber style={{ width: "100%" }} value={Number(netAmount.toFixed(2))} disabled />
        </Form.Item>
        <Form.Item label="Amount Refunded" style={{ flex: 1 }}>
          <Controller
            name="amountRefunded"
            control={control}
            render={({ field }) => (
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                disabled={readOnly}
                value={Number(field.value ?? 0)}
                onChange={(v) => field.onChange(v ?? 0)}
              />
            )}
          />
        </Form.Item>
        <Form.Item label="Balance Amount" style={{ flex: 1 }}>
          <InputNumber style={{ width: "100%" }} value={Number((netAmount - amountRefunded).toFixed(2))} disabled />
        </Form.Item>
      </div>

      <Form.Item label="Remarks">
        <Controller name="remarks" control={control} render={({ field }) => <Input.TextArea {...field} disabled={readOnly} />} />
      </Form.Item>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Button onClick={() => navigate("/purchase/return")}>{readOnly ? "Close" : "Cancel"}</Button>
        {!readOnly && (
          <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
            Save Changes
          </Button>
        )}
      </div>
    </Form>
  );
}
