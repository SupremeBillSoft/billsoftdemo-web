// src/features/sales/shared/compliance.tsx
//
// GST compliance UI shared by Delivery Challan, Sales Invoice and Credit
// Note: e-way bill generation (with the "is one required?" check), IRN
// generate / cancel, and the e-invoice details panel. All calls go to the
// backend, which applies the rules and talks to the GST provider.

import { useState } from "react";
import { Alert, Button, DatePicker, Descriptions, Input, InputNumber, Modal, Radio, Select, Spin, Tag, message } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { apiClient } from "../../../lib/api-client";
import { showApiErrorPopup } from "../../../lib/apiError";
import { SALES_KEY } from "./api";
import { money } from "./components";

export type ComplianceResource = "invoices" | "delivery-challans" | "credit-notes";

export type EInvoiceStatus = "NotApplicable" | "Pending" | "Generated" | "Cancelled";

export interface EInvoiceFields {
  einvoiceStatus: EInvoiceStatus;
  irn: string;
  ackNo: string;
  ackDate: string | null;
  signedQr: string;
  irnCancelledAt: string | null;
}

export const EINVOICE_LABEL: Record<EInvoiceStatus, { label: string; color: string }> = {
  NotApplicable: { label: "Not applicable", color: "default" },
  Pending: { label: "IRN pending", color: "gold" },
  Generated: { label: "IRN generated", color: "green" },
  Cancelled: { label: "IRN cancelled", color: "red" },
};

export function EInvoiceTag({ status }: { status: EInvoiceStatus }) {
  const s = EINVOICE_LABEL[status] ?? EINVOICE_LABEL.NotApplicable;
  return <Tag color={s.color}>{s.label}</Tag>;
}

// IRP / EWB cancel reason codes.
export const CANCEL_REASONS = [
  { value: "1", label: "Duplicate" },
  { value: "2", label: "Data entry mistake" },
  { value: "3", label: "Order cancelled" },
  { value: "4", label: "Others" },
];

// IRN / e-way bill can only be cancelled within 24 hours of generation.
export function within24h(at?: string | null) {
  return !!at && dayjs().diff(dayjs(at), "hour", true) < 24;
}

function useInvalidateSales() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: SALES_KEY });
}

// ---------------------------------------------------------------------------
// E-invoice (IRN)
// ---------------------------------------------------------------------------

export function useGenerateIrn(resource: "invoices" | "credit-notes") {
  const invalidate = useInvalidateSales();
  return useMutation({
    mutationFn: async (id: number) => (await apiClient.post(`/sales/${resource}/${id}/einvoice/generate/`, {})).data,
    onSuccess: invalidate,
  });
}

export function generateIrnWithFeedback(
  mutation: ReturnType<typeof useGenerateIrn>,
  id: number,
  number: string
) {
  mutation.mutate(id, {
    onSuccess: () => message.success(`IRN generated for ${number}`),
    onError: (e) => showApiErrorPopup(`Could not generate the IRN for ${number}`, e),
  });
}

export function CancelReasonModal({
  open,
  title,
  note,
  loading,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  title: string;
  note?: string;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (body: { reasonCode: string; remark: string }) => void;
}) {
  const [reasonCode, setReasonCode] = useState("2");
  const [remark, setRemark] = useState("");
  return (
    <Modal
      open={open}
      title={title}
      okText="Cancel it"
      okButtonProps={{ danger: true, disabled: !remark.trim() }}
      cancelText="Back"
      confirmLoading={loading}
      onCancel={onCancel}
      onOk={() => onSubmit({ reasonCode, remark: remark.trim() })}
      destroyOnHidden
    >
      {note && <Alert type="warning" showIcon style={{ marginBottom: 12 }} title={note} />}
      <div style={{ marginBottom: 6 }}>Reason</div>
      <Select style={{ width: "100%", marginBottom: 12 }} value={reasonCode} onChange={setReasonCode} options={CANCEL_REASONS} />
      <div style={{ marginBottom: 6 }}>Remark *</div>
      <Input.TextArea rows={2} maxLength={100} value={remark} onChange={(e) => setRemark(e.target.value)} />
    </Modal>
  );
}

export function CancelIrnModal({
  resource,
  doc,
  onClose,
}: {
  resource: "invoices" | "credit-notes";
  doc: { id: number; number: string } | null;
  onClose: () => void;
}) {
  const invalidate = useInvalidateSales();
  const mutation = useMutation({
    mutationFn: async (body: { reasonCode: string; remark: string }) =>
      (await apiClient.post(`/sales/${resource}/${doc!.id}/einvoice/cancel/`, body)).data,
    onSuccess: invalidate,
  });
  return (
    <CancelReasonModal
      open={!!doc}
      title={`Cancel IRN of ${doc?.number ?? ""}`}
      note="Allowed only within 24 hours of generation. After that, issue a Credit Note instead."
      loading={mutation.isPending}
      onCancel={onClose}
      onSubmit={(body) =>
        mutation.mutate(body, {
          onSuccess: () => {
            message.success("IRN cancelled");
            onClose();
          },
          onError: (e) => showApiErrorPopup("Could not cancel the IRN", e),
        })
      }
    />
  );
}

/** IRN details shown on a saved invoice / credit note. */
export function EInvoicePanel({
  resource,
  doc,
  number,
}: {
  resource: "invoices" | "credit-notes";
  doc: EInvoiceFields & { id: number; status: string };
  number: string;
}) {
  const generate = useGenerateIrn(resource);
  const [cancelOpen, setCancelOpen] = useState(false);
  if (doc.einvoiceStatus === "NotApplicable") return null;
  const active = doc.status !== "Cancelled";

  return (
    <div style={{ border: "1px solid #E4E1DA", borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <strong>
          E-Invoice <EInvoiceTag status={doc.einvoiceStatus} />
        </strong>
        <div style={{ display: "flex", gap: 8 }}>
          {active && doc.einvoiceStatus === "Pending" && (
            <Button type="primary" loading={generate.isPending} onClick={() => generateIrnWithFeedback(generate, doc.id, number)}>
              Generate IRN
            </Button>
          )}
          {doc.einvoiceStatus === "Generated" && within24h(doc.ackDate) && (
            <Button danger onClick={() => setCancelOpen(true)}>
              Cancel IRN
            </Button>
          )}
        </div>
      </div>
      {doc.irn ? (
        <Descriptions size="small" column={2}>
          <Descriptions.Item label="IRN" span={2}>
            <code style={{ wordBreak: "break-all" }}>{doc.irn}</code>
          </Descriptions.Item>
          <Descriptions.Item label="Ack No.">{doc.ackNo}</Descriptions.Item>
          <Descriptions.Item label="Ack Date">{doc.ackDate ? dayjs(doc.ackDate).format("DD-MM-YYYY HH:mm") : "-"}</Descriptions.Item>
          {doc.irnCancelledAt && (
            <Descriptions.Item label="Cancelled At">{dayjs(doc.irnCancelledAt).format("DD-MM-YYYY HH:mm")}</Descriptions.Item>
          )}
          <Descriptions.Item label="Signed QR">{doc.signedQr ? "Received from IRP (printed on the invoice)" : "-"}</Descriptions.Item>
        </Descriptions>
      ) : (
        <span style={{ color: "#8c8c8c" }}>
          This is a B2B document and e-invoicing is on, so it needs an IRN before it is shared with the customer.
        </span>
      )}
      <CancelIrnModal resource={resource} doc={cancelOpen ? { id: doc.id, number } : null} onClose={() => setCancelOpen(false)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// E-way bill
// ---------------------------------------------------------------------------

export interface EWayBill {
  id: number;
  documentType: "SalesInvoice" | "DeliveryChallan";
  objectId: number;
  documentNumber: string;
  ewbNumber: string;
  ewbDate: string;
  validTill: string | null;
  supplyType: string;
  subType: string;
  transportMode: string;
  vehicleType: "Regular" | "ODC";
  vehicleNo: string;
  transporterId: string;
  transporterName: string;
  transportDocNo: string;
  transportDocDate: string | null;
  distanceKm: number;
  consignmentValue: string;
  status: "Active" | "Cancelled";
  cancelReason: string;
  cancelledAt: string | null;
  vehicleHistory: { vehicleNo: string; reason: string; place?: string; at: string }[];
  createdBy: string;
}

interface EWayCheck {
  required: boolean;
  reason: string;
  consignmentValue: string;
  threshold: string;
}

const TRANSPORT_MODES = ["Road", "Rail", "Air", "Ship"].map((m) => ({ value: m, label: m }));

export function EWayBillModal({
  resource,
  doc,
  onClose,
  onCreated,
}: {
  resource: "invoices" | "delivery-challans";
  doc: { id: number; number: string; vehicleNo?: string; distanceKm?: number | null; transportMode?: string } | null;
  onClose: () => void;
  onCreated?: (ewb: EWayBill) => void;
}) {
  const invalidate = useInvalidateSales();
  const { data: check, isPending: checking } = useQuery({
    queryKey: [...SALES_KEY, resource, "eway-check", doc?.id],
    queryFn: async () => (await apiClient.get<EWayCheck>(`/sales/${resource}/${doc!.id}/eway-bill-check/`)).data,
    enabled: !!doc,
  });
  const [form, setForm] = useState({
    transportMode: "Road",
    vehicleType: "Regular",
    vehicleNo: "",
    transporterId: "",
    transporterName: "",
    transportDocNo: "",
    transportDocDate: null as string | null,
    distanceKm: null as number | null,
  });
  const [seededFor, setSeededFor] = useState<number | null>(null);
  if (doc && seededFor !== doc.id) {
    // Carry the transport details already on the document.
    setSeededFor(doc.id);
    setForm((f) => ({
      ...f,
      vehicleNo: doc.vehicleNo ?? "",
      distanceKm: doc.distanceKm ?? null,
      transportMode: ["Road", "Rail", "Air", "Ship"].includes(doc.transportMode ?? "") ? doc.transportMode! : "Road",
    }));
  }
  const set = (k: keyof typeof form, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: async () => (await apiClient.post<EWayBill>(`/sales/${resource}/${doc!.id}/eway-bill/`, form)).data,
    onSuccess: invalidate,
  });

  const needsVehicle = form.transportMode === "Road" && !form.transporterId;
  const valid = !!form.distanceKm && (!needsVehicle || !!form.vehicleNo.trim());

  return (
    <Modal
      open={!!doc}
      width={640}
      title={`Generate E-Way Bill - ${doc?.number ?? ""}`}
      okText="Generate"
      okButtonProps={{ disabled: !valid }}
      confirmLoading={mutation.isPending}
      onCancel={onClose}
      onOk={() =>
        mutation.mutate(undefined, {
          onSuccess: (ewb) => {
            Modal.success({
              title: `E-way bill ${ewb.ewbNumber} generated`,
              content: `Valid till ${ewb.validTill ? dayjs(ewb.validTill).format("DD-MM-YYYY HH:mm") : "-"}`,
            });
            onCreated?.(ewb);
            onClose();
          },
          onError: (e) => showApiErrorPopup("Could not generate the e-way bill", e),
        })
      }
      destroyOnHidden
    >
      {checking ? (
        <Spin />
      ) : (
        check && (
          <Alert
            type={check.required ? "warning" : "info"}
            showIcon
            style={{ marginBottom: 16 }}
            title={check.required ? "E-way bill required" : "E-way bill not mandatory (can still be generated)"}
            description={`${check.reason} Consignment value ₹${money(check.consignmentValue)}, limit ₹${money(check.threshold)}.`}
          />
        )
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
        <div>
          <div style={{ marginBottom: 4 }}>Transport Mode</div>
          <Select style={{ width: "100%" }} value={form.transportMode} onChange={(v) => set("transportMode", v)} options={TRANSPORT_MODES} />
        </div>
        <div>
          <div style={{ marginBottom: 4 }}>Approx. Distance (km) *</div>
          <InputNumber style={{ width: "100%" }} min={1} max={4000} value={form.distanceKm} onChange={(v) => set("distanceKm", v)} />
        </div>
        <div>
          <div style={{ marginBottom: 4 }}>Vehicle No.{needsVehicle ? " *" : ""}</div>
          <Input value={form.vehicleNo} placeholder="e.g. KA01AB1234" onChange={(e) => set("vehicleNo", e.target.value.toUpperCase().replace(/\s/g, ""))} />
        </div>
        <div>
          <div style={{ marginBottom: 4 }}>Vehicle Type</div>
          <Radio.Group
            value={form.vehicleType}
            onChange={(e) => set("vehicleType", e.target.value)}
            options={[
              { value: "Regular", label: "Regular" },
              { value: "ODC", label: "Over-dimensional" },
            ]}
          />
        </div>
        <div>
          <div style={{ marginBottom: 4 }}>Transporter ID (GSTIN / TRANSIN)</div>
          <Input value={form.transporterId} maxLength={15} onChange={(e) => set("transporterId", e.target.value.toUpperCase())} />
        </div>
        <div>
          <div style={{ marginBottom: 4 }}>Transporter Name</div>
          <Input value={form.transporterName} onChange={(e) => set("transporterName", e.target.value)} />
        </div>
        <div>
          <div style={{ marginBottom: 4 }}>Transport Doc No. (LR / RR / AWB)</div>
          <Input value={form.transportDocNo} onChange={(e) => set("transportDocNo", e.target.value)} />
        </div>
        <div>
          <div style={{ marginBottom: 4 }}>Transport Doc Date</div>
          <DatePicker
            style={{ width: "100%" }}
            value={form.transportDocDate ? dayjs(form.transportDocDate) : null}
            onChange={(d) => set("transportDocDate", d ? d.format("YYYY-MM-DD") : null)}
          />
        </div>
      </div>
      {needsVehicle && (
        <div style={{ marginTop: 10, color: "#8c8c8c", fontSize: 12 }}>
          By road, give the vehicle number - or a transporter ID if the transporter will add it (Part B) later.
        </div>
      )}
    </Modal>
  );
}
