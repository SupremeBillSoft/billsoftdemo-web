// src/features/sales/invoice/InvoiceFormPage.tsx
//
// BRD 6.4.5 Sales Invoice - five kinds:
//   Direct    items billed straight away (stock leaves the line's godown)
//   Order     the pending quantity of a Sale Order
//   DC        goods already sent on challan(s) - no second stock movement
//   Export    zero-rated under LUT, or with IGST paid
//   Proforma  no GST liability, no stock, own number series
// Totals preview mirrors the server; stock shortfalls come back as warnings.

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Switch,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dayjs from "dayjs";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { showApiErrorPopup } from "../../../lib/apiError";
import { useLineTaxContext } from "../../../lib/gst/lineTax";
import { STATE_OPTIONS } from "../../../lib/states";
import { useBanksQuery } from "../../bank/api";
import { CURRENCY_OPTIONS } from "../../currency/CurrencyOptions";
import { usePartiesQuery } from "../../parties/api";
import { useCompanySettingsQuery } from "../../settings/api";
import { deliveryChallanApi } from "../deliveryChallan/api";
import { TRANSPORT_MODE_OPTIONS, type InvoiceableChallan } from "../deliveryChallan/types";
import { saleOrderApi } from "../saleOrder/api";
import type { SaleOrderLine } from "../saleOrder/types";
import { EInvoicePanel, EWayBillModal } from "../shared/compliance";
import {
  StatusTag,
  customerOptions,
  money,
  showFormErrors,
  today,
  useGodownOptions,
  type CustomerParty,
} from "../shared/components";
import { PricedDocumentBody, type PricedBodyValues } from "../shared/PricedDocumentBody";
import { EXPORT_STATE } from "../shared/pricing";
import { newLineFor, newRowKey, type SalesItemOption } from "../shared/SalesLineGrid";
import { PRICED_DEFAULTS, cleanCustomFields, linesFromServer, pricedDocumentShape, pricedFromServer, usePricedPreview } from "../shared/schema";
import { EMPTY_SHIP_TO, ShipToFields, pickShipTo, type ShipToValues } from "../shared/ShipToFields";
import { invoiceApi } from "./api";
import { INVOICE_TYPE_OPTIONS, PAYMENT_MODES, TAX_NATURE_OPTIONS, type InvoiceType, type SalesInvoiceLine } from "./types";
import { FORM_GRID } from "../../../components/CompactForm";

const invoiceSchema = z.object({
  ...pricedDocumentShape,
  invoiceType: z.enum(["Direct", "Order", "DC", "Export", "Proforma"]),
  taxNature: z.enum(["Sales", "Labour", "Scrap", "Rejection", "RMSales"]).default("Sales"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  saleOrder: z.number().nullable().default(null),
  deliveryChallans: z.array(z.number()).default([]),
  customerPoNo: z.string().default(""),
  customerPoDate: z.string().nullable().default(null),
  poAmendmentNo: z.string().default(""),
  poAmendmentDate: z.string().nullable().default(null),
  ourDcRef: z.string().default(""),
  yourDcRef: z.string().default(""),
  kindAttn: z.string().default(""),
  transportMode: z.string().default(""),
  vehicleNo: z.string().default(""),
  removalDatetime: z.string().nullable().default(null),
  distanceKm: z.number().nullable().default(null),
  bank: z.number().nullable().default(null),
  paymentTerms: z.string().default(""),
  dueDate: z.string().nullable().default(null),
  employeeCode: z.string().default(""),
  employeeName: z.string().default(""),
  counterNo: z.string().default(""),
  currencyCode: z.string().default("INR"),
  exchangeRate: z.coerce.number().positive().default(1),
  exporterRef: z.string().default(""),
  exportWithIgst: z.boolean().default(false),
  lutNumber: z.string().default(""),
  portCode: z.string().default(""),
  shippingBillNo: z.string().default(""),
  shippingBillDate: z.string().nullable().default(null),
  containerNo: z.string().default(""),
  goodsDescription: z.string().default(""),
  advanceAdjusted: z.coerce.number().nonnegative().default(0),
  amountReceived: z.coerce.number().nonnegative().default(0),
  paymentMode: z.string().default(""),
  paymentReference: z.string().default(""),
  shipToName: z.string().default(""),
  shipToAddress1: z.string().default(""),
  shipToAddress2: z.string().default(""),
  shipToCity: z.string().default(""),
  shipToState: z.string().default(""),
  shipToPincode: z.string().default(""),
  shipToGstin: z.string().default(""),
});

type FormInput = z.input<typeof invoiceSchema>;
type FormValues = z.output<typeof invoiceSchema>;
type Row = SalesInvoiceLine & Record<string, unknown>;

const EMPTY: FormInput = {
  ...PRICED_DEFAULTS,
  ...EMPTY_SHIP_TO,
  customer: undefined as unknown as number,
  invoiceType: "Direct",
  taxNature: "Sales",
  invoiceDate: today(),
  saleOrder: null,
  deliveryChallans: [],
  customerPoNo: "",
  customerPoDate: null,
  poAmendmentNo: "",
  poAmendmentDate: null,
  ourDcRef: "",
  yourDcRef: "",
  kindAttn: "",
  transportMode: "",
  vehicleNo: "",
  removalDatetime: null,
  distanceKm: null,
  bank: null,
  paymentTerms: "",
  dueDate: null,
  employeeCode: "",
  employeeName: "",
  counterNo: "",
  currencyCode: "INR",
  exchangeRate: 1,
  exporterRef: "",
  exportWithIgst: false,
  lutNumber: "",
  portCode: "",
  shippingBillNo: "",
  shippingBillDate: null,
  containerNo: "",
  goodsDescription: "",
  advanceAdjusted: 0,
  amountReceived: 0,
  paymentMode: "",
  paymentReference: "",
};

const HEADER_KEYS = Object.keys(EMPTY).filter((k) => !(k in PRICED_DEFAULTS) && k !== "customer");

export function InvoiceFormPage({ readOnly: readOnlyProp = false }: { readOnly?: boolean }) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isCreate = !id;
  const navigate = useNavigate();
  const [ewayOpen, setEwayOpen] = useState(false);

  const { data: existing } = invoiceApi.useOne(id);
  const { data: parties = [] } = usePartiesQuery();
  const { data: banks = [] } = useBanksQuery();
  const { data: settings } = useCompanySettingsQuery();
  const { options: godownOptions, defaultGodown } = useGodownOptions();
  const createMutation = invoiceApi.useCreate();
  const updateMutation = invoiceApi.useUpdate();
  const customers = parties as unknown as CustomerParty[];

  // Locked once e-invoiced, cancelled, or returns / credit notes exist
  // (the server says which on save; e-invoice + cancel are known here).
  const locked = !!existing && (existing.status === "Cancelled" || existing.einvoiceStatus === "Generated");
  const readOnly = readOnlyProp || locked;

  const { control, handleSubmit, reset, setValue, watch, formState } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: { ...EMPTY, invoiceType: (searchParams.get("type") as InvoiceType) || "Direct" },
  });
  const errors = formState.errors;

  useEffect(() => {
    if (!existing) return;
    const header = Object.fromEntries(HEADER_KEYS.map((k) => [k, (existing as unknown as Record<string, unknown>)[k]]));
    reset({
      ...EMPTY,
      ...header,
      ...pricedFromServer(existing as unknown as Record<string, unknown>),
      items: linesFromServer(existing.items).map((l) => ({ ...l, rejectionQty: Number(l.rejectionQty) })) as Row[],
      customer: existing.customer,
      exchangeRate: Number(existing.exchangeRate),
      advanceAdjusted: Number(existing.advanceAdjusted),
      amountReceived: Number(existing.amountReceived),
    } as FormInput);
  }, [existing, reset]);

  const values = watch();
  const type = values.invoiceType;
  const isExport = type === "Export";
  const customer = customers.find((p) => p.id === values.customer);
  const buyerState = isExport ? EXPORT_STATE : values.placeOfSupply || values.shipToState || customer?.state || "";
  const taxContext = useLineTaxContext(buyerState);
  const zeroRated = isExport && !values.exportWithIgst;
  const pricingExtra = { export: isExport, zeroRated };
  const priced = usePricedPreview(values as unknown as PricedBodyValues<Row>, buyerState, taxContext, pricingExtra);

  const options = useMemo(() => customerOptions(customers, isExport, values.customer), [customers, isExport, values.customer]);

  // Sources for the lines.
  const usesOrder = type === "Order" || type === "Export" || type === "Proforma";
  const { data: orders = [] } = saleOrderApi.useList({ customer: values.customer, status: "Pending" }, usesOrder && !!values.customer);
  const orderOptions = orders.filter((o) => (type === "Order" ? o.soType === "Domestic" : type === "Export" ? o.soType === "Export" : true));
  const { data: invoiceable = [] } = deliveryChallanApi.useGet<InvoiceableChallan[]>(
    "invoiceable-lines/",
    { customer: values.customer },
    isCreate && type === "DC" && !!values.customer
  );
  const pickedOrder = orders.find((o) => o.id === values.saleOrder);

  const rows = (values.items ?? []) as Row[];
  const setField = (name: string, value: unknown) =>
    setValue(name as keyof FormInput, value as never, { shouldDirty: true, shouldValidate: formState.isSubmitted });

  function applyCustomer(partyId: number | undefined) {
    setValue("customer", partyId as number, { shouldValidate: formState.isSubmitted });
    const party = customers.find((p) => p.id === partyId);
    setValue("placeOfSupply", party?.state ?? "");
    setValue("saleOrder", null);
    setValue("deliveryChallans", []);
    if (type !== "Direct") setValue("items", []);
    Object.entries(EMPTY_SHIP_TO).forEach(([k, v]) => setValue(k as keyof ShipToValues, v));
  }

  function changeType(next: InvoiceType) {
    setValue("invoiceType", next);
    setValue("saleOrder", null);
    setValue("deliveryChallans", []);
    setValue("items", []);
    const party = customers.find((p) => p.id === values.customer);
    if (next === "Export" && party && !party.isExportCustomer) setValue("customer", undefined as unknown as number);
    if (next === "Export") setValue("lutNumber", settings?.lutNumber ?? "");
    else {
      setValue("currencyCode", "INR");
      setValue("exchangeRate", 1);
    }
  }

  // --- Lines from a Sale Order -------------------------------------------
  async function applyOrder(orderId: number | null) {
    setValue("saleOrder", orderId);
    const order = orders.find((o) => o.id === orderId);
    if (!order) {
      setValue("items", rows.filter((r) => !r.soItem));
      setValue("advanceAdjusted", 0);
      return;
    }
    const pending = await saleOrderApi.fetchPath<SaleOrderLine[]>(`${order.id}/pending-lines/`);
    const fromOrder: Row[] = pending.map((l) => ({
      soItem: l.id!,
      dcItem: null,
      item: l.item,
      itemCode: l.itemCode,
      description: l.description,
      uom: l.uom,
      hsnSac: l.hsnSac,
      quantity: Number(l.pendingQty),
      maxQty: Number(l.pendingQty),
      rate: Number(l.rate),
      discountPercent: Number(l.discountPercent),
      discountAmount: Number(l.discountAmount),
      tax: l.tax,
      godown: type === "Proforma" ? null : defaultGodown,
      rejectionQty: 0,
      isFree: false,
      remarks: "",
      sourceLabel: order.displayNumber,
      _rowKey: newRowKey(),
    }));
    setValue("items", [...rows.filter((r) => !r.soItem), ...fromOrder]);
    setValue("customerPoNo", order.customerPoNo);
    setValue("customerPoDate", order.customerPoDate);
    if (order.placeOfSupply) setValue("placeOfSupply", order.placeOfSupply);
    if (isExport) {
      setValue("currencyCode", order.currencyCode);
      setValue("exchangeRate", Number(order.exchangeRate));
    }
    // Advance on the order is set off here (not on a proforma).
    setValue("advanceAdjusted", type === "Proforma" ? 0 : Number(order.advanceBalance ?? 0));
  }

  // --- Lines from challans -----------------------------------------------
  function applyChallans(ids: number[]) {
    setValue("deliveryChallans", ids);
    const picked = invoiceable.filter((c) => ids.includes(c.id));
    setValue(
      "items",
      picked.flatMap((c) =>
        c.lines.map((l) => ({
          soItem: l.soItem,
          dcItem: l.id!,
          item: l.item,
          itemCode: l.itemCode,
          description: l.description,
          uom: l.uom,
          hsnSac: l.hsnSac,
          quantity: Number(l.pendingInvoiceQty),
          maxQty: Number(l.pendingInvoiceQty),
          rate: Number(l.rate),
          discountPercent: 0,
          discountAmount: 0,
          tax: taxContext.defaultTaxFor(l.item),
          godown: null,
          rejectionQty: Number(l.rejectionQty ?? 0),
          isFree: false,
          remarks: "",
          sourceLabel: c.dcNumber,
          _rowKey: newRowKey(),
        }))
      ) as Row[]
    );
  }

  // An export opened straight as ?type=Export still shows the company LUT.
  useEffect(() => {
    if (isCreate && isExport && !values.exportWithIgst && !values.lutNumber && settings?.lutNumber) {
      setValue("lutNumber", settings.lutNumber);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, isExport]);

  // Started from a list action: ?type=DC&customer=&challan= or ?saleOrder=
  const customerParam = searchParams.get("customer");
  const challanParam = searchParams.get("challan");
  const soParam = searchParams.get("saleOrder");
  useEffect(() => {
    if (isCreate && customerParam && !values.customer && customers.length) applyCustomer(Number(customerParam));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers.length]);
  useEffect(() => {
    if (isCreate && challanParam && invoiceable.some((c) => c.id === Number(challanParam)) && !values.deliveryChallans?.length) {
      applyChallans([Number(challanParam)]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceable]);
  useEffect(() => {
    if (isCreate && soParam && orders.some((o) => o.id === Number(soParam)) && !values.saleOrder) applyOrder(Number(soParam));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  async function onSubmit(formValues: FormValues) {
    const payload = {
      ...cleanCustomFields(formValues),
      placeOfSupply: isExport ? "" : formValues.placeOfSupply,
      items: formValues.items.map(({ maxQty: _m, sourceLabel: _s, ...l }) => l),
    };
    let saved;
    try {
      saved = isCreate
        ? await createMutation.mutateAsync(payload as never)
        : await updateMutation.mutateAsync({ id: Number(id), values: payload as never });
    } catch (error) {
      showApiErrorPopup("Could not save the Invoice", error);
      return;
    }
    message.success(`Invoice ${saved.invoiceNumber} saved`);
    if (saved.stockWarnings?.length) {
      Modal.warning({
        title: "Saved - but stock is short",
        content: <div style={{ whiteSpace: "pre-line" }}>{saved.stockWarnings.join("\n")}</div>,
      });
    }
    navigate(`/sales/invoice/${saved.id}/view`);
  }

  // --- grid columns -------------------------------------------------------
  const patchRow = (i: number, changes: Partial<Row>) => setField("items", rows.map((r, j) => (j === i ? { ...r, ...changes } : r)));
  const sourceColumn: ColumnsType<Row> =
    type === "Order" || type === "DC" || (usesOrder && rows.some((r) => r.soItem))
      ? [{ title: type === "DC" ? "DC No." : "SO No.", key: "src", render: (_, r) => r.sourceLabel ?? (r.dcItem ? "DC" : r.soItem ? "SO" : "-") }]
      : [];
  const trailing: ColumnsType<Row> = [
    {
      title: "Free",
      key: "free",
      render: (_, r, i) => <Checkbox disabled={readOnly} checked={!!r.isFree} onChange={(e) => patchRow(i, { isFree: e.target.checked })} />,
    },
    ...(type === "DC" || type === "Proforma"
      ? []
      : [
          {
            title: "Godown",
            key: "godown",
            render: (_: unknown, r: Row, i: number) =>
              readOnly ? (r.godownName ?? "-") : (
                <Select
                  style={{ width: 130 }}
                  allowClear
                  placeholder="No stock (service)"
                  value={r.godown ?? undefined}
                  options={godownOptions}
                  onChange={(v) => patchRow(i, { godown: v ?? null })}
                />
              ),
          },
        ]),
  ];

  const balance = priced.totals.netAmount - Number(values.advanceAdjusted ?? 0) - Number(values.amountReceived ?? 0);
  const lutExpired = !!settings?.lutValidTill && dayjs(settings.lutValidTill).isBefore(dayjs(values.invoiceDate), "day");
  const typeHelp = INVOICE_TYPE_OPTIONS.find((o) => o.value === type)?.help;

  const dateField = (name: "invoiceDate" | "customerPoDate" | "poAmendmentDate" | "dueDate" | "shippingBillDate", label: string, required = false) => (
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
  type TextName =
    | "customerPoNo" | "poAmendmentNo" | "ourDcRef" | "yourDcRef" | "kindAttn" | "vehicleNo" | "paymentTerms"
    | "employeeCode" | "employeeName" | "counterNo" | "exporterRef" | "lutNumber" | "portCode" | "shippingBillNo"
    | "containerNo" | "paymentReference";
  const textField = (name: TextName, label: string, extra?: string) => (
    <Form.Item label={label} extra={extra} validateStatus={errors[name] ? "error" : undefined} help={errors[name]?.message}>
      <Controller name={name} control={control} render={({ field }) => <Input {...field} disabled={readOnly} />} />
    </Form.Item>
  );

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit, showFormErrors)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>
          {isCreate ? "New Sales Invoice" : `${type === "Proforma" ? "Proforma " : ""}Invoice ${existing?.invoiceNumber ?? ""}`}{" "}
          {existing && <StatusTag status={existing.status} />}
        </h2>
        {existing && existing.status === "Active" && (
          <Space>
            {type !== "Proforma" && <Button onClick={() => setEwayOpen(true)}>E-Way Bill</Button>}
            {type !== "Proforma" && (
              <>
                <Button onClick={() => navigate(`/sales/return/new?invoice=${existing.id}`)}>Sales Return</Button>
                <Button onClick={() => navigate(`/sales/credit-note/new?invoice=${existing.id}`)}>Credit Note</Button>
              </>
            )}
            {readOnlyProp && !locked && <Button onClick={() => navigate(`/sales/invoice/${existing.id}`)}>Edit</Button>}
          </Space>
        )}
      </div>

      {existing?.status === "Cancelled" && (
        <Alert type="error" showIcon style={{ marginBottom: 16 }} title={`Cancelled${existing.cancelReason ? ` - ${existing.cancelReason}` : ""}. Stock has been put back.`} />
      )}
      {existing?.einvoiceStatus === "Generated" && !readOnlyProp && (
        <Alert type="info" showIcon style={{ marginBottom: 16 }} title="E-invoiced documents can't be edited. Cancel the IRN within 24 hours, or issue a Credit Note." />
      )}
      {existing && <EInvoicePanel resource="invoices" doc={existing} number={existing.invoiceNumber} />}

      <Form.Item label="Invoice Type" extra={typeHelp}>
        <Radio.Group
          disabled={readOnly || !isCreate}
          value={type}
          onChange={(e) => changeType(e.target.value)}
          options={INVOICE_TYPE_OPTIONS.map(({ value, label }) => ({ value, label }))}
          optionType="button"
        />
      </Form.Item>
      
        <div style={FORM_GRID}>
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
        {dateField("invoiceDate", "Invoice Date", true)}
        <Form.Item label="Nature" tooltip="Each nature can have its own number series (Document Number Format).">
          <Controller
            name="taxNature"
            control={control}
            render={({ field }) => <Select disabled={readOnly || !isCreate} value={field.value} onChange={field.onChange} options={TAX_NATURE_OPTIONS} />}
          />
        </Form.Item>

        {usesOrder && (
          <Form.Item label={type === "Order" ? "Sale Order" : "Sale Order (optional)"} required={type === "Order"}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              disabled={readOnly || !isCreate || !values.customer}
              placeholder={values.customer ? "Pending orders" : "Select a customer first"}
              value={values.saleOrder ?? undefined}
              onChange={(v) => applyOrder(v ?? null)}
              options={[
                ...orderOptions.map((o) => ({ value: o.id, label: `${o.displayNumber} (${o.soDate})` })),
                ...(existing?.saleOrder && !orderOptions.some((o) => o.id === existing.saleOrder)
                  ? [{ value: existing.saleOrder, label: existing.soNumber ?? "" }]
                  : []),
              ]}
            />
          </Form.Item>
        )}
        {type === "DC" && (
          <Form.Item label="Delivery Challans" required style={{ gridColumn: "span 2" }}>
            <Select
              mode="multiple"
              optionFilterProp="label"
              disabled={readOnly || !isCreate || !values.customer}
              placeholder={values.customer ? "Challans not yet invoiced" : "Select a customer first"}
              value={values.deliveryChallans}
              onChange={applyChallans}
              options={
                isCreate
                  ? invoiceable.map((c) => ({ value: c.id, label: `${c.dcNumber} (${c.dcDate})` }))
                  : (existing?.deliveryChallans ?? []).map((cid, i) => ({ value: cid, label: existing?.dcNumbers[i] ?? `#${cid}` }))
              }
            />
          </Form.Item>
        )}
        {!isExport && (
          <Form.Item label="Place of Supply" tooltip="Defaults to the ship-to / customer state; decides CGST+SGST vs IGST">
            <Controller
              name="placeOfSupply"
              control={control}
              render={({ field }) => (
                <Select showSearch allowClear disabled={readOnly} value={field.value || undefined} onChange={(v) => field.onChange(v ?? "")} options={STATE_OPTIONS} placeholder="Customer's state" />
              )}
            />
          </Form.Item>
        )}
        {textField("customerPoNo", "Customer PO No.")}
        {dateField("customerPoDate", "Customer PO Date")}
        {textField("poAmendmentNo", "PO Amendment No.")}
        {dateField("poAmendmentDate", "PO Amendment Date")}
        {textField("kindAttn", "Kind Attn.")}
        {textField("ourDcRef", "Our DC Ref.")}
        {textField("yourDcRef", "Your DC Ref.")}
        <Form.Item label="Bank (printed for payment)">
          <Controller
            name="bank"
            control={control}
            render={({ field }) => (
              <Select
                allowClear
                disabled={readOnly}
                value={field.value ?? undefined}
                onChange={(v) => field.onChange(v ?? null)}
                options={banks.map((b) => ({ value: b.id, label: `${b.bankName} - ${b.accountNo}` }))}
              />
            )}
          />
        </Form.Item>
        {textField("paymentTerms", "Payment Terms")}
        {dateField("dueDate", "Due Date")}
      </div>

      {isExport && (
        <>
          <Divider titlePlacement="start">Export</Divider>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
            <Controller
              name="exportWithIgst"
              control={control}
              render={({ field }) => (
                <Switch
                  disabled={readOnly}
                  checked={field.value}
                  onChange={(v) => {
                    field.onChange(v);
                    if (!v && !values.lutNumber) setValue("lutNumber", settings?.lutNumber ?? "");
                  }}
                />
              )}
            />
            {values.exportWithIgst ? "Export with IGST paid (refund claimed later)" : "Export under LUT - zero rated, no IGST"}
          </div>
          {!values.exportWithIgst && lutExpired && (
            <Alert type="warning" showIcon style={{ marginBottom: 12 }} title={`The LUT in Company Settings expired on ${settings?.lutValidTill}. Renew it, or export with IGST.`} />
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", columnGap: 24 }}>
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
            <Form.Item label="Exchange Rate (₹ per unit)">
              <Controller
                name="exchangeRate"
                control={control}
                render={({ field }) => <InputNumber style={{ width: "100%" }} min={0} disabled={readOnly} value={Number(field.value)} onChange={(v) => field.onChange(v ?? 0)} />}
              />
            </Form.Item>
            {!values.exportWithIgst && textField("lutNumber", "LUT Number")}
            {textField("exporterRef", "Exporter Ref.")}
            {textField("portCode", "Port Code")}
            {textField("shippingBillNo", "Shipping Bill No.")}
            {dateField("shippingBillDate", "Shipping Bill Date")}
            {textField("containerNo", "Container No.")}
          </div>
          <Form.Item label="Description of Goods">
            <Controller name="goodsDescription" control={control} render={({ field }) => <Input.TextArea rows={2} {...field} disabled={readOnly} />} />
          </Form.Item>
        </>
      )}

      <Divider titlePlacement="start">Dispatch & Ship To</Divider>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", columnGap: 24 }}>
        <Form.Item label="Transport Mode">
          <Controller
            name="transportMode"
            control={control}
            render={({ field }) => <Select allowClear disabled={readOnly} value={field.value || undefined} onChange={(v) => field.onChange(v ?? "")} options={TRANSPORT_MODE_OPTIONS} />}
          />
        </Form.Item>
        {textField("vehicleNo", "Vehicle No.")}
        <Form.Item label="Removal Date & Time" tooltip="When goods left for supply - the invoice must be on or before it (s.31).">
          <Controller
            name="removalDatetime"
            control={control}
            render={({ field }) => (
              <DatePicker
                showTime={{ format: "HH:mm" }}
                format="DD-MM-YYYY HH:mm"
                style={{ width: "100%" }}
                disabled={readOnly}
                value={field.value ? dayjs(field.value) : null}
                onChange={(d) => field.onChange(d ? d.toISOString() : null)}
              />
            )}
          />
        </Form.Item>
        <Form.Item label="Distance (km)">
          <Controller
            name="distanceKm"
            control={control}
            render={({ field }) => <InputNumber style={{ width: "100%" }} min={0} disabled={readOnly} value={field.value} onChange={(v) => field.onChange(v ?? null)} />}
          />
        </Form.Item>
      </div>
      <ShipToFields
        value={pickShipTo(values as Partial<ShipToValues>)}
        onChange={(next) => Object.entries(next).forEach(([k, v]) => setValue(k as keyof ShipToValues, v))}
        customer={customer}
        readOnly={readOnly}
      />

      <PricedDocumentBody<Row>
        values={values as unknown as PricedBodyValues<Row>}
        setField={setField}
        buyerState={buyerState}
        taxContext={taxContext}
        readOnly={readOnly}
        itemsError={errors.items?.message ?? errors.items?.root?.message}
        pricingExtra={pricingExtra}
        gridProps={{
          canAddItems: type === "Direct" || type === "Export" || type === "Proforma",
          makeRow: (item: SalesItemOption) =>
            ({
              ...newLineFor(item, taxContext),
              soItem: null,
              dcItem: null,
              godown: type === "Proforma" || item.itemType === "Service" ? null : defaultGodown,
              rejectionQty: 0,
              isFree: false,
              remarks: "",
            }) as Row,
          quantityMax: (r) => (isCreate ? r.maxQty : undefined),
          isItemLocked: (r) => !!r.dcItem,
          extraColumns: sourceColumn,
          trailingColumns: trailing,
        }}
      />

      {type !== "Proforma" && (
        <>
          <Divider titlePlacement="start">Payment</Divider>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", columnGap: 24 }}>
            <Form.Item
              label="Advance Adjusted"
              extra={pickedOrder && Number(pickedOrder.advanceBalance) > 0 ? `Advance available on ${pickedOrder.displayNumber}: ₹${money(pickedOrder.advanceBalance)}` : undefined}
            >
              <Controller
                name="advanceAdjusted"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    max={pickedOrder ? Number(pickedOrder.advanceBalance ?? 0) : undefined}
                    disabled={readOnly || !values.saleOrder}
                    value={Number(field.value)}
                    onChange={(v) => field.onChange(v ?? 0)}
                  />
                )}
              />
            </Form.Item>
            <Form.Item label="Amount Received Now">
              <Controller
                name="amountReceived"
                control={control}
                render={({ field }) => <InputNumber style={{ width: "100%" }} min={0} disabled={readOnly} value={Number(field.value)} onChange={(v) => field.onChange(v ?? 0)} />}
              />
            </Form.Item>
            <Form.Item label="Payment Mode">
              <Controller
                name="paymentMode"
                control={control}
                render={({ field }) => <Select allowClear disabled={readOnly} value={field.value || undefined} onChange={(v) => field.onChange(v ?? "")} options={PAYMENT_MODES} />}
              />
            </Form.Item>
            {textField("paymentReference", "Payment Reference")}
          </div>
          <div style={{ textAlign: "right", fontSize: 15, marginBottom: 8 }}>
            Balance due: <strong style={{ color: balance < 0 ? "#ff4d4f" : undefined }}>₹{money(balance)}</strong>
            {balance < 0 && <span style={{ color: "#ff4d4f" }}> - received + advance is more than the invoice</span>}
          </div>
        </>
      )}

      <Divider titlePlacement="start">Sales Person / Counter</Divider>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", columnGap: 24 }}>
        {textField("employeeCode", "Employee Code")}
        {textField("employeeName", "Employee Name")}
        {textField("counterNo", "Counter No.")}
      </div>

      <Divider />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Button onClick={() => navigate("/sales/invoice")}>{readOnly ? "Close" : "Cancel"}</Button>
        {!readOnly && (
          <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
            Save Invoice
          </Button>
        )}
      </div>

      {existing && ewayOpen && (
        <EWayBillModal
          resource="invoices"
          doc={{ id: existing.id, number: existing.invoiceNumber, vehicleNo: existing.vehicleNo, distanceKm: existing.distanceKm, transportMode: existing.transportMode }}
          onClose={() => setEwayOpen(false)}
        />
      )}
    </Form>
  );
}
