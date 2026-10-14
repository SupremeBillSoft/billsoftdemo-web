// src/features/sales/quotation/QuotationFormPage.tsx
//
// BRD 6.4.2 Quotation. Can start from an Enquiry (?enquiry=<id>); locked
// once Accepted / Declined / Converted. Totals preview mirrors the server.
//
// CHANGES vs the previous version (search for "// NEW"):
//   1. quotationYearCode - financial year code, calculated when the date is picked
//   2. estimationType + sub items (breakups) are sent to the API with each line

import { useEffect, useMemo } from "react";
import { Alert, Button, DatePicker, Divider, Form, Input, Select, message } from "antd";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dayjs from "dayjs";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { showApiErrorPopup } from "../../../lib/apiError";
import { useLineTaxContext } from "../../../lib/gst/lineTax";
import { STATE_OPTIONS } from "../../../lib/states";
import { usePartiesQuery } from "../../parties/api";
import { enquiryApi } from "../enquiry/api";
import { StatusTag, customerOptions, showFormErrors, today, type CustomerParty } from "../shared/components";
import { PricedDocumentBody, type PricedBodyValues } from "../shared/PricedDocumentBody";
import { QuotationGrid, EST_BREAKUP, EST_DIRECT, type BreakupLine, type QuotationLineRow } from "./QuotationGrid";
import { PRICED_DEFAULTS, cleanCustomFields, pricedDocumentShape, pricedFromServer } from "../shared/schema";
import { quotationApi } from "./api";
import { LOCKED_QUOTATION_STATUSES } from "./types";
import type { SalesLineRow } from "../shared/SalesLineGrid1";
import { newRowKey } from "../shared/SalesLineGrid";
import { useEnterAsTab } from "../../../lib/useEnterAsTab";

// NEW: Indian financial year (Apr-Mar) code from a YYYY-MM-DD date: 2025-06-10 -> "2526", 2026-02-01 -> "2526"
export function financialYearCode(date: string): string {
  const d = dayjs(date);
  const start = d.month() >= 3 ? d.year() : d.year() - 1;
  const yy = (n: number) => String(n % 100).padStart(2, "0");
  return `${yy(start)}${yy(start + 1)}`;
}

// NEW: quotation lines are keyed in (no Item Master pick), so `item` is optional here.
// passthrough() keeps the grid-only keys (estimationType, breakups, _rowKey ...) instead of stripping them.
const breakupLineSchema = z
  .object({
    description: z.string().trim().min(1, "Sub item description is required"),
    hsnSac: z.string().default(""),
    quantity: z.number().min(0).default(0),
    uom: z.string().default(""),
    rate: z.number().min(0).default(0),
  })
  .passthrough();

const quotationLineSchema = z
  .object({
    id: z.number().optional(),
    item: z.number().nullable().default(null),
    description: z.string().trim().min(1, "Description is required"),
    hsnSac: z.string().default(""),
    uom: z.string().default(""),
    quantity: z.number().positive("Quantity must be greater than 0"),
    rate: z.number().min(0).default(0),
    discountPercent: z.number().min(0).max(100).default(0),
    discountAmount: z.number().min(0).default(0),
    tax: z.number().nullable().default(null),
    estimationType: z.string().default("Direct"),
    breakups: z.array(breakupLineSchema).default([]),
  })
  .passthrough();

// "Steel  Rod" and "steel rod" count as the same description
const descKey = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

const quotationSchema = z
  .object({
    ...pricedDocumentShape,
    items: z.array(quotationLineSchema).min(1, "At least one item is required"),
    quotationDate: z.string().min(1, "Quotation date is required"),
    quotationYearCode: z.string().regex(/^\d{4}$/, "Year code is missing - pick the quotation date"), // NEW
    validTill: z.string().nullable().default(null),
    enquiry: z.number().nullable().default(null),
    contactPerson: z.string().default(""),
    kindAttn: z.string().default(""),
    terms: z.string().default(""),
    delivery: z.string().default(""),
    packages: z.string().default(""),
    followUpDate: z.string().nullable().default(null),
  })
  .superRefine((v, ctx) => {
    if (v.validTill && v.validTill < v.quotationDate) {
      ctx.addIssue({ code: "custom", path: ["validTill"], message: "Valid Till can't be before the quotation date" });
    }

    // NEW: no repeated description among the lines, and none among one line's sub items.
    // (A sub item may reuse a description that appears on a line - only same-level repeats are blocked.)
    const lineSeen = new Map<string, number>();
    v.items.forEach((line, i) => {
      const key = descKey(line.description);
      const first = lineSeen.get(key);
      if (first !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["items", i, "description"],
          message: `"${line.description.trim()}" is already used on line ${first + 1}`,
        });
      } else {
        lineSeen.set(key, i);
      }

      const subSeen = new Map<string, number>();
      line.breakups.forEach((b, j) => {
        const subKey = descKey(b.description);
        const firstSub = subSeen.get(subKey);
        if (firstSub !== undefined) {
          ctx.addIssue({
            code: "custom",
            path: ["items", i, "breakups", j, "description"],
            message: `Sub item "${b.description.trim()}" is already used on ${i + 1}.${firstSub + 1}`,
          });
        } else {
          subSeen.set(subKey, j);
        }
      });
    });
  });

type QuotationFormInput = z.input<typeof quotationSchema>;
type QuotationFormValues = z.output<typeof quotationSchema>;

const EMPTY: QuotationFormInput = {
  ...PRICED_DEFAULTS,
  customer: undefined as unknown as number,
  quotationDate: today(),
  quotationYearCode: financialYearCode(today()), // NEW
  validTill: dayjs().add(30, "day").format("YYYY-MM-DD"),
  enquiry: null,
  contactPerson: "",
  kindAttn: "",
  terms: "",
  delivery: "",
  packages: "",
  followUpDate: null,
};

const TEXT_FIELDS = [
  { name: "contactPerson", label: "Contact Person" },
  { name: "kindAttn", label: "Kind Attn." },
  { name: "delivery", label: "Delivery" },
  { name: "packages", label: "Packages" },
] as const;

// NEW: what the API expects for each line's estimation type + sub items.
// The zod schema strips keys it doesn't know, so these come from the raw form rows.
function lineExtras(row: QuotationLineRow | undefined) {
  const estimationType = row?.estimationType === EST_BREAKUP ? EST_BREAKUP : EST_DIRECT;
  const breakups =
    estimationType === EST_BREAKUP
      ? (row?.breakups ?? []).map((b) => ({
          description: b.description ?? "",
          hsnSac: b.hsnSac ?? "",
          quantity: Number(b.quantity ?? 0),
          uom: b.uom ?? "",
          rate: Number(b.rate ?? 0),
        }))
      : [];
  return { estimationType, breakups };
}

export function QuotationFormPage({ readOnly: readOnlyProp = false }: { readOnly?: boolean }) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const enquiryParam = searchParams.get("enquiry");
  const isCreate = !id;
  const navigate = useNavigate();

  const { data: existing } = quotationApi.useOne(id);
  const { data: fromEnquiry } = enquiryApi.useOne(isCreate ? enquiryParam : null);
  const { data: openEnquiries = [] } = enquiryApi.useList({ status: "Open" });
  const { data: parties = [] } = usePartiesQuery();
  const createMutation = quotationApi.useCreate();
  const updateMutation = quotationApi.useUpdate();

  const locked = !!existing && LOCKED_QUOTATION_STATUSES.includes(existing.status);
  const readOnly = readOnlyProp || locked;
  const customers = parties as unknown as CustomerParty[];

  const { control, handleSubmit, reset, setValue, getValues, watch, formState } = useForm<
    QuotationFormInput,
    unknown,
    QuotationFormValues
  >({ resolver: zodResolver(quotationSchema), defaultValues: EMPTY });
  const errors = formState.errors;

  useEffect(() => {
    if (existing) {
      // NEW: keep estimationType + sub items from the server rows (pricedFromServer may not carry them)
      const server = existing as unknown as {
        quotationYearCode: string;
        items?: { estimationType?: string; breakups?: BreakupLine[] }[];
      };
      const base = pricedFromServer(existing as unknown as Record<string, unknown>) as unknown as {
        items?: SalesLineRow[];
      };
      const items = (base.items ?? []).map((row, i) => ({
        ...row,
        estimationType: server.items?.[i]?.estimationType ?? EST_DIRECT,
        // the API sends Decimal fields as strings ("101.000"); the grid and the schema need numbers
        breakups: (server.items?.[i]?.breakups ?? []).map((b) => ({
          ...b,
          quantity: Number(b.quantity ?? 0),
          rate: Number(b.rate ?? 0),
          _rowKey: newRowKey(),
        })),
      }));

      reset({
        ...EMPTY,
        ...(base as object),
        items: items as never,
        customer: existing.customer,
        quotationDate: existing.quotationDate,
        quotationYearCode: server.quotationYearCode, // NEW: never recomputed on edit
        validTill: existing.validTill,
        enquiry: existing.enquiry,
        contactPerson: existing.contactPerson,
        kindAttn: existing.kindAttn,
        terms: existing.terms,
        delivery: existing.delivery,
        packages: existing.packages,
        followUpDate: existing.followUpDate,
      });
    }
  }, [existing, reset]);

  const enterAsTab = useEnterAsTab(() =>
    document.querySelector<HTMLElement>('.ag-cell[col-id="description"]')?.focus(),
  );

  const values = watch();
  const customer = customers.find((p) => p.id === values.customer);
  const buyerState = values.placeOfSupply || customer?.state || "";
  const taxContext = useLineTaxContext(buyerState);
  const options = useMemo(() => customerOptions(customers, false, values.customer), [customers, values.customer]);

  function applyCustomer(partyId: number | undefined) {
    setValue("customer", partyId as number, { shouldValidate: true });
    const party = customers.find((p) => p.id === partyId);
    setValue("placeOfSupply", party?.state ?? "");
    if (party?.partyContactPerson && !values.contactPerson) setValue("contactPerson", party.partyContactPerson);
  }

  function applyEnquiry(enquiryId: number | null, enquiry = openEnquiries.find((e) => e.id === enquiryId)) {
    setValue("enquiry", enquiryId);
    if (!enquiry) return;
    if (enquiry.customer) applyCustomer(enquiry.customer);
    if (enquiry.contactPerson) setValue("contactPerson", enquiry.contactPerson);
  }

  // Started from an Enquiry row action: link it and carry its customer over.
  useEffect(() => {
    if (isCreate && fromEnquiry) applyEnquiry(fromEnquiry.id, fromEnquiry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromEnquiry, isCreate]);

  const linkedEnquiry = fromEnquiry ?? openEnquiries.find((e) => e.id === values.enquiry);
  const prospectOnly = isCreate && linkedEnquiry && !linkedEnquiry.customer && !values.customer;

  const setField = (name: string, value: unknown) =>
    setValue(name as keyof QuotationFormInput, value as never, { shouldDirty: true, shouldValidate: formState.isSubmitted });

  async function onSubmit(formValues: QuotationFormValues) {
    // NEW: put estimationType + breakups back on each line (zod output drops them)
    const rawItems = getValues("items") as unknown as QuotationLineRow[];
    const items = (formValues.items as unknown as SalesLineRow[]).map((line, i) => ({
      ...line,
      ...lineExtras(rawItems[i]),
    }));
    const payload = cleanCustomFields({ ...formValues, items });
    try {
      if (isCreate) await createMutation.mutateAsync(payload as never);
      else await updateMutation.mutateAsync({ id: Number(id), values: payload as never });
    } catch (error) {
      showApiErrorPopup("Could not save the Quotation", error);
      return;
    }
    message.success("Saved Successfully");
    navigate("/sales/quotation");
  }

  const dateField = (name: "quotationDate" | "validTill" | "followUpDate", label: string, required = false) => (
    <Form.Item
      label={label}
      required={required}
      validateStatus={errors[name] ? "error" : undefined}
      help={errors[name]?.message as string | undefined}
    >
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <DatePicker
            style={{ width: "100%" }}
            disabled={readOnly}
            value={field.value ? dayjs(field.value) : null}
            onChange={(d) => {
              field.onChange(d ? d.format("YYYY-MM-DD") : required ? "" : null);
              // NEW: the year code follows the quotation date - on create only
              if (name === "quotationDate" && isCreate && d) {
                setValue("quotationYearCode", financialYearCode(d.format("YYYY-MM-DD")), { shouldValidate: true });
              }
            }}
          />
        )}
      />
    </Form.Item>
  );

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit, showFormErrors)}>
      <h2 style={{ marginTop: 0 }}>
        {isCreate ? "New Quotation" : `Quotation ${existing?.quotationNumber ?? ""} / ${existing?.quotationYearCode ?? ""}`}{" "}
        {existing && <StatusTag status={existing.isExpired ? "Expired" : existing.status} />}
      </h2>
      {locked && !readOnlyProp && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title={`This quotation is ${existing?.status} and can no longer be modified.`}
        />
      )}
      {prospectOnly && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          title={`Enquiry ${linkedEnquiry?.enquiryNumber} is from a prospect ("${linkedEnquiry?.customerName}") who isn't a customer yet.`}
          description={
            <span>
              A quotation needs a customer from Party Master. <a onClick={() => navigate("/parties/new")}>Add the customer</a>,
              then pick them below.
            </span>
          }
        />
      )}

      <div {...enterAsTab} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", columnGap: 24 }}>
        <Form.Item
          label="Customer"
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
                disabled={readOnly}
                placeholder="Select customer"
                value={field.value ?? undefined}
                options={options}
                onChange={applyCustomer}
              />
            )}
          />
        </Form.Item>
        <Form.Item label="Enquiry No. (optional)">
          <Controller
            name="enquiry"
            control={control}
            render={({ field }) => (
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                disabled={readOnly}
                value={field.value ?? undefined}
                onChange={(v) => applyEnquiry(v ?? null)}
                options={[
                  ...openEnquiries.map((e) => ({ value: e.id, label: `${e.enquiryNumber} - ${e.customerName}` })),
                  ...(existing?.enquiry && !openEnquiries.some((e) => e.id === existing.enquiry)
                    ? [{ value: existing.enquiry, label: existing.enquiryNumber ?? String(existing.enquiry) }]
                    : []),
                ]}
              />
            )}
          />
        </Form.Item>
        <Form.Item label="Place of Supply" tooltip="Defaults to the customer's state; decides CGST+SGST vs IGST">
          <Controller
            name="placeOfSupply"
            control={control}
            render={({ field }) => (
              <Select
                showSearch
                disabled={readOnly}
                value={field.value || undefined}
                onChange={field.onChange}
                options={STATE_OPTIONS}
                placeholder="Customer's state"
              />
            )}
          />
        </Form.Item>
        {dateField("quotationDate", "Quotation Date", true)}
        {/* NEW: shown for information; calculated from the quotation date */}
        <Form.Item
          label="Year Code"
          validateStatus={errors.quotationYearCode ? "error" : undefined}
          help={errors.quotationYearCode?.message}
        >
          <Input value={values.quotationYearCode} disabled />
        </Form.Item>
        {dateField("validTill", "Valid Till")}
        {dateField("followUpDate", "Follow-up Date")}
        {TEXT_FIELDS.map(({ name, label }) => (
          <Form.Item key={name} label={label}>
            <Controller name={name} control={control} render={({ field }) => <Input {...field} disabled={readOnly} />} />
          </Form.Item>
        ))}
      </div>
      <Form.Item label="Terms & Conditions">
        <Controller name="terms" control={control} render={({ field }) => <Input.TextArea rows={2} {...field} disabled={readOnly} />} />
      </Form.Item>

      <PricedDocumentBody<SalesLineRow>
        Grid={QuotationGrid}
        values={values as unknown as PricedBodyValues<SalesLineRow>}
        setField={setField}
        buyerState={buyerState}
        taxContext={taxContext}
        readOnly={readOnly}
        itemsError={errors.items?.message ?? errors.items?.root?.message}
      />

      <Divider />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Button onClick={() => navigate("/sales/quotation")}>{readOnly ? "Close" : "Cancel"}</Button>
        {!readOnly && (
          <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
            Save
          </Button>
        )}
      </div>
    </Form>
  );
}
