// src/features/sales/salesReturn/SalesReturnFormPage.tsx
//
// BRD 6.4.8 Sales Return: goods coming back against an invoice. Lines come
// from the invoice (up to what is still returnable), taxed as on the
// invoice; stock goes back into the chosen godown. Refunds are tracked as
// Unpaid / Partially Refunded / Refunded. The GST credit is given through a
// Credit Note linked to this return.

import { useEffect, useMemo } from "react";
import { Alert, AutoComplete, Button, DatePicker, Divider, Form, Input, InputNumber, Select, Space, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dayjs from "dayjs";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { showApiErrorPopup } from "../../../lib/apiError";
import { useLineTaxContext } from "../../../lib/gst/lineTax";
import { usePartiesQuery } from "../../parties/api";
import { invoiceApi } from "../invoice/api";
import { invoiceBuyerState, type SalesInvoice, type SalesInvoiceLine } from "../invoice/types";
import { StatusTag, money, showFormErrors, today, useGodownOptions, type CustomerParty } from "../shared/components";
import { PricedDocumentBody, type PricedBodyValues } from "../shared/PricedDocumentBody";
import { newRowKey } from "../shared/SalesLineGrid";
import { PRICED_DEFAULTS, cleanCustomFields, linesFromServer, pricedDocumentShape, pricedFromServer, usePricedPreview } from "../shared/schema";
import { salesReturnApi } from "./api";
import { RETURN_REASONS, type SalesReturnLine } from "./types";

const returnSchema = z.object({
  ...pricedDocumentShape,
  salesInvoice: z.number({ error: "Select the invoice being returned against" }),
  returnDate: z.string().min(1, "Return date is required"),
  reason: z.string().default(""),
  paymentTerms: z.string().default(""),
  dueDate: z.string().nullable().default(null),
  amountRefunded: z.coerce.number().nonnegative().default(0),
});

type FormInput = z.input<typeof returnSchema>;
type FormValues = z.output<typeof returnSchema>;
type Row = SalesReturnLine & Record<string, unknown>;

const EMPTY: FormInput = {
  ...PRICED_DEFAULTS,
  customer: undefined as unknown as number,
  salesInvoice: undefined as unknown as number,
  returnDate: today(),
  reason: "",
  paymentTerms: "",
  dueDate: null,
  amountRefunded: 0,
};

export function SalesReturnFormPage({ readOnly: readOnlyProp = false }: { readOnly?: boolean }) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isCreate = !id;
  const navigate = useNavigate();

  const { data: existing } = salesReturnApi.useOne(id);
  const { data: invoices = [] } = invoiceApi.useList({ status: "Active" }, isCreate);
  const { data: parties = [] } = usePartiesQuery();
  const { options: godownOptions } = useGodownOptions();
  const createMutation = salesReturnApi.useCreate();
  const updateMutation = salesReturnApi.useUpdate();
  const customers = parties as unknown as CustomerParty[];

  const readOnly = readOnlyProp || existing?.status === "Cancelled";

  const { control, handleSubmit, reset, setValue, watch, formState } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(returnSchema),
    defaultValues: EMPTY,
  });
  const errors = formState.errors;
  const values = watch();

  const { data: invoice } = invoiceApi.useOne(values.salesInvoice ?? existing?.salesInvoice);
  const customer = customers.find((p) => p.id === (invoice?.customer ?? values.customer));
  const buyerState = invoiceBuyerState(invoice, customer);
  const taxContext = useLineTaxContext(buyerState);
  const pricingExtra = { export: invoice?.invoiceType === "Export", zeroRated: invoice?.invoiceType === "Export" && !invoice.exportWithIgst };
  const priced = usePricedPreview(values as unknown as PricedBodyValues<Row>, buyerState, taxContext, pricingExtra);

  useEffect(() => {
    if (!existing) return;
    reset({
      ...EMPTY,
      ...pricedFromServer(existing as unknown as Record<string, unknown>),
      items: linesFromServer(existing.items) as Row[],
      customer: existing.customer,
      salesInvoice: existing.salesInvoice,
      returnDate: existing.returnDate,
      reason: existing.reason,
      paymentTerms: existing.paymentTerms,
      dueDate: existing.dueDate,
      amountRefunded: Number(existing.amountRefunded),
    });
  }, [existing, reset]);

  const invoiceOptions = useMemo(
    () =>
      invoices
        .filter((i) => i.invoiceType !== "Proforma")
        .map((i) => ({ value: i.id, label: `${i.invoiceNumber} - ${i.customerName} (${i.invoiceDate})` })),
    [invoices]
  );

  async function applyInvoice(invoiceId: number | undefined) {
    setValue("salesInvoice", invoiceId as number, { shouldValidate: formState.isSubmitted });
    if (!invoiceId) {
      setValue("items", []);
      return;
    }
    const inv = invoices.find((i) => i.id === invoiceId) ?? (await invoiceApi.fetchPath<SalesInvoice>(`${invoiceId}/`));
    setValue("customer", inv.customer);
    setValue("placeOfSupply", inv.placeOfSupply ?? "");
    const lines = await invoiceApi.fetchPath<SalesInvoiceLine[]>(`${invoiceId}/returnable-lines/`);
    setValue(
      "items",
      lines.map((l) => ({
        invoiceItem: l.id!,
        item: l.item,
        itemCode: l.itemCode,
        description: l.description,
        uom: l.uom,
        hsnSac: l.hsnSac,
        quantity: Number(l.returnableQty),
        maxQty: Number(l.returnableQty),
        rate: Number(l.rate),
        // Percent carries over to a part-quantity; a fixed amount wouldn't.
        discountPercent: Number(l.discountPercent),
        discountAmount: 0,
        tax: l.tax,
        godown: l.godown,
        _rowKey: newRowKey(),
      })) as Row[]
    );
    if (!lines.length) message.info("Everything on this invoice has already been returned.");
  }

  // ?invoice=<id> from the invoice screens.
  const invoiceParam = searchParams.get("invoice");
  useEffect(() => {
    if (isCreate && invoiceParam && !values.salesInvoice) applyInvoice(Number(invoiceParam));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceParam]);

  const setField = (name: string, value: unknown) =>
    setValue(name as keyof FormInput, value as never, { shouldDirty: true, shouldValidate: formState.isSubmitted });
  const rows = (values.items ?? []) as Row[];

  async function onSubmit(formValues: FormValues) {
    const payload = {
      ...cleanCustomFields(formValues),
      priceIncludesTax: false,
      items: formValues.items.map(({ maxQty: _m, ...l }) => l),
    };
    let saved;
    try {
      saved = isCreate
        ? await createMutation.mutateAsync(payload as never)
        : await updateMutation.mutateAsync({ id: Number(id), values: payload as never });
    } catch (error) {
      showApiErrorPopup("Could not save the Sales Return", error);
      return;
    }
    message.success(`Sales Return ${saved.returnNumber} saved - stock updated`);
    navigate("/sales/return");
  }

  const godownColumn: ColumnsType<Row> = [
    {
      title: "Back into Godown",
      key: "godown",
      render: (_, r, i) =>
        readOnly ? (r.godownName ?? "-") : (
          <Select
            style={{ width: 140 }}
            allowClear
            placeholder="As invoiced"
            value={r.godown ?? undefined}
            options={godownOptions}
            onChange={(v) => setField("items", rows.map((x, j) => (j === i ? { ...x, godown: v ?? null } : x)))}
          />
        ),
    },
  ];

  const balance = priced.totals.netAmount - Number(values.amountRefunded ?? 0);

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit, showFormErrors)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>
          {isCreate ? "New Sales Return" : `Sales Return ${existing?.returnNumber ?? ""}`} {existing && <StatusTag status={existing.status} />}
        </h2>
        {existing && existing.status !== "Cancelled" && (
          <Space>
            <Button onClick={() => navigate(`/sales/credit-note/new?invoice=${existing.salesInvoice}&return=${existing.id}`)}>Issue Credit Note</Button>
          </Space>
        )}
      </div>
      {existing?.status === "Cancelled" && (
        <Alert type="error" showIcon style={{ marginBottom: 16 }} title={`Cancelled${existing.cancelReason ? ` - ${existing.cancelReason}` : ""}. The returned stock has been taken back out.`} />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", columnGap: 24 }}>
        <Form.Item label="Against Invoice" required style={{ gridColumn: "span 2" }} validateStatus={errors.salesInvoice ? "error" : undefined} help={errors.salesInvoice?.message}>
          <Select
            showSearch
            optionFilterProp="label"
            disabled={readOnly || !isCreate}
            placeholder="Active tax invoices"
            value={values.salesInvoice ?? undefined}
            onChange={applyInvoice}
            options={isCreate ? invoiceOptions : [{ value: existing?.salesInvoice, label: existing?.invoiceNumber }]}
          />
        </Form.Item>
        <Form.Item label="Customer">
          <Input disabled value={customer ? `${customer.partyCode} - ${customer.partyName}` : invoice?.customerName ?? ""} />
        </Form.Item>
        <Form.Item label="Return Date" required validateStatus={errors.returnDate ? "error" : undefined} help={errors.returnDate?.message}>
          <Controller
            name="returnDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                style={{ width: "100%" }}
                disabled={readOnly}
                disabledDate={(d) => !!invoice && d.isBefore(dayjs(invoice.invoiceDate), "day")}
                value={field.value ? dayjs(field.value) : null}
                onChange={(d) => field.onChange(d ? d.format("YYYY-MM-DD") : "")}
              />
            )}
          />
        </Form.Item>
        <Form.Item label="Reason" style={{ gridColumn: "span 2" }}>
          <Controller
            name="reason"
            control={control}
            render={({ field }) => <AutoComplete {...field} disabled={readOnly} options={RETURN_REASONS} placeholder="Select or type" />}
          />
        </Form.Item>
        <Form.Item label="Payment Terms">
          <Controller name="paymentTerms" control={control} render={({ field }) => <Input {...field} disabled={readOnly} />} />
        </Form.Item>
        <Form.Item label="Refund Due Date">
          <Controller
            name="dueDate"
            control={control}
            render={({ field }) => (
              <DatePicker style={{ width: "100%" }} disabled={readOnly} value={field.value ? dayjs(field.value) : null} onChange={(d) => field.onChange(d ? d.format("YYYY-MM-DD") : null)} />
            )}
          />
        </Form.Item>
      </div>
      {invoice && (
        <div style={{ color: "#6b6b6b", marginBottom: 8 }}>
          Invoice {invoice.invoiceNumber} dated {invoice.invoiceDate}, ₹{money(invoice.netAmount)} - lines are taxed as on the invoice.
        </div>
      )}

      <PricedDocumentBody<Row>
        values={{ ...(values as unknown as PricedBodyValues<Row>), priceIncludesTax: false }}
        setField={setField}
        buyerState={buyerState}
        taxContext={taxContext}
        readOnly={readOnly}
        itemsError={errors.items?.message ?? errors.items?.root?.message}
        pricingExtra={pricingExtra}
        gridProps={{
          canAddItems: false,
          quantityMax: (r) => r.maxQty,
          trailingColumns: godownColumn,
        }}
      />

      <Divider titlePlacement="start">Refund</Divider>
      <div style={{ display: "flex", gap: 24, alignItems: "end" }}>
        <Form.Item label="Amount Refunded" extra="Unpaid / Partially Refunded / Refunded follows from this.">
          <Controller
            name="amountRefunded"
            control={control}
            render={({ field }) => (
              <InputNumber style={{ width: 200 }} min={0} max={priced.totals.netAmount} disabled={readOnly} value={Number(field.value)} onChange={(v) => field.onChange(v ?? 0)} />
            )}
          />
        </Form.Item>
        <Form.Item label="Balance to refund">
          <strong style={{ fontSize: 16 }}>₹{money(balance)}</strong>
        </Form.Item>
      </div>

      <Divider />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Button onClick={() => navigate("/sales/return")}>{readOnly ? "Close" : "Cancel"}</Button>
        {!readOnly && (
          <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending} disabled={!rows.length}>
            Save Return
          </Button>
        )}
      </div>
    </Form>
  );
}
