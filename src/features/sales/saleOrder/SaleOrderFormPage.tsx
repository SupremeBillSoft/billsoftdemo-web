// src/features/sales/saleOrder/SaleOrderFormPage.tsx
//
// BRD 6.4.3 Sale Order (Domestic / Export). Can start from a Quotation
// (picker or ?quotation=<id>). Once anything is delivered or invoiced an
// edit becomes an amendment: same number, next revision, reason required.

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, DatePicker, Divider, Form, Input, InputNumber, Radio, Select, Switch, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dayjs from "dayjs";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { showApiErrorPopup } from "../../../lib/apiError";
import { useLineTaxContext } from "../../../lib/gst/lineTax";
import { STATE_OPTIONS } from "../../../lib/states";
import { CURRENCY_OPTIONS } from "../../currency/CurrencyOptions";
import { usePartiesQuery } from "../../parties/api";
import { quotationApi } from "../quotation/api";
import type { Quotation } from "../quotation/types";
import {
  StatusTag,
  customerOptions,
  money,
  showFormErrors,
  today,
  type CustomerParty,
} from "../shared/components";
import { PricedDocumentBody, type PricedBodyValues } from "../shared/PricedDocumentBody";
import { EXPORT_STATE } from "../shared/pricing";
import { newLineFor, newRowKey, type SalesItemOption } from "../shared/SalesLineGrid";
import { PRICED_DEFAULTS, cleanCustomFields, linesFromServer, pricedDocumentShape, pricedFromServer } from "../shared/schema";
import { saleOrderApi } from "./api";
import { SO_TYPE_OPTIONS, type SaleOrderLine, type SaleOrderRevision } from "./types";

const saleOrderSchema = z.object({
  ...pricedDocumentShape,
  soType: z.enum(["Domestic", "Export"]).default("Domestic"),
  soDate: z.string().min(1, "SO date is required"),
  quotation: z.number().nullable().default(null),
  customerPoNo: z.string().default(""),
  customerPoDate: z.string().nullable().default(null),
  validUpto: z.string().nullable().default(null),
  currencyCode: z.string().default("INR"),
  exchangeRate: z.coerce.number().positive("Exchange rate must be greater than 0").default(1),
  advanceReceived: z.coerce.number().nonnegative().default(0),
  advanceMode: z.string().default(""),
  amendmentReason: z.string().default(""),
});

type SaleOrderFormInput = z.input<typeof saleOrderSchema>;
type SaleOrderFormValues = z.output<typeof saleOrderSchema>;
type SORow = SaleOrderLine & Record<string, unknown>;

const EMPTY: SaleOrderFormInput = {
  ...PRICED_DEFAULTS,
  customer: undefined as unknown as number,
  soType: "Domestic",
  soDate: today(),
  quotation: null,
  customerPoNo: "",
  customerPoDate: null,
  validUpto: null,
  currencyCode: "INR",
  exchangeRate: 1,
  advanceReceived: 0,
  advanceMode: "",
  amendmentReason: "",
};

const ADVANCE_MODES = ["Cash", "Bank Transfer", "Cheque", "UPI", "Card"].map((m) => ({ value: m, label: m }));

const MFG_DEFAULTS = { amortisationCost: 0, drawingNo: "", drawingRevision: "", lineNo: "" };

// Lines carried over from a quotation become new order lines.
function linesFromQuotation(quotation: Quotation): SORow[] {
  return linesFromServer(quotation.items).map(({ id: _id, taxableValue: _t, cgst: _c, sgst: _s, igst: _i, cess: _x, lineTotal: _l, ...line }) => ({
    ...line,
    ...MFG_DEFAULTS,
    _rowKey: newRowKey(),
  })) as SORow[];
}

export function SaleOrderFormPage({ readOnly: readOnlyProp = false }: { readOnly?: boolean }) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isCreate = !id;
  const navigate = useNavigate();

  const { data: existing } = saleOrderApi.useOne(id);
  const { data: revisions = [] } = saleOrderApi.useGet<SaleOrderRevision[]>(`${id}/revisions/`, undefined, !!id);
  const { data: quotations = [] } = quotationApi.useList({ status: "Accepted" });
  const { data: parties = [] } = usePartiesQuery();
  const createMutation = saleOrderApi.useCreate();
  const updateMutation = saleOrderApi.useUpdate();
  const [showMfg, setShowMfg] = useState(false);

  const readOnly = readOnlyProp || existing?.status === "Closed";
  const customers = parties as unknown as CustomerParty[];
  const hasFulfilment = !!existing?.items.some((l) => Number(l.deliveredQty) > 0 || Number(l.invoicedQty) > 0);

  const { control, handleSubmit, reset, setValue, watch, formState } = useForm<
    SaleOrderFormInput,
    unknown,
    SaleOrderFormValues
  >({ resolver: zodResolver(saleOrderSchema), defaultValues: EMPTY });
  const errors = formState.errors;

  useEffect(() => {
    if (!existing) return;
    reset({
      ...EMPTY,
      ...pricedFromServer(existing as unknown as Record<string, unknown>),
      items: linesFromServer(existing.items).map((l) => ({ ...l, amortisationCost: Number(l.amortisationCost) })),
      customer: existing.customer,
      soType: existing.soType,
      soDate: existing.soDate,
      quotation: existing.quotation,
      customerPoNo: existing.customerPoNo,
      customerPoDate: existing.customerPoDate,
      validUpto: existing.validUpto,
      currencyCode: existing.currencyCode,
      exchangeRate: Number(existing.exchangeRate),
      advanceReceived: Number(existing.advanceReceived),
      advanceMode: existing.advanceMode,
      amendmentReason: "",
    });
    if (existing.items.some((l) => l.drawingNo || l.lineNo || l.drawingRevision || Number(l.amortisationCost))) setShowMfg(true);
  }, [existing, reset]);

  const values = watch();
  const isExport = values.soType === "Export";
  const customer = customers.find((p) => p.id === values.customer);
  const buyerState = isExport ? EXPORT_STATE : values.placeOfSupply || customer?.state || "";
  const taxContext = useLineTaxContext(buyerState);
  const options = useMemo(
    () => customerOptions(customers, isExport, values.customer),
    [customers, isExport, values.customer]
  );
  const quotationOptions = quotations.filter((q) => !isExport || customers.find((c) => c.id === q.customer)?.isExportCustomer);

  function applyCustomer(partyId: number | undefined) {
    setValue("customer", partyId as number, { shouldValidate: true });
    setValue("placeOfSupply", customers.find((p) => p.id === partyId)?.state ?? "");
  }

  function applyQuotation(quotationId: number | null, quotation = quotations.find((q) => q.id === quotationId)) {
    setValue("quotation", quotationId);
    if (!quotation) return;
    const priced = pricedFromServer(quotation as unknown as Record<string, unknown>);
    applyCustomer(quotation.customer);
    for (const key of ["priceIncludesTax", "docDiscountType", "docDiscountValue", "docDiscountBeforeTax", "roundOffEnabled", "adjustmentAmount", "charges", "remarks"] as const) {
      setValue(key, priced[key] as never);
    }
    if (quotation.placeOfSupply) setValue("placeOfSupply", quotation.placeOfSupply);
    setValue("items", linesFromQuotation(quotation));
  }

  // Started from a Quotation row action.
  const quotationParam = searchParams.get("quotation");
  useEffect(() => {
    if (!isCreate || !quotationParam) return;
    const q = quotations.find((x) => x.id === Number(quotationParam));
    if (q && values.quotation !== q.id) applyQuotation(q.id, q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotations, quotationParam, isCreate]);

  function changeType(soType: "Domestic" | "Export") {
    setValue("soType", soType);
    // Customer eligibility differs (export customers only on Export).
    const party = customers.find((p) => p.id === values.customer);
    if (party && soType === "Export" && !party.isExportCustomer) setValue("customer", undefined as unknown as number);
    if (soType === "Domestic") {
      setValue("currencyCode", "INR");
      setValue("exchangeRate", 1);
    }
  }

  const setField = (name: string, value: unknown) =>
    setValue(name as keyof SaleOrderFormInput, value as never, { shouldDirty: true, shouldValidate: formState.isSubmitted });

  async function onSubmit(formValues: SaleOrderFormValues) {
    if (!isCreate && hasFulfilment && !formValues.amendmentReason.trim()) {
      showFormErrors({ amendmentReason: { message: "Give a reason - this order already has deliveries / invoices, so saving creates a new revision." } });
      return;
    }
    const { amendmentReason, ...rest } = cleanCustomFields(formValues);
    const payload = { ...rest, ...(isCreate ? {} : { amendmentReason }), placeOfSupply: isExport ? "" : rest.placeOfSupply };
    try {
      if (isCreate) await createMutation.mutateAsync(payload as never);
      else await updateMutation.mutateAsync({ id: Number(id), values: payload as never });
    } catch (error) {
      showApiErrorPopup("Could not save the Sale Order", error);
      return;
    }
    message.success(hasFulfilment ? "Amendment saved as a new revision" : "Saved Successfully");
    navigate("/sales/sale-order");
  }

  const dateField = (name: "soDate" | "customerPoDate" | "validUpto", label: string, required = false) => (
    <Form.Item label={label} required={required} validateStatus={errors[name] ? "error" : undefined} help={errors[name]?.message}>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <DatePicker
            style={{ width: "100%" }}
            disabled={readOnly}
            value={field.value ? dayjs(field.value) : null}
            onChange={(d) => field.onChange(d ? d.format("YYYY-MM-DD") : required ? "" : null)}
          />
        )}
      />
    </Form.Item>
  );

  const mfgColumns: ColumnsType<SORow> = showMfg
    ? [
        { key: "lineNo", label: "Line No.", width: 80 },
        { key: "drawingNo", label: "Drawing No.", width: 110 },
        { key: "drawingRevision", label: "Drg. Rev.", width: 70 },
      ].map(({ key, label, width }) => ({
        title: label,
        key,
        render: (_: unknown, row: SORow, i: number) =>
          readOnly ? (row[key] as string) || "-" : (
            <Input
              style={{ width }}
              value={(row[key] as string) ?? ""}
              onChange={(e) => setField("items", values.items.map((r, j) => (j === i ? { ...r, [key]: e.target.value } : r)))}
            />
          ),
      }))
        .concat([
          {
            title: "Amortisation",
            key: "amortisationCost",
            render: (_: unknown, row: SORow, i: number) =>
              readOnly ? money(row.amortisationCost) : (
                <InputNumber
                  style={{ width: 100 }}
                  min={0}
                  value={Number(row.amortisationCost ?? 0)}
                  onChange={(v) => setField("items", values.items.map((r, j) => (j === i ? { ...r, amortisationCost: v ?? 0 } : r)))}
                />
              ),
          },
        ])
    : [];

  const progressColumns: ColumnsType<SORow> = existing
    ? [
        { title: "Delivered", key: "dq", render: (_, r) => (r.id ? Number(r.deliveredQty ?? 0) : "-") },
        { title: "Invoiced", key: "iq", render: (_, r) => (r.id ? Number(r.invoicedQty ?? 0) : "-") },
        { title: "Pending", key: "pq", render: (_, r) => (r.id ? <strong>{Number(r.pendingQty ?? 0)}</strong> : "-") },
      ]
    : [];

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit, showFormErrors)}>
      <h2 style={{ marginTop: 0 }}>
        {isCreate ? "New Sale Order" : `Sale Order ${existing?.displayNumber ?? ""}`}{" "}
        {existing && <StatusTag status={existing.status} />}
      </h2>
      {existing?.status === "Closed" && !readOnlyProp && (
        <Alert type="info" showIcon style={{ marginBottom: 16 }} title={`This order is closed${existing.closedReason ? ` - ${existing.closedReason}` : ""}.`} />
      )}
      {!readOnly && hasFulfilment && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          title="This order already has deliveries / invoices"
          description="Saving records an amendment: the current version is kept as history and the order moves to the next revision. Quantities can't go below what is already delivered."
        />
      )}

      <Form.Item label="Order Type">
        <Controller
          name="soType"
          control={control}
          render={({ field }) => (
            <Radio.Group
              disabled={readOnly || !isCreate}
              value={field.value}
              onChange={(e) => changeType(e.target.value)}
              options={SO_TYPE_OPTIONS}
              optionType="button"
            />
          )}
        />
      </Form.Item>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", columnGap: 24 }}>
        <Form.Item
          label={isExport ? "Export Customer" : "Customer"}
          required
          style={{ gridColumn: "span 2" }}
          validateStatus={errors.customer ? "error" : undefined}
          help={errors.customer?.message}
        >
          <Controller
            name="customer"
            control={control}
            render={({ field }) => (
              <Select
                showSearch
                optionFilterProp="label"
                disabled={readOnly || !isCreate}
                placeholder="Select customer"
                value={field.value ?? undefined}
                options={options}
                onChange={applyCustomer}
              />
            )}
          />
        </Form.Item>
        <Form.Item label="Quotation No. (optional)">
          <Controller
            name="quotation"
            control={control}
            render={({ field }) => (
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                disabled={readOnly || !isCreate}
                placeholder="Accepted quotations"
                value={field.value ?? undefined}
                onChange={(v) => applyQuotation(v ?? null)}
                options={[
                  ...quotationOptions.map((q) => ({ value: q.id, label: `${q.quotationNumber} - ${q.customerName}` })),
                  ...(existing?.quotation ? [{ value: existing.quotation, label: existing.quotationNumber ?? "" }] : []),
                ]}
              />
            )}
          />
        </Form.Item>
        {dateField("soDate", "SO Date", true)}
        <Form.Item label="Customer PO No.">
          <Controller name="customerPoNo" control={control} render={({ field }) => <Input {...field} disabled={readOnly} />} />
        </Form.Item>
        {dateField("customerPoDate", "Customer PO Date")}
        {dateField("validUpto", "Valid Upto")}
        {isExport ? (
          <>
            <Form.Item label="Currency">
              <Controller
                name="currencyCode"
                control={control}
                render={({ field }) => (
                  <Select
                    showSearch
                    disabled={readOnly}
                    value={field.value}
                    onChange={field.onChange}
                    options={CURRENCY_OPTIONS.map((c) => ({ value: c.currencyCode, label: `${c.currencyCode} - ${c.currencyName}` }))}
                  />
                )}
              />
            </Form.Item>
            <Form.Item label="Exchange Rate (₹ per unit)" validateStatus={errors.exchangeRate ? "error" : undefined} help={errors.exchangeRate?.message}>
              <Controller
                name="exchangeRate"
                control={control}
                render={({ field }) => (
                  <InputNumber style={{ width: "100%" }} min={0} disabled={readOnly} value={Number(field.value)} onChange={(v) => field.onChange(v ?? 0)} />
                )}
              />
            </Form.Item>
          </>
        ) : (
          <Form.Item label="Place of Supply" tooltip="Defaults to the customer's state; decides CGST+SGST vs IGST">
            <Controller
              name="placeOfSupply"
              control={control}
              render={({ field }) => (
                <Select showSearch disabled={readOnly} value={field.value || undefined} onChange={field.onChange} options={STATE_OPTIONS} placeholder="Customer's state" />
              )}
            />
          </Form.Item>
        )}
        <Form.Item label="Advance Received" tooltip="Adjusted against this order's invoices">
          <Controller
            name="advanceReceived"
            control={control}
            render={({ field }) => (
              <InputNumber style={{ width: "100%" }} min={0} disabled={readOnly} value={Number(field.value)} onChange={(v) => field.onChange(v ?? 0)} />
            )}
          />
        </Form.Item>
        <Form.Item label="Advance Mode">
          <Controller
            name="advanceMode"
            control={control}
            render={({ field }) => (
              <Select allowClear disabled={readOnly} value={field.value || undefined} onChange={(v) => field.onChange(v ?? "")} options={ADVANCE_MODES} />
            )}
          />
        </Form.Item>
        {existing && Number(existing.advanceReceived) > 0 && (
          <Form.Item label="Advance Balance">
            <Input value={money(existing.advanceBalance)} disabled />
          </Form.Item>
        )}
      </div>
      {isExport && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 8 }}
          title="Export order: priced as an inter-state supply (IGST). Whether it's zero-rated under LUT is decided on the invoice."
        />
      )}

      <label style={{ display: "inline-flex", gap: 8, alignItems: "center", marginTop: 8, cursor: "pointer" }}>
        <Switch size="small" checked={showMfg} onChange={setShowMfg} /> Show manufacturing fields (Line No., Drawing No., Amortisation)
      </label>

      <PricedDocumentBody<SORow>
        values={values as unknown as PricedBodyValues<SORow>}
        setField={setField}
        buyerState={buyerState}
        taxContext={taxContext}
        readOnly={readOnly}
        itemsError={errors.items?.message ?? errors.items?.root?.message}
        pricingExtra={{ export: isExport }}
        gridProps={{
          makeRow: (item: SalesItemOption) => ({ ...newLineFor(item, taxContext), ...MFG_DEFAULTS }) as SORow,
          isItemLocked: (row) => Number(row.deliveredQty ?? 0) > 0 || Number(row.invoicedQty ?? 0) > 0,
          extraColumns: mfgColumns,
          trailingColumns: progressColumns,
        }}
      />

      {!readOnly && hasFulfilment && (
        <Form.Item
          label="Amendment Reason"
          required
          style={{ marginTop: 16 }}
          validateStatus={errors.amendmentReason ? "error" : undefined}
          help={errors.amendmentReason?.message}
        >
          <Controller name="amendmentReason" control={control} render={({ field }) => <Input.TextArea rows={2} {...field} />} />
        </Form.Item>
      )}

      {revisions.length > 0 && (
        <>
          <Divider titlePlacement="start">Revision History</Divider>
          <Table<SaleOrderRevision>
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={revisions}
            columns={[
              { title: "Revision", dataIndex: "revisionNo", render: (v: number) => `Rev ${v}` },
              { title: "Amended On", dataIndex: "amendmentDate" },
              { title: "Reason", dataIndex: "reason", render: (v: string) => v || "-" },
              { title: "By", dataIndex: "createdBy", render: (v: string) => v || "-" },
              {
                title: "Net Amount (before)",
                key: "net",
                render: (_, r) => money((r.snapshot as { net_amount?: string; netAmount?: string }).netAmount ?? (r.snapshot as { net_amount?: string }).net_amount),
              },
            ]}
          />
        </>
      )}

      <Divider />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Button onClick={() => navigate("/sales/sale-order")}>{readOnly ? "Close" : "Cancel"}</Button>
        {!readOnly && (
          <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
            {hasFulfilment ? "Save Amendment" : "Save"}
          </Button>
        )}
      </div>
    </Form>
  );
}
