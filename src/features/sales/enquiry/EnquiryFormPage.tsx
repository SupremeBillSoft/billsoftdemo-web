// src/features/sales/enquiry/EnquiryFormPage.tsx
//
// BRD 6.4.1 Enquiry: customer + source details, feasibility, and the
// follow-up schedule. Saved to /api/sales/enquiries/ - the number is
// assigned by the server from Document Number Format.

import { useEffect, useMemo, useState } from "react";
import {
  AutoComplete,
  Button,
  Checkbox,
  DatePicker,
  Divider,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Table,
  TimePicker,
  message,
} from "antd";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";
import { showApiErrorPopup } from "../../../lib/apiError";
import { usePartiesQuery } from "../../parties/api";
import {
  CustomFieldsEditor,
  StatusTag,
  customerOptions,
  partyAddress,
  showFormErrors,
  today,
  type CustomerParty,
} from "../shared/components";
import { customFieldSchema } from "../shared/schema";
import { enquiryApi, useAddFollowUpMutation, useUpdateFollowUpMutation } from "./api";
import {
  BUSINESS_TYPES,
  COMPANY_TYPES,
  DIVISIONS,
  ENQUIRY_MODES,
  FOLLOW_UP_MODES,
  INDUSTRY_TYPES,
  type EnquiryFollowUp,
} from "./types";

const enquirySchema = z
  .object({
    enquiryDate: z.string().min(1, "Enquiry date is required"),
    enquiryMode: z.string().default(""),
    referenceBy: z.string().default(""),
    area: z.string().default(""),
    industryType: z.string().default(""),
    companyType: z.string().default(""),
    customer: z.number().nullable().default(null),
    customerName: z.string().trim().min(1, "Customer name is required"),
    address: z.string().default(""),
    volume: z.string().default(""),
    feasibility: z.boolean().nullable().default(null),
    businessType: z.string().default(""),
    contactPerson: z.string().default(""),
    contactNumber: z.string().regex(/^\d*$/, "Contact number must be numeric").default(""),
    email: z.union([z.literal(""), z.email("Enter a valid email")]).default(""),
    website: z.string().default(""),
    enquiryDetails: z.string().default(""),
    division: z.string().default(""),
    preparedBy: z.string().default(""),
    status: z.enum(["Open", "Closed"]).default("Open"),
    customFields: z.array(customFieldSchema).default([]),
    nextFollowUpDate: z.string().nullable().default(null),
    nextFollowUpTime: z.string().nullable().default(null),
  })
  .superRefine((v, ctx) => {
    if (v.nextFollowUpDate && v.nextFollowUpDate < today()) {
      ctx.addIssue({ code: "custom", path: ["nextFollowUpDate"], message: "Follow-up date cannot be in the past" });
    }
  });

type EnquiryFormInput = z.input<typeof enquirySchema>;
type EnquiryFormValues = z.output<typeof enquirySchema>;

const EMPTY: EnquiryFormInput = {
  enquiryDate: today(),
  enquiryMode: "",
  referenceBy: "",
  area: "",
  industryType: "",
  companyType: "",
  customer: null,
  customerName: "",
  address: "",
  volume: "",
  feasibility: null,
  businessType: "",
  contactPerson: "",
  contactNumber: "",
  email: "",
  website: "",
  enquiryDetails: "",
  division: "",
  preparedBy: "",
  status: "Open",
  customFields: [],
  nextFollowUpDate: null,
  nextFollowUpTime: null,
};

const TEXT_FIELDS = [
  { name: "referenceBy", label: "Reference By" },
  { name: "area", label: "Area" },
  { name: "volume", label: "Volume" },
  { name: "contactPerson", label: "Contact Person" },
  { name: "contactNumber", label: "Contact Number" },
  { name: "email", label: "Email" },
  { name: "website", label: "Website" },
  { name: "preparedBy", label: "Prepared By" },
] as const;

const PICK_FIELDS = [
  { name: "enquiryMode", label: "Enquiry Mode", options: ENQUIRY_MODES },
  { name: "industryType", label: "Industry Type", options: INDUSTRY_TYPES },
  { name: "companyType", label: "Type of Company", options: COMPANY_TYPES },
  { name: "businessType", label: "Business Type", options: BUSINESS_TYPES },
  { name: "division", label: "Division", options: DIVISIONS },
] as const;

export function EnquiryFormPage({ readOnly = false }: { readOnly?: boolean }) {
  const { id } = useParams();
  const isCreate = !id;
  const navigate = useNavigate();
  const { data: existing } = enquiryApi.useOne(id);
  const { data: parties = [] } = usePartiesQuery();
  const createMutation = enquiryApi.useCreate();
  const updateMutation = enquiryApi.useUpdate();
  const [followUpOpen, setFollowUpOpen] = useState(false);

  const customers = parties as unknown as CustomerParty[];
  const isClosed = existing?.status === "Closed";

  const { control, handleSubmit, reset, setValue, watch, formState } = useForm<
    EnquiryFormInput,
    unknown,
    EnquiryFormValues
  >({ resolver: zodResolver(enquirySchema), defaultValues: EMPTY });
  const errors = formState.errors;

  useEffect(() => {
    if (existing) {
      const { followUps: _f, followUpState: _s, id: _i, enquiryNumber: _n, createdAt: _c, ...rest } = existing;
      // The schedule is edited in the Follow-ups table once saved.
      reset({ ...EMPTY, ...rest, nextFollowUpDate: null, nextFollowUpTime: null });
    }
  }, [existing, reset]);

  const customerId = watch("customer");
  const status = watch("status");
  const feasibility = watch("feasibility");
  const options = useMemo(() => customerOptions(customers, false, customerId), [customers, customerId]);

  function handleCustomerChange(partyId: number | undefined) {
    setValue("customer", partyId ?? null);
    const party = customers.find((p) => p.id === partyId);
    if (!party) return;
    setValue("customerName", party.partyName, { shouldValidate: true });
    setValue("address", partyAddress(party));
    if (party.partyContactPerson) setValue("contactPerson", party.partyContactPerson);
    if (party.mobileNo) setValue("contactNumber", String(party.mobileNo).replace(/\D/g, ""));
    if (party.email) setValue("email", party.email);
  }

  async function save(values: EnquiryFormValues, andNew: boolean) {
    const payload = { ...values, customFields: values.customFields.filter((f) => f.name.trim()) };
    if (isCreate && payload.status === "Open" && payload.feasibility !== false && !payload.nextFollowUpDate) {
      Modal.warning({ title: "Next follow-up date is required", content: "An open enquiry needs its next follow-up scheduled." });
      return;
    }
    try {
      if (isCreate) await createMutation.mutateAsync(payload);
      else await updateMutation.mutateAsync({ id: Number(id), values: payload });
    } catch (error) {
      showApiErrorPopup("Could not save the Enquiry", error);
      return;
    }
    message.success("Saved Successfully");
    if (andNew) {
      reset(EMPTY);
      navigate("/enquiry/new");
    } else navigate("/enquiry");
  }

  const fieldError = (name: keyof EnquiryFormInput) =>
    errors[name] ? { validateStatus: "error" as const, help: String(errors[name]?.message) } : {};

  return (
    <Form layout="vertical" onFinish={handleSubmit((v) => save(v, false), showFormErrors)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>
          {isCreate ? "New Enquiry" : `Enquiry ${existing?.enquiryNumber ?? ""}`}{" "}
          {existing && <StatusTag status={existing.status} />}
        </h2>
        {existing && existing.status === "Open" && (
          <Button onClick={() => navigate(`/sales/quotation/new?enquiry=${existing.id}`)}>Create Quotation</Button>
        )}
      </div>

      <Divider titlePlacement="start">Customer & Source</Divider>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", columnGap: 24 }}>
        <Form.Item label="Enquiry Date" required {...fieldError("enquiryDate")}>
          <Controller
            name="enquiryDate"
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
        <Form.Item label="Existing Customer (optional)" style={{ gridColumn: "span 2" }}>
          <Controller
            name="customer"
            control={control}
            render={({ field }) => (
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                disabled={readOnly}
                placeholder="Pick a customer, or type a prospect name below"
                value={field.value ?? undefined}
                options={options}
                onChange={handleCustomerChange}
              />
            )}
          />
        </Form.Item>
        <Form.Item label="Customer / Prospect Name" required {...fieldError("customerName")}>
          <Controller name="customerName" control={control} render={({ field }) => <Input {...field} disabled={readOnly} />} />
        </Form.Item>
        {PICK_FIELDS.map(({ name, label, options: opts }) => (
          <Form.Item key={name} label={label}>
            <Controller
              name={name}
              control={control}
              render={({ field }) => (
                <AutoComplete
                  {...field}
                  disabled={readOnly}
                  options={opts}
                  placeholder="Select or type"
                  filterOption={(input, option) => String(option?.value ?? "").toLowerCase().includes(input.toLowerCase())}
                />
              )}
            />
          </Form.Item>
        ))}
        {TEXT_FIELDS.map(({ name, label }) => (
          <Form.Item key={name} label={label} {...fieldError(name)}>
            <Controller name={name} control={control} render={({ field }) => <Input {...field} disabled={readOnly} />} />
          </Form.Item>
        ))}
      </div>
      <Form.Item label="Address">
        <Controller name="address" control={control} render={({ field }) => <Input.TextArea rows={2} {...field} disabled={readOnly} />} />
      </Form.Item>
      <Form.Item label="Enquiry Details">
        <Controller
          name="enquiryDetails"
          control={control}
          render={({ field }) => <Input.TextArea rows={3} {...field} disabled={readOnly} />}
        />
      </Form.Item>

      <Divider titlePlacement="start">Feasibility & Status</Divider>
      <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
        <Form.Item label="Feasible?">
          <Controller
            name="feasibility"
            control={control}
            render={({ field }) => (
              <Radio.Group
                disabled={readOnly}
                value={field.value === null ? "na" : field.value ? "yes" : "no"}
                onChange={(e) => {
                  const v = e.target.value === "na" ? null : e.target.value === "yes";
                  field.onChange(v);
                  if (v === false) setValue("status", "Closed");
                }}
                options={[
                  { value: "na", label: "Not assessed" },
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No (closes the enquiry)" },
                ]}
              />
            )}
          />
        </Form.Item>
        <Form.Item label="Status">
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Radio.Group
                disabled={readOnly || feasibility === false}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                options={[
                  { value: "Open", label: "Open" },
                  { value: "Closed", label: "Closed" },
                ]}
              />
            )}
          />
        </Form.Item>
        {!readOnly && status === "Open" && (
          <>
            <Form.Item
              label={isCreate ? "Next Follow-up Date" : "Reschedule Next Follow-up (optional)"}
              required={isCreate}
              {...fieldError("nextFollowUpDate")}
            >
              <Controller
                name="nextFollowUpDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    disabledDate={(d) => d.isBefore(dayjs(), "day")}
                    value={field.value ? dayjs(field.value) : null}
                    onChange={(d) => field.onChange(d ? d.format("YYYY-MM-DD") : null)}
                  />
                )}
              />
            </Form.Item>
            <Form.Item label="Time">
              <Controller
                name="nextFollowUpTime"
                control={control}
                render={({ field }) => (
                  <TimePicker
                    format="HH:mm"
                    minuteStep={5}
                    value={field.value ? dayjs(field.value, "HH:mm:ss") : null}
                    onChange={(t) => field.onChange(t ? t.format("HH:mm:00") : null)}
                  />
                )}
              />
            </Form.Item>
          </>
        )}
      </div>

      {existing && (
        <>
          <Divider titlePlacement="start">Follow-ups</Divider>
          <FollowUpTable enquiryId={existing.id} rows={existing.followUps} readOnly={readOnly || isClosed} />
          {!readOnly && !isClosed && (
            <Button style={{ marginTop: 8 }} type="dashed" onClick={() => setFollowUpOpen(true)}>
              + Add Follow-up
            </Button>
          )}
          <FollowUpModal enquiryId={existing.id} open={followUpOpen} onClose={() => setFollowUpOpen(false)} />
        </>
      )}

      <Divider titlePlacement="start">Custom Fields</Divider>
      <Controller
        name="customFields"
        control={control}
        render={({ field }) => (
          <CustomFieldsEditor value={field.value ?? []} onChange={field.onChange} readOnly={readOnly} />
        )}
      />

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
        <Button onClick={() => navigate("/enquiry")}>{readOnly ? "Close" : "Cancel"}</Button>
        {!readOnly && isCreate && (
          <Button
            loading={createMutation.isPending}
            onClick={handleSubmit((v) => save(v, true), showFormErrors)}
          >
            Save & New
          </Button>
        )}
        {!readOnly && (
          <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
            Save
          </Button>
        )}
      </div>
    </Form>
  );
}

function FollowUpTable({ enquiryId, rows, readOnly }: { enquiryId: number; rows: EnquiryFollowUp[]; readOnly: boolean }) {
  const updateMutation = useUpdateFollowUpMutation();
  const [outcomeFor, setOutcomeFor] = useState<EnquiryFollowUp | null>(null);
  const [outcome, setOutcome] = useState("");

  function markDone() {
    if (!outcomeFor) return;
    updateMutation.mutate(
      { id: enquiryId, followUpId: outcomeFor.id, values: { isDone: true, outcome } },
      {
        onSuccess: () => {
          setOutcomeFor(null);
          setOutcome("");
          message.success("Follow-up marked done");
        },
        onError: (e) => showApiErrorPopup("Could not update the follow-up", e),
      }
    );
  }

  return (
    <>
      <Table<EnquiryFollowUp>
        size="small"
        rowKey="id"
        pagination={false}
        dataSource={rows}
        locale={{ emptyText: "No follow-ups yet" }}
        columns={[
          { title: "Date", dataIndex: "followUpDate" },
          { title: "Time", dataIndex: "followUpTime", render: (v: string | null) => (v ? v.slice(0, 5) : "-") },
          { title: "Mode", dataIndex: "mode", render: (v: string) => v || "-" },
          { title: "Notes", dataIndex: "notes", render: (v: string) => v || "-" },
          { title: "Outcome", dataIndex: "outcome", render: (v: string) => v || "-" },
          {
            title: "Done",
            key: "done",
            render: (_, row) =>
              row.isDone ? (
                <Checkbox checked disabled />
              ) : readOnly ? (
                <Checkbox checked={false} disabled />
              ) : (
                <a onClick={() => setOutcomeFor(row)}>Mark done</a>
              ),
          },
        ]}
      />
      <Modal
        open={!!outcomeFor}
        title={`Follow-up on ${outcomeFor?.followUpDate ?? ""}`}
        okText="Mark Done"
        confirmLoading={updateMutation.isPending}
        onCancel={() => setOutcomeFor(null)}
        onOk={markDone}
        destroyOnHidden
      >
        <div style={{ marginBottom: 6 }}>Outcome</div>
        <Input.TextArea rows={3} value={outcome} onChange={(e) => setOutcome(e.target.value)} />
      </Modal>
    </>
  );
}

export function FollowUpModal({ enquiryId, open, onClose }: { enquiryId: number; open: boolean; onClose: () => void }) {
  const addMutation = useAddFollowUpMutation();
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [mode, setMode] = useState<string | undefined>();
  const [notes, setNotes] = useState("");

  function close() {
    setDate(null);
    setTime(null);
    setMode(undefined);
    setNotes("");
    onClose();
  }

  function submit() {
    if (!date) return;
    addMutation.mutate(
      { id: enquiryId, values: { followUpDate: date, followUpTime: time, mode: mode ?? "", notes } },
      {
        onSuccess: () => {
          message.success("Follow-up scheduled");
          close();
        },
        onError: (e) => showApiErrorPopup("Could not add the follow-up", e),
      }
    );
  }

  return (
    <Modal
      open={open}
      title="Schedule Follow-up"
      okText="Save"
      okButtonProps={{ disabled: !date }}
      confirmLoading={addMutation.isPending}
      onCancel={close}
      onOk={submit}
      destroyOnHidden
    >
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ marginBottom: 4 }}>Date *</div>
          <DatePicker
            disabledDate={(d) => d.isBefore(dayjs(), "day")}
            value={date ? dayjs(date) : null}
            onChange={(d) => setDate(d ? d.format("YYYY-MM-DD") : null)}
          />
        </div>
        <div>
          <div style={{ marginBottom: 4 }}>Time</div>
          <TimePicker
            format="HH:mm"
            minuteStep={5}
            value={time ? dayjs(time, "HH:mm:ss") : null}
            onChange={(t) => setTime(t ? t.format("HH:mm:00") : null)}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 4 }}>Mode</div>
          <Select style={{ width: "100%" }} allowClear value={mode} onChange={setMode} options={FOLLOW_UP_MODES} />
        </div>
      </div>
      <div style={{ marginBottom: 4 }}>Notes</div>
      <Input.TextArea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
    </Modal>
  );
}
