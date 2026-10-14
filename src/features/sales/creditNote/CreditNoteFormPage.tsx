// src/features/sales/creditNote/CreditNoteFormPage.tsx
//
// BRD 6.4.9 Credit Note (CGST Act s.34): always against an invoice. For a
// sales return it links the return and copies its lines; for a discount /
// price correction / deficiency, pick the invoice lines being credited and
// enter the credit. Must be issued by 30 Nov after the invoice's FY ends.
// B2B credit notes are e-invoiced like invoices.

import { useEffect, useMemo } from "react";
import { Alert, Button, DatePicker, Divider, Form, Input, InputNumber, Select, message } from "antd";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dayjs from "dayjs";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { showApiErrorPopup } from "../../../lib/apiError";
import { useLineTaxContext } from "../../../lib/gst/lineTax";
import { usePartiesQuery } from "../../parties/api";
import { useCompanySettingsQuery } from "../../settings/api";
import { invoiceApi } from "../invoice/api";
import { invoiceBuyerState, type SalesInvoice } from "../invoice/types";
import { salesReturnApi } from "../salesReturn/api";
import type { SalesReturn } from "../salesReturn/types";
import { EInvoicePanel } from "../shared/compliance";
import { StatusTag, money, showFormErrors, today, type CustomerParty } from "../shared/components";
import { PricedDocumentBody, type PricedBodyValues } from "../shared/PricedDocumentBody";
import { newLineFor, newRowKey, type SalesItemOption } from "../shared/SalesLineGrid";
import { PRICED_DEFAULTS, cleanCustomFields, linesFromServer, pricedDocumentShape, pricedFromServer, usePricedPreview } from "../shared/schema";
import { creditNoteApi } from "./api";
import { CREDIT_NOTE_REASONS, creditNoteDeadline, type CreditNoteLine } from "./types";

const creditNoteSchema = z
  .object({
    ...pricedDocumentShape,
    salesInvoice: z.number({ error: "Select the invoice being credited" }),
    salesReturn: z.number().nullable().default(null),
    creditNoteDate: z.string().min(1, "Credit note date is required"),
    reason: z.enum(["SalesReturn", "PostSaleDiscount", "PriceCorrection", "DeficiencyInService", "Other"]),
    paymentTerms: z.string().default(""),
    amountRefunded: z.coerce.number().nonnegative().default(0),
  })
  .superRefine((v, ctx) => {
    if (v.reason === "SalesReturn" && !v.salesReturn) {
      ctx.addIssue({ code: "custom", path: ["salesReturn"], message: "Select the Sales Return this credit note is for" });
    }
  });

type FormInput = z.input<typeof creditNoteSchema>;
type FormValues = z.output<typeof creditNoteSchema>;
type Row = CreditNoteLine & Record<string, unknown>;

const EMPTY: FormInput = {
  ...PRICED_DEFAULTS,
  customer: undefined as unknown as number,
  salesInvoice: undefined as unknown as number,
  salesReturn: null,
  creditNoteDate: today(),
  reason: "PriceCorrection",
  paymentTerms: "",
  amountRefunded: 0,
};

export function CreditNoteFormPage({ readOnly: readOnlyProp = false }: { readOnly?: boolean }) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isCreate = !id;
  const navigate = useNavigate();

  const { data: existing } = creditNoteApi.useOne(id);
  const { data: invoices = [] } = invoiceApi.useList({ status: "Active" }, isCreate);
  const { data: parties = [] } = usePartiesQuery();
  const { data: settings } = useCompanySettingsQuery();
  const createMutation = creditNoteApi.useCreate();
  const updateMutation = creditNoteApi.useUpdate();
  const customers = parties as unknown as CustomerParty[];

  const locked = !!existing && (existing.status === "Cancelled" || existing.einvoiceStatus === "Generated");
  const readOnly = readOnlyProp || locked;

  const { control, handleSubmit, reset, setValue, watch, formState } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(creditNoteSchema),
    defaultValues: EMPTY,
  });
  const errors = formState.errors;
  const values = watch();

  const invoiceId = values.salesInvoice ?? existing?.salesInvoice;
  const { data: invoice } = invoiceApi.useOne(invoiceId);
  const { data: returns = [] } = salesReturnApi.useList({ sales_invoice: invoiceId }, !!invoiceId);
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
      salesReturn: existing.salesReturn,
      creditNoteDate: existing.creditNoteDate,
      reason: existing.reason,
      paymentTerms: existing.paymentTerms,
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

  async function applyInvoice(nextId: number | undefined) {
    setValue("salesInvoice", nextId as number, { shouldValidate: formState.isSubmitted });
    setValue("salesReturn", null);
    setValue("items", []);
    if (!nextId) return;
    const inv = invoices.find((i) => i.id === nextId) ?? (await invoiceApi.fetchPath<SalesInvoice>(`${nextId}/`));
    setValue("customer", inv.customer);
    setValue("placeOfSupply", inv.placeOfSupply ?? "");
  }

  function linesFromReturn(ret: SalesReturn): Row[] {
    return linesFromServer(ret.items).map((l) => ({
      invoiceItem: l.invoiceItem,
      item: l.item,
      itemCode: l.itemCode,
      description: l.description,
      uom: l.uom,
      hsnSac: l.hsnSac,
      quantity: l.quantity,
      rate: l.rate,
      discountPercent: l.discountPercent,
      discountAmount: l.discountAmount,
      tax: l.tax,
      _rowKey: newRowKey(),
    })) as Row[];
  }

  function applyReturn(returnId: number | null, ret = returns.find((r) => r.id === returnId)) {
    setValue("salesReturn", returnId, { shouldValidate: formState.isSubmitted });
    if (ret) {
      setValue("items", linesFromReturn(ret));
      setValue("charges", pricedFromServer(ret as unknown as Record<string, unknown>).charges);
    }
  }

  // ?invoice=<id>&return=<id> from the invoice / return screens.
  const invoiceParam = searchParams.get("invoice");
  const returnParam = searchParams.get("return");
  useEffect(() => {
    if (isCreate && invoiceParam && !values.salesInvoice) {
      applyInvoice(Number(invoiceParam));
      if (returnParam) setValue("reason", "SalesReturn");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceParam]);
  useEffect(() => {
    if (isCreate && returnParam && !values.salesReturn) {
      const ret = returns.find((r) => r.id === Number(returnParam));
      if (ret) applyReturn(ret.id, ret);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returns]);

  // Add a line of the original invoice being credited (price correction etc.).
  function addInvoiceLine(invoiceItemId: number) {
    const line = invoice?.items.find((l) => l.id === invoiceItemId);
    if (!line) return;
    setValue("items", [
      ...((values.items ?? []) as Row[]),
      {
        invoiceItem: line.id!,
        item: line.item,
        itemCode: line.itemCode,
        description: line.description,
        uom: line.uom,
        hsnSac: line.hsnSac,
        quantity: Number(line.quantity),
        rate: 0, // the credit per unit - the user enters it
        discountPercent: 0,
        discountAmount: 0,
        tax: line.tax,
        _rowKey: newRowKey(),
      } as Row,
    ]);
  }

  const setField = (name: string, value: unknown) =>
    setValue(name as keyof FormInput, value as never, { shouldDirty: true, shouldValidate: formState.isSubmitted });

  const deadline = invoice ? existing?.gstDeadline ?? creditNoteDeadline(invoice.invoiceDate, settings?.financialYearStartMonth ?? 4) : null;
  const pastDeadline = !!deadline && values.creditNoteDate > deadline;
  const fromReturn = values.reason === "SalesReturn";

  async function onSubmit(formValues: FormValues) {
    const payload = { ...cleanCustomFields(formValues), salesReturn: fromReturn ? formValues.salesReturn : null };
    let saved;
    try {
      saved = isCreate
        ? await createMutation.mutateAsync(payload as never)
        : await updateMutation.mutateAsync({ id: Number(id), values: payload as never });
    } catch (error) {
      showApiErrorPopup("Could not save the Credit Note", error);
      return;
    }
    message.success(`Credit Note ${saved.creditNoteNumber} saved`);
    navigate(`/sales/credit-note/${saved.id}/view`);
  }

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit, showFormErrors)}>
      <h2 style={{ marginTop: 0 }}>
        {isCreate ? "New Credit Note" : `Credit Note ${existing?.creditNoteNumber ?? ""}`} {existing && <StatusTag status={existing.status} />}
      </h2>
      {existing?.status === "Cancelled" && (
        <Alert type="error" showIcon style={{ marginBottom: 16 }} title={`Cancelled${existing.cancelReason ? ` - ${existing.cancelReason}` : ""}.`} />
      )}
      {existing && <EInvoicePanel resource="credit-notes" doc={existing} number={existing.creditNoteNumber} />}

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
        <Form.Item label="Credit Note Date" required validateStatus={pastDeadline ? "error" : undefined} help={pastDeadline ? `Past the GST deadline (${deadline})` : undefined}>
          <Controller
            name="creditNoteDate"
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
        <Form.Item label="Reason" required style={{ gridColumn: "span 2" }}>
          <Controller
            name="reason"
            control={control}
            render={({ field }) => (
              <Select
                disabled={readOnly}
                value={field.value}
                options={CREDIT_NOTE_REASONS}
                onChange={(v) => {
                  field.onChange(v);
                  if (v !== "SalesReturn" && values.salesReturn) {
                    setValue("salesReturn", null);
                    setValue("items", []);
                  }
                }}
              />
            )}
          />
        </Form.Item>
        {fromReturn && (
          <Form.Item label="Sales Return" required validateStatus={errors.salesReturn ? "error" : undefined} help={errors.salesReturn?.message}>
            <Select
              allowClear
              disabled={readOnly || !invoiceId}
              placeholder={invoiceId ? "Returns against this invoice" : "Select the invoice first"}
              value={values.salesReturn ?? undefined}
              onChange={(v) => applyReturn(v ?? null)}
              options={returns.filter((r) => r.status !== "Cancelled").map((r) => ({ value: r.id, label: `${r.returnNumber} (${r.returnDate}) ₹${money(r.netAmount)}` }))}
            />
          </Form.Item>
        )}
        <Form.Item label="Payment Terms">
          <Controller name="paymentTerms" control={control} render={({ field }) => <Input {...field} disabled={readOnly} />} />
        </Form.Item>
      </div>

      {invoice && deadline && (
        <Alert
          type={pastDeadline ? "error" : "info"}
          showIcon
          style={{ marginBottom: 12 }}
          title={
            pastDeadline
              ? `A GST credit note for invoice ${invoice.invoiceNumber} had to be issued by ${dayjs(deadline).format("DD MMM YYYY")} (CGST Act s.34). Give a commercial credit without GST instead.`
              : `Invoice ${invoice.invoiceNumber} (${invoice.invoiceDate}, ₹${money(invoice.netAmount)}). A GST credit note against it can be issued until ${dayjs(deadline).format("DD MMM YYYY")}.`
          }
        />
      )}

      {!readOnly && !fromReturn && invoice && (
        <Select
          style={{ width: 420, marginTop: 8 }}
          showSearch
          optionFilterProp="label"
          placeholder="Add a line from the invoice (enter the credit per unit)"
          value={null}
          onChange={addInvoiceLine}
          options={invoice.items.map((l) => ({ value: l.id!, label: `${l.itemCode} - ${l.description} · qty ${Number(l.quantity)} @ ${money(l.rate)}` }))}
        />
      )}

      <PricedDocumentBody<Row>
        values={values as unknown as PricedBodyValues<Row>}
        setField={setField}
        buyerState={buyerState}
        taxContext={taxContext}
        readOnly={readOnly}
        itemsError={errors.items?.message ?? errors.items?.root?.message}
        pricingExtra={pricingExtra}
        gridProps={{
          canAddItems: !fromReturn && !!invoice,
          makeRow: (item: SalesItemOption) => ({ ...newLineFor(item, taxContext), invoiceItem: null }) as Row,
        }}
      />

      <Divider titlePlacement="start">Refund</Divider>
      <div style={{ display: "flex", gap: 24, alignItems: "end" }}>
        <Form.Item label="Amount Refunded" extra="Leave 0 if the credit is adjusted against future invoices.">
          <Controller
            name="amountRefunded"
            control={control}
            render={({ field }) => (
              <InputNumber style={{ width: 200 }} min={0} max={priced.totals.netAmount} disabled={readOnly} value={Number(field.value)} onChange={(v) => field.onChange(v ?? 0)} />
            )}
          />
        </Form.Item>
        <Form.Item label="Balance">
          <strong style={{ fontSize: 16 }}>₹{money(priced.totals.netAmount - Number(values.amountRefunded ?? 0))}</strong>
        </Form.Item>
      </div>

      <Divider />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Button onClick={() => navigate("/sales/credit-note")}>{readOnly ? "Close" : "Cancel"}</Button>
        {!readOnly && (
          <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending} disabled={pastDeadline}>
            Save Credit Note
          </Button>
        )}
      </div>
    </Form>
  );
}
