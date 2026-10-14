// src/features/debitNotes/DebitNoteFormPage.tsx

import { useEffect, useMemo, useState } from "react";
import { Button, DatePicker, Divider, Form, Input, InputNumber, Select, Tag, message } from "antd";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";
import {
  useCreateDebitNoteMutation,
  useDebitNoteQuery,
  useLinkableInvoicesQuery,
  useUpdateDebitNoteMutation,
} from "./api";
import { debitNoteSchema, type DNItemRow, type DebitNoteFormInput, type DebitNoteFormValues } from "./schema";
import { DNItemEntryGrid, type DNItemOption } from "./DNItemEntryGrid";
import { usePartiesQuery } from "../parties/api"; // adjust to actual export name
import { useItemsQuery } from "../items/api"; // adjust to actual export name
import { usePurchaseInvoiceQuery } from "../purchaseInvoices/api";
import { REFUND_STATUS_COLOR } from "../purchaseReturns/refundStatus";
import { useLineTaxContext } from "../../lib/gst/lineTax";
import { showApiErrorPopup } from "../../lib/apiError";

export function DebitNoteFormPage({ readOnly = false }: { readOnly?: boolean }) {
  const { debitNoteNo } = useParams();
  const isCreate = !debitNoteNo;
  const navigate = useNavigate();

  const { data: existing } = useDebitNoteQuery(debitNoteNo);
  const { data: parties = [] } = usePartiesQuery();
  const { data: items = [] } = useItemsQuery();
  const createMutation = useCreateDebitNoteMutation();
  const updateMutation = useUpdateDebitNoteMutation();

  const itemOptions: DNItemOption[] = useMemo(
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

  const { control, handleSubmit, setValue, watch, reset } = useForm<
    DebitNoteFormInput,
    unknown,
    DebitNoteFormValues
  >({
    resolver: zodResolver(debitNoteSchema),
    defaultValues: {
      purchaseInvoice: null,
      supplier: undefined as unknown as number,
      debitNoteDate: dayjs().format("YYYY-MM-DD"),
      reason: "",
      remarks: "",
      amountRefunded: 0,
      items: [],
    },
  });

  useEffect(() => {
    if (existing) reset({ ...existing, amountRefunded: Number(existing.amountRefunded) });
  }, [existing, reset]);

  const supplierId = watch("supplier");
  const linkedInvoiceId = watch("purchaseInvoice");
  const { data: linkableInvoices = [] } = useLinkableInvoicesQuery(supplierId);

  // Picking an invoice auto-fetches its lines into the grid (BRD 6.5.5.2).
  // Only fires for a freshly picked invoice, never for the one an existing
  // note was loaded with - that would overwrite its saved lines.
  const [invoiceToPrefill, setInvoiceToPrefill] = useState<number | null>(null);
  const { data: invoiceToPrefillData } = usePurchaseInvoiceQuery(
    invoiceToPrefill ? String(invoiceToPrefill) : undefined
  );
  useEffect(() => {
    if (!invoiceToPrefillData || invoiceToPrefillData.id !== invoiceToPrefill) return;
    setValue(
      "items",
      invoiceToPrefillData.items.map((line) => ({
        invoiceItem: line.id ?? null,
        item: line.item,
        itemCode: line.itemCode ?? itemOptions.find((o) => o.id === line.item)?.itemCode ?? "",
        description: line.description,
        uom: line.uom,
        hsnSac: line.hsnSac,
        quantity: Number(line.invoicedQty),
        rate: Number(line.rate),
        tax: line.tax, // same tax treatment as the invoice line
      }))
    );
    setInvoiceToPrefill(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceToPrefillData, invoiceToPrefill]);

  function handleSelectInvoice(invoiceId: number | null) {
    setValue("purchaseInvoice", invoiceId);
    if (!invoiceId) {
      // Unlinking drops the rows that came from the invoice; manual rows stay.
      setValue("items", ((watch("items") ?? []) as DNItemRow[]).filter((row) => row.invoiceItem == null));
      return;
    }
    const inv = linkableInvoices.find((i) => i.id === invoiceId);
    if (inv) setValue("supplier", inv.supplier);
    setInvoiceToPrefill(invoiceId);
  }

  const supplierState = useMemo(
    () => (parties.find((p: any) => p.id === supplierId) as any)?.state ?? "",
    [parties, supplierId]
  );
  const taxContext = useLineTaxContext(supplierState);

  // Estimated net for the Balance display; the server recalculates on save
  // and caps the refund at the real net amount.
  const rows = (watch("items") ?? []) as DNItemRow[];
  const previewNet = rows.reduce(
    (sum, row) => sum + taxContext.preview({ qty: Number(row.quantity), rate: Number(row.rate), taxId: row.tax }).lineTotal,
    0
  );
  const netAmount = readOnly && existing ? Number(existing.netAmount) : previewNet;
  const amountRefunded = Number(watch("amountRefunded") ?? 0);

  const onSubmit = async (values: DebitNoteFormValues) => {
    try {
      if (isCreate) {
        await createMutation.mutateAsync(values);
      } else {
        await updateMutation.mutateAsync({ id: Number(debitNoteNo), values });
      }
    } catch (error) {
      showApiErrorPopup("Could not save the Debit Note", error);
      return;
    }
    message.success("Saved Successfully");
    navigate("/purchase/debit-note");
  };

  const invoiceOptions = linkableInvoices.map((inv) => ({ value: inv.id, label: `${inv.invoiceNumber} (${inv.invoiceDate})` }));
  if (existing?.purchaseInvoice && !invoiceOptions.some((o) => o.value === existing.purchaseInvoice)) {
    invoiceOptions.push({ value: existing.purchaseInvoice, label: existing.invoiceNumber ?? String(existing.purchaseInvoice) });
  }

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      {!isCreate && existing && (
        <div style={{ display: "flex", gap: 24, alignItems: "flex-end" }}>
          <Form.Item label="Debit Note No.">
            <Input value={existing.debitNoteNumber} disabled />
          </Form.Item>
          <Form.Item label="Status">
            <Tag color={REFUND_STATUS_COLOR[existing.status] ?? "default"}>{existing.status}</Tag>
          </Form.Item>
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
                disabled={readOnly || !isCreate || !!linkedInvoiceId}
                showSearch
                optionFilterProp="label"
                options={parties.map((p: any) => ({ value: p.id, label: `${p.partyCode} - ${p.partyName}` }))}
              />
            )}
          />
        </Form.Item>
        <Form.Item label="Link to Purchase Invoice (optional)" style={{ flex: 2 }}>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            disabled={readOnly || !isCreate}
            placeholder="Standalone Debit Note if left blank"
            value={linkedInvoiceId ?? undefined}
            options={invoiceOptions}
            onChange={(v) => handleSelectInvoice(v ?? null)}
          />
        </Form.Item>
        <Form.Item label="Debit Note Date" style={{ flex: 1 }}>
          <Controller
            name="debitNoteDate"
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
      <Controller
        name="items"
        control={control}
        render={({ field }) => (
          <DNItemEntryGrid
            value={field.value as DNItemRow[]}
            onChange={field.onChange}
            itemOptions={itemOptions}
            taxContext={taxContext}
            readOnly={readOnly}
          />
        )}
      />

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
        <Button onClick={() => navigate("/purchase/debit-note")}>{readOnly ? "Close" : "Cancel"}</Button>
        {!readOnly && (
          <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
            Save Changes
          </Button>
        )}
      </div>
    </Form>
  );
}
