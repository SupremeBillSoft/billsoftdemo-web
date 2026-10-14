// src/features/sales/deliveryChallan/DeliveryChallanFormPage.tsx
//
// BRD 6.4.4 Delivery Challan (GST Rule 55):
//  - Order based: lines come from a Sale Order's pending quantity
//  - Direct: goods sent ahead of the invoice
//  - Non billable: goods move without a sale (job work, approval, repair,
//    sample) - say why; job work is always returnable (s.143 clock).
// Stock leaves the chosen godown when the challan is saved.

import { useEffect, useMemo } from "react";
import { Alert, Button, Checkbox, DatePicker, Divider, Form, Input, InputNumber, Radio, Select, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dayjs from "dayjs";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { showApiErrorPopup } from "../../../lib/apiError";
import { usePartiesQuery } from "../../parties/api";
import { saleOrderApi } from "../saleOrder/api";
import type { SaleOrderLine } from "../saleOrder/types";
import {
  StatusTag,
  customerOptions,
  money,
  showFormErrors,
  today,
  useGodownOptions,
  type CustomerParty,
} from "../shared/components";
import { useSalesItemOptions } from "../shared/PricedDocumentBody";
import { newRowKey, type SalesItemOption } from "../shared/SalesLineGrid";
import { EMPTY_SHIP_TO, ShipToFields, pickShipTo, type ShipToValues } from "../shared/ShipToFields";
import { deliveryChallanApi } from "./api";
import {
  DC_PURPOSE_OPTIONS,
  DC_TYPE_OPTIONS,
  TRANSPORT_MODE_OPTIONS,
  type DeliveryChallanLine,
} from "./types";

const lineSchema = z.looseObject({
  id: z.number().optional(),
  soItem: z.number().nullable().default(null),
  item: z.number({ error: "Item is required" }),
  description: z.string().default(""),
  uom: z.string().default(""),
  hsnSac: z.string().default(""),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  rejectionQty: z.coerce.number().nonnegative().default(0),
  rate: z.coerce.number().nonnegative("Rate must be 0 or more"),
  godown: z.number().nullable().default(null),
  remarks: z.string().default(""),
});

const challanSchema = z
  .object({
    dcType: z.enum(["Order", "Direct", "NonBillable"]),
    purpose: z.enum(["Supply", "JobWork", "SaleOnApproval", "Repair", "Sample", "Other"]),
    taxNature: z.enum(["Sales", "Labour"]).default("Sales"),
    dcDate: z.string().min(1, "DC date is required"),
    customer: z.number({ error: "Customer is required" }),
    saleOrder: z.number().nullable().default(null),
    customerPoNo: z.string().default(""),
    customerPoDate: z.string().nullable().default(null),
    kindAttn: z.string().default(""),
    toPlace: z.string().default(""),
    location: z.string().default(""),
    transportMode: z.string().default(""),
    vehicleNo: z.string().default(""),
    inwardDcNo: z.string().default(""),
    inwardDcDate: z.string().nullable().default(null),
    approxValue: z.coerce.number().nonnegative().default(0),
    returnable: z.boolean().default(false),
    goodsCategory: z.enum(["Inputs", "CapitalGoods"]).default("Inputs"),
    remarks: z.string().default(""),
    shipToName: z.string().default(""),
    shipToAddress1: z.string().default(""),
    shipToAddress2: z.string().default(""),
    shipToCity: z.string().default(""),
    shipToState: z.string().default(""),
    shipToPincode: z.string().default(""),
    shipToGstin: z.string().default(""),
    items: z.array(lineSchema).min(1, "At least one item is required"),
  })
  .superRefine((v, ctx) => {
    if (v.dcType === "Order" && !v.saleOrder) {
      ctx.addIssue({ code: "custom", path: ["saleOrder"], message: "Select the Sale Order being delivered" });
    }
    if (v.dcType === "NonBillable" && v.purpose === "Supply") {
      ctx.addIssue({ code: "custom", path: ["purpose"], message: "Say why the goods move without an invoice" });
    }
  });

type FormInput = z.input<typeof challanSchema>;
type FormValues = z.output<typeof challanSchema>;
type Row = DeliveryChallanLine & Record<string, unknown>;

const EMPTY: FormInput = {
  dcType: "Direct",
  purpose: "Supply",
  taxNature: "Sales",
  dcDate: today(),
  customer: undefined as unknown as number,
  saleOrder: null,
  customerPoNo: "",
  customerPoDate: null,
  kindAttn: "",
  toPlace: "",
  location: "",
  transportMode: "",
  vehicleNo: "",
  inwardDcNo: "",
  inwardDcDate: null,
  approxValue: 0,
  returnable: false,
  goodsCategory: "Inputs",
  remarks: "",
  ...EMPTY_SHIP_TO,
  items: [],
};

export function DeliveryChallanFormPage({ readOnly: readOnlyProp = false }: { readOnly?: boolean }) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isCreate = !id;
  const navigate = useNavigate();

  const { data: existing } = deliveryChallanApi.useOne(id);
  const { data: parties = [] } = usePartiesQuery();
  const itemOptions = useSalesItemOptions();
  const { options: godownOptions, defaultGodown } = useGodownOptions();
  const createMutation = deliveryChallanApi.useCreate();
  const updateMutation = deliveryChallanApi.useUpdate();
  const customers = parties as unknown as CustomerParty[];

  const hasDownstream =
    !!existing && (Number(existing.items.reduce((s, l) => s + Number(l.invoicedQty ?? 0) + Number(l.returnedQty ?? 0), 0)) > 0);
  const readOnly = readOnlyProp || existing?.status === "Cancelled" || hasDownstream;

  const { control, handleSubmit, reset, setValue, watch, formState } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(challanSchema),
    defaultValues: EMPTY,
  });
  const errors = formState.errors;

  useEffect(() => {
    if (!existing) return;
    reset({
      ...EMPTY,
      ...pickShipTo(existing),
      dcType: existing.dcType,
      purpose: existing.purpose,
      taxNature: existing.taxNature,
      dcDate: existing.dcDate,
      customer: existing.customer,
      saleOrder: existing.saleOrder,
      customerPoNo: existing.customerPoNo,
      customerPoDate: existing.customerPoDate,
      kindAttn: existing.kindAttn,
      toPlace: existing.toPlace,
      location: existing.location,
      transportMode: existing.transportMode,
      vehicleNo: existing.vehicleNo,
      inwardDcNo: existing.inwardDcNo,
      inwardDcDate: existing.inwardDcDate,
      approxValue: Number(existing.approxValue),
      returnable: existing.returnable,
      goodsCategory: existing.goodsCategory,
      remarks: existing.remarks,
      items: existing.items.map((l) => ({
        ...l,
        quantity: Number(l.quantity),
        rejectionQty: Number(l.rejectionQty),
        rate: Number(l.rate),
      })),
    });
  }, [existing, reset]);

  const values = watch();
  const customer = customers.find((p) => p.id === values.customer);
  const isOrder = values.dcType === "Order";
  const nonBillable = values.dcType === "NonBillable";
  const jobWork = values.purpose === "JobWork";

  // Pending Sale Orders of this customer (order-based challan).
  const { data: orders = [] } = saleOrderApi.useList({ customer: values.customer, status: "Pending" });
  const { data: pendingLines } = saleOrderApi.useGet<SaleOrderLine[]>(
    `${values.saleOrder}/pending-lines/`,
    undefined,
    isCreate && isOrder && !!values.saleOrder
  );

  // Picking an order fills the grid with what is still pending on it.
  useEffect(() => {
    if (!pendingLines || !isCreate) return;
    setValue(
      "items",
      pendingLines.map((l) => ({
        soItem: l.id!,
        item: l.item,
        itemCode: l.itemCode,
        description: l.description,
        uom: l.uom,
        hsnSac: l.hsnSac,
        quantity: Number(l.pendingQty),
        soPendingQty: l.pendingQty,
        rejectionQty: 0,
        rate: Number(l.rate),
        godown: defaultGodown,
        remarks: "",
        _rowKey: newRowKey(),
      }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingLines]);

  // ?saleOrder=<id> from the Sale Order list.
  const soParam = searchParams.get("saleOrder");
  useEffect(() => {
    if (!isCreate || !soParam) return;
    const order = orders.find((o) => o.id === Number(soParam));
    if (order && values.saleOrder !== order.id) {
      setValue("dcType", "Order");
      setValue("customer", order.customer);
      setValue("saleOrder", order.id);
      setValue("customerPoNo", order.customerPoNo);
      setValue("customerPoDate", order.customerPoDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, soParam]);

  const options = useMemo(() => customerOptions(customers, false, values.customer), [customers, values.customer]);

  function applyCustomer(partyId: number | undefined) {
    setValue("customer", partyId as number, { shouldValidate: formState.isSubmitted });
    setValue("saleOrder", null);
    if (isOrder) setValue("items", []);
    setValue("toPlace", customers.find((p) => p.id === partyId)?.city ?? "");
  }

  function changeType(dcType: "Order" | "Direct" | "NonBillable") {
    setValue("dcType", dcType);
    setValue("purpose", dcType === "NonBillable" ? "JobWork" : "Supply");
    setValue("returnable", dcType === "NonBillable");
    // Order lines and free lines don't mix.
    setValue("saleOrder", null);
    setValue("items", []);
  }

  function addItem(item: SalesItemOption) {
    setValue("items", [
      ...(values.items as Row[]),
      {
        soItem: null,
        item: item.id,
        itemCode: item.itemCode,
        description: item.itemDescription || item.itemName,
        uom: item.billingUom ?? "",
        hsnSac: item.hsnCode ?? "",
        quantity: 1,
        rejectionQty: 0,
        rate: Number(item.sellingPrice ?? 0),
        godown: item.itemType === "Service" ? null : defaultGodown,
        remarks: "",
        _rowKey: newRowKey(),
      },
    ]);
  }

  const rows = (values.items ?? []) as Row[];
  const patchRow = (i: number, changes: Partial<Row>) =>
    setValue("items", rows.map((r, j) => (j === i ? { ...r, ...changes } : r)), { shouldValidate: formState.isSubmitted });
  const lineValue = rows.reduce((s, r) => s + Number(r.quantity ?? 0) * Number(r.rate ?? 0), 0);

  async function onSubmit(formValues: FormValues) {
    const payload = { ...formValues, saleOrder: isOrder ? formValues.saleOrder : null };
    try {
      if (isCreate) await createMutation.mutateAsync(payload as never);
      else await updateMutation.mutateAsync({ id: Number(id), values: payload as never });
    } catch (error) {
      showApiErrorPopup("Could not save the Delivery Challan", error);
      return;
    }
    message.success("Saved Successfully");
    navigate("/sales/delivery-challan");
  }

  const num = (i: number, field: "quantity" | "rate" | "rejectionQty", width = 90, max?: number) => (
    <InputNumber
      style={{ width }}
      min={0}
      max={max}
      value={Number(rows[i][field] ?? 0)}
      onChange={(v) => patchRow(i, { [field]: v ?? 0 } as Partial<Row>)}
    />
  );

  const columns: ColumnsType<Row> = [
    { title: "#", key: "sl", width: 40, render: (_, __, i) => i + 1 },
    { title: "Item", key: "item", render: (_, r) => <strong>{r.itemCode ?? itemOptions.find((o) => o.id === r.item)?.itemCode}</strong> },
    {
      title: "Description",
      key: "desc",
      render: (_, r, i) =>
        readOnly ? r.description : <Input style={{ width: 200 }} value={r.description} onChange={(e) => patchRow(i, { description: e.target.value })} />,
    },
    { title: "HSN/SAC", dataIndex: "hsnSac" },
    ...(isOrder ? [{ title: "Pending on SO", key: "sop", render: (_: unknown, r: Row) => (r.soPendingQty != null ? Number(r.soPendingQty) : "-") }] : []),
    {
      title: "Qty",
      key: "qty",
      render: (_, r, i) => (readOnly ? Number(r.quantity) : num(i, "quantity", 90, r.soPendingQty != null && isCreate ? Number(r.soPendingQty) : undefined)),
    },
    { title: "Unit", dataIndex: "uom" },
    { title: "Rate", key: "rate", render: (_, r, i) => (readOnly ? money(r.rate) : num(i, "rate", 100)) },
    { title: "Amount", key: "amt", render: (_, r) => money(Number(r.quantity ?? 0) * Number(r.rate ?? 0)) },
    {
      title: "Godown",
      key: "godown",
      render: (_, r, i) =>
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
    {
      title: "Remarks",
      key: "remarks",
      render: (_, r, i) =>
        readOnly ? r.remarks || "-" : <Input style={{ width: 140 }} value={r.remarks} onChange={(e) => patchRow(i, { remarks: e.target.value })} />,
    },
    ...(existing
      ? [
          { title: "Invoiced", key: "inv", render: (_: unknown, r: Row) => (r.id ? Number(r.invoicedQty ?? 0) : "-") },
          ...(existing.returnable ? [{ title: "Returned", key: "ret", render: (_: unknown, r: Row) => (r.id ? Number(r.returnedQty ?? 0) : "-") }] : []),
        ]
      : []),
    ...(readOnly ? [] : [{ title: "", key: "rm", render: (_: unknown, __: Row, i: number) => <a onClick={() => setValue("items", rows.filter((_, j) => j !== i))}>Remove</a> }]),
  ];

  const dateField = (name: "dcDate" | "customerPoDate" | "inwardDcDate", label: string, required = false) => (
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
  const textField = (name: "customerPoNo" | "kindAttn" | "toPlace" | "location" | "vehicleNo" | "inwardDcNo", label: string) => (
    <Form.Item label={label}>
      <Controller name={name} control={control} render={({ field }) => <Input {...field} disabled={readOnly} />} />
    </Form.Item>
  );

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit, showFormErrors)}>
      <h2 style={{ marginTop: 0 }}>
        {isCreate ? "New Delivery Challan" : `Delivery Challan ${existing?.dcNumber ?? ""}`}{" "}
        {existing && <StatusTag status={existing.status} />}
      </h2>
      {hasDownstream && !readOnlyProp && (
        <Alert type="info" showIcon style={{ marginBottom: 16 }} title="This challan has been invoiced or received back, so it can no longer be edited." />
      )}
      {existing?.status === "Cancelled" && (
        <Alert type="error" showIcon style={{ marginBottom: 16 }} title={`Cancelled${existing.cancelReason ? ` - ${existing.cancelReason}` : ""}. Stock has been put back.`} />
      )}

      <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
        <Form.Item label="Challan Type">
          <Radio.Group
            disabled={readOnly || !isCreate}
            value={values.dcType}
            onChange={(e) => changeType(e.target.value)}
            options={DC_TYPE_OPTIONS}
            optionType="button"
          />
        </Form.Item>
        {nonBillable && (
          <Form.Item label="Purpose" required validateStatus={errors.purpose ? "error" : undefined} help={errors.purpose?.message}>
            <Controller
              name="purpose"
              control={control}
              render={({ field }) => (
                <Select
                  style={{ width: 220 }}
                  disabled={readOnly}
                  value={field.value === "Supply" ? undefined : field.value}
                  options={DC_PURPOSE_OPTIONS}
                  onChange={(v) => {
                    field.onChange(v);
                    if (v === "JobWork") setValue("returnable", true);
                  }}
                />
              )}
            />
          </Form.Item>
        )}
        <Form.Item label="Nature">
          <Controller
            name="taxNature"
            control={control}
            render={({ field }) => (
              <Radio.Group
                disabled={readOnly}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                options={[
                  { value: "Sales", label: "Sales" },
                  { value: "Labour", label: "Labour" },
                ]}
              />
            )}
          />
        </Form.Item>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", columnGap: 24 }}>
        <Form.Item label="Customer" required style={{ gridColumn: "span 2" }} validateStatus={errors.customer ? "error" : undefined} help={errors.customer?.message}>
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
        {isOrder && (
          <Form.Item label="Sale Order" required validateStatus={errors.saleOrder ? "error" : undefined} help={errors.saleOrder?.message}>
            <Controller
              name="saleOrder"
              control={control}
              render={({ field }) => (
                <Select
                  showSearch
                  optionFilterProp="label"
                  disabled={readOnly || !isCreate || !values.customer}
                  placeholder={values.customer ? "Pending orders" : "Select a customer first"}
                  value={field.value ?? undefined}
                  onChange={(v) => {
                    field.onChange(v);
                    const o = orders.find((x) => x.id === v);
                    if (o) {
                      setValue("customerPoNo", o.customerPoNo);
                      setValue("customerPoDate", o.customerPoDate);
                    }
                  }}
                  options={[
                    ...orders.map((o) => ({ value: o.id, label: `${o.displayNumber} (${o.soDate})` })),
                    ...(existing?.saleOrder && !orders.some((o) => o.id === existing.saleOrder)
                      ? [{ value: existing.saleOrder, label: existing.soNumber ?? "" }]
                      : []),
                  ]}
                />
              )}
            />
          </Form.Item>
        )}
        {dateField("dcDate", "DC Date", true)}
        {textField("customerPoNo", "Customer PO No.")}
        {dateField("customerPoDate", "Customer PO Date")}
        {textField("kindAttn", "Kind Attn.")}
        {textField("toPlace", "To Place")}
        {textField("location", "Location")}
        <Form.Item label="Transport Mode">
          <Controller
            name="transportMode"
            control={control}
            render={({ field }) => (
              <Select allowClear disabled={readOnly} value={field.value || undefined} onChange={(v) => field.onChange(v ?? "")} options={TRANSPORT_MODE_OPTIONS} />
            )}
          />
        </Form.Item>
        {textField("vehicleNo", "Vehicle No.")}
        {(nonBillable || values.inwardDcNo) && (
          <>
            {textField("inwardDcNo", "Customer's (Inward) DC No.")}
            {dateField("inwardDcDate", "Inward DC Date")}
          </>
        )}
        <Form.Item label="Approx. Value" tooltip="Rule 55: a challan must state the value of the goods. Left at 0, it is taken from qty x rate.">
          <Controller
            name="approxValue"
            control={control}
            render={({ field }) => (
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                disabled={readOnly}
                placeholder={money(lineValue)}
                value={Number(field.value) || null}
                onChange={(v) => field.onChange(v ?? 0)}
              />
            )}
          />
        </Form.Item>
      </div>

      {nonBillable && (
        <div style={{ display: "flex", gap: 32, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
          <Controller
            name="returnable"
            control={control}
            render={({ field }) => (
              <Checkbox disabled={readOnly || jobWork} checked={field.value} onChange={(e) => field.onChange(e.target.checked)}>
                Returnable (goods come back){jobWork ? " - always for job work" : ""}
              </Checkbox>
            )}
          />
          {values.returnable && (
            <Controller
              name="goodsCategory"
              control={control}
              render={({ field }) => (
                <Radio.Group
                  disabled={readOnly}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  options={[
                    { value: "Inputs", label: "Inputs (due back in 1 year)" },
                    { value: "CapitalGoods", label: "Capital goods (3 years)" },
                  ]}
                />
              )}
            />
          )}
          {existing?.returnDueDate && <span>Return due by <strong>{existing.returnDueDate}</strong></span>}
        </div>
      )}

      <Divider titlePlacement="start">Ship To</Divider>
      <ShipToFields
        value={pickShipTo(values as Partial<ShipToValues>)}
        onChange={(next) => Object.entries(next).forEach(([k, v]) => setValue(k as keyof ShipToValues, v))}
        customer={customer}
        readOnly={readOnly}
      />

      <Divider titlePlacement="start">Items</Divider>
      {!readOnly && !isOrder && (
        <Select
          style={{ width: 340, marginBottom: 12 }}
          showSearch
          optionFilterProp="label"
          placeholder="Add item - search by code or name"
          value={null}
          options={itemOptions.map((o) => ({ value: o.id, label: `${o.itemCode} - ${o.itemName}` }))}
          onChange={(v) => {
            const item = itemOptions.find((o) => o.id === v);
            if (item) addItem(item);
          }}
        />
      )}
      {isOrder && isCreate && !values.saleOrder && <div style={{ color: "#8c8c8c", marginBottom: 8 }}>Pick the Sale Order - its pending lines load here.</div>}
      <Table<Row>
        size="small"
        pagination={false}
        rowKey={(r) => String(r.id ?? r._rowKey ?? r.soItem ?? r.item)}
        dataSource={rows}
        columns={columns}
        scroll={{ x: "max-content" }}
        locale={{ emptyText: "No items yet" }}
        summary={() =>
          rows.length ? (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={4}>
                <strong>Total</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} colSpan={columns.length - 4}>
                Qty {rows.reduce((s, r) => s + Number(r.quantity ?? 0), 0)} · Value ₹{money(lineValue)}
              </Table.Summary.Cell>
            </Table.Summary.Row>
          ) : null
        }
      />
      {errors.items?.message && <div style={{ color: "#ff4d4f", marginTop: 6 }}>{errors.items.message}</div>}

      <Form.Item label="Remarks" style={{ marginTop: 16 }}>
        <Controller name="remarks" control={control} render={({ field }) => <Input.TextArea rows={2} {...field} disabled={readOnly} />} />
      </Form.Item>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Button onClick={() => navigate("/sales/delivery-challan")}>{readOnly ? "Close" : "Cancel"}</Button>
        {!readOnly && (
          <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
            Save
          </Button>
        )}
      </div>
    </Form>
  );
}
