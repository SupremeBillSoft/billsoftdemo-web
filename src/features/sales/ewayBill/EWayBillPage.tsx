// src/features/sales/ewayBill/EWayBillPage.tsx
//
// BRD 6.4.7 E-Way Bill register: every e-way bill with its validity, the
// vehicle (Part B) history, update-vehicle and cancel (within 24 h). New
// ones are generated for an invoice or a delivery challan.

import { useState } from "react";
import { Button, Dropdown, Input, Modal, Segmented, Select, Table, Tag, message } from "antd";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../../lib/api-client";
import { showApiErrorPopup } from "../../../lib/apiError";
import { deliveryChallanApi } from "../deliveryChallan/api";
import { invoiceApi } from "../invoice/api";
import { SALES_KEY } from "../shared/api";
import { CancelReasonModal, EWayBillModal, within24h, type EWayBill } from "../shared/compliance";
import { DATE_RANGE_FIELDS, FilterPanel, PageHeader, StatusTag, SummaryCards, money } from "../shared/components";
import type { ListParams } from "../shared/types";

const KEY = [...SALES_KEY, "eway-bills"] as const;

function validity(ewb: EWayBill) {
  if (ewb.status === "Cancelled") return <Tag color="red">Cancelled</Tag>;
  if (!ewb.validTill) return "-";
  const hours = dayjs(ewb.validTill).diff(dayjs(), "hour");
  if (hours < 0) return <Tag color="default">Expired {dayjs(ewb.validTill).format("DD-MM HH:mm")}</Tag>;
  return <Tag color={hours < 12 ? "orange" : "green"}>Till {dayjs(ewb.validTill).format("DD-MM-YYYY HH:mm")}</Tag>;
}

export function EWayBillPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useState<ListParams>({});
  const [search, setSearch] = useState("");
  const [vehicleFor, setVehicleFor] = useState<EWayBill | null>(null);
  const [cancelFor, setCancelFor] = useState<EWayBill | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const allParams = { ...params, search: search || params.search };
  const { data = [], isPending } = useQuery({
    queryKey: [...KEY, allParams],
    queryFn: async () =>
      (
        await apiClient.get<EWayBill[]>("/sales/eway-bills/", {
          params: Object.fromEntries(Object.entries(allParams).filter(([, v]) => v)),
        })
      ).data,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: SALES_KEY });
  const cancelMutation = useMutation({
    mutationFn: async (body: { reasonCode: string; remark: string }) => (await apiClient.post(`/sales/eway-bills/${cancelFor!.id}/cancel/`, body)).data,
    onSuccess: invalidate,
  });

  const active = data.filter((e) => e.status === "Active");
  const expiringSoon = active.filter((e) => e.validTill && dayjs(e.validTill).diff(dayjs(), "hour") < 12 && dayjs(e.validTill).isAfter(dayjs()));

  function rowMenu(r: EWayBill): MenuProps["items"] {
    const items: MenuProps["items"] = [
      {
        key: "doc",
        label: `Open ${r.documentType === "SalesInvoice" ? "Invoice" : "Challan"}`,
        onClick: () => navigate(`/sales/${r.documentType === "SalesInvoice" ? "invoice" : "delivery-challan"}/${r.objectId}/view`),
      },
    ];
    const live = r.status === "Active" && (!r.validTill || dayjs(r.validTill).isAfter(dayjs()));
    if (live) items.push({ key: "vehicle", label: "Update Vehicle (Part B)", onClick: () => setVehicleFor(r) });
    if (r.status === "Active" && within24h(r.ewbDate)) items.push({ key: "cancel", label: "Cancel E-Way Bill", danger: true, onClick: () => setCancelFor(r) });
    return items;
  }

  const columns: ColumnsType<EWayBill> = [
    { title: "EWB No.", dataIndex: "ewbNumber", render: (v: string) => <strong>{v}</strong> },
    { title: "Generated", dataIndex: "ewbDate", render: (v: string) => dayjs(v).format("DD-MM-YYYY HH:mm") },
    { title: "Document", key: "doc", render: (_, r) => `${r.documentType === "SalesInvoice" ? "Invoice" : "DC"} ${r.documentNumber}` },
    { title: "Type", dataIndex: "subType" },
    { title: "Vehicle", dataIndex: "vehicleNo", render: (v: string, r) => v || (r.transporterName ? `via ${r.transporterName}` : "-") },
    { title: "Distance", dataIndex: "distanceKm", render: (v: number) => `${v} km` },
    { title: "Value", dataIndex: "consignmentValue", align: "right", render: (v: string) => money(v) },
    { title: "Validity", key: "valid", render: (_, r) => validity(r) },
    { title: "Status", dataIndex: "status", render: (v: string) => <StatusTag status={v} /> },
    {
      title: "",
      key: "actions",
      render: (_, r) => (
        <Dropdown menu={{ items: rowMenu(r) }} trigger={["click"]}>
          <a onClick={(e) => e.preventDefault()}>⋮</a>
        </Dropdown>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="E-Way Bill" action={<Button type="primary" onClick={() => setPickerOpen(true)}>+ Generate E-Way Bill</Button>} />
      <SummaryCards
        cards={[
          { label: "Active", value: active.length },
          { label: "Expiring within 12 h", value: expiringSoon.length },
        ]}
      />
      <FilterPanel
        onApply={setParams}
        fields={[
          { name: "search", label: "EWB No. / Document / Vehicle" },
          {
            name: "document_type",
            label: "Document",
            type: "select",
            options: [
              { value: "SalesInvoice", label: "Sales Invoice" },
              { value: "DeliveryChallan", label: "Delivery Challan" },
            ],
          },
          { name: "status", label: "Status", type: "select", options: ["Active", "Cancelled"].map((s) => ({ value: s, label: s })) },
          ...DATE_RANGE_FIELDS,
        ]}
      />
      <Input.Search placeholder="Quick search (EWB No. / Document / Vehicle)..." allowClear onSearch={setSearch} style={{ maxWidth: 340, marginBottom: 14 }} />
      <Table<EWayBill>
        rowKey="id"
        loading={isPending}
        dataSource={data}
        columns={columns}
        expandable={{
          rowExpandable: (r) => r.vehicleHistory.length > 0 || r.status === "Cancelled",
          expandedRowRender: (r) => (
            <div>
              {r.status === "Cancelled" && <div style={{ marginBottom: 6 }}>Cancelled {r.cancelledAt ? dayjs(r.cancelledAt).format("DD-MM-YYYY HH:mm") : ""} - {r.cancelReason}</div>}
              {r.vehicleHistory.map((h, i) => (
                <div key={i} style={{ fontSize: 12.5 }}>
                  {dayjs(h.at).format("DD-MM-YYYY HH:mm")} · <strong>{h.vehicleNo}</strong> · {h.reason}
                  {h.place ? ` at ${h.place}` : ""}
                </div>
              ))}
            </div>
          ),
        }}
      />

      {vehicleFor && <UpdateVehicleModal ewb={vehicleFor} onClose={() => setVehicleFor(null)} />}
      <CancelReasonModal
        open={!!cancelFor}
        title={`Cancel e-way bill ${cancelFor?.ewbNumber ?? ""}`}
        note="Allowed only within 24 hours of generation, and only if the goods haven't moved."
        loading={cancelMutation.isPending}
        onCancel={() => setCancelFor(null)}
        onSubmit={(body) =>
          cancelMutation.mutate(body, {
            onSuccess: () => {
              message.success("E-way bill cancelled");
              setCancelFor(null);
            },
            onError: (e) => showApiErrorPopup("Could not cancel the e-way bill", e),
          })
        }
      />
      {pickerOpen && <GenerateForDocumentModal onClose={() => setPickerOpen(false)} />}
    </div>
  );
}

const VEHICLE_REASONS = ["Breakdown", "Transhipment", "First time", "Others"].map((r) => ({ value: r, label: r }));

function UpdateVehicleModal({ ewb, onClose }: { ewb: EWayBill; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [vehicleNo, setVehicleNo] = useState("");
  const [reason, setReason] = useState("Breakdown");
  const [place, setPlace] = useState("");
  const mutation = useMutation({
    mutationFn: async () => (await apiClient.post(`/sales/eway-bills/${ewb.id}/update-vehicle/`, { vehicleNo, reason, place })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SALES_KEY }),
  });
  return (
    <Modal
      open
      title={`Update vehicle - EWB ${ewb.ewbNumber}`}
      okText="Update"
      okButtonProps={{ disabled: !vehicleNo.trim() }}
      confirmLoading={mutation.isPending}
      onCancel={onClose}
      onOk={() =>
        mutation.mutate(undefined, {
          onSuccess: () => {
            message.success("Vehicle updated");
            onClose();
          },
          onError: (e) => showApiErrorPopup("Could not update the vehicle", e),
        })
      }
      destroyOnHidden
    >
      <div style={{ marginBottom: 8 }}>Current vehicle: <strong>{ewb.vehicleNo || "-"}</strong></div>
      <div style={{ marginBottom: 4 }}>New Vehicle No. *</div>
      <Input style={{ marginBottom: 12 }} value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value.toUpperCase().replace(/\s/g, ""))} />
      <div style={{ marginBottom: 4 }}>Reason</div>
      <Select style={{ width: "100%", marginBottom: 12 }} value={reason} onChange={setReason} options={VEHICLE_REASONS} />
      <div style={{ marginBottom: 4 }}>Place of change</div>
      <Input value={place} onChange={(e) => setPlace(e.target.value)} />
    </Modal>
  );
}

// Pick an invoice or a challan, then open the normal generate modal.
function GenerateForDocumentModal({ onClose }: { onClose: () => void }) {
  const [kind, setKind] = useState<"invoices" | "delivery-challans">("invoices");
  const [docId, setDocId] = useState<number | undefined>();
  const [confirmed, setConfirmed] = useState(false);
  const invoices = invoiceApi.useList({ status: "Active" }, kind === "invoices");
  const challans = deliveryChallanApi.useList({ status: "Open" }, kind === "delivery-challans");

  const invoiceRows = (invoices.data ?? []).filter((i) => i.invoiceType !== "Proforma");
  const challanRows = challans.data ?? [];
  const options =
    kind === "invoices"
      ? invoiceRows.map((i) => ({ value: i.id, label: `${i.invoiceNumber} - ${i.customerName} (₹${money(i.netAmount)})` }))
      : challanRows.map((c) => ({ value: c.id, label: `${c.dcNumber} - ${c.customerName} (₹${money(c.approxValue)})` }));

  if (confirmed && docId) {
    const inv = invoiceRows.find((i) => i.id === docId);
    const dc = challanRows.find((c) => c.id === docId);
    const doc =
      kind === "invoices" && inv
        ? { id: inv.id, number: inv.invoiceNumber, vehicleNo: inv.vehicleNo, distanceKm: inv.distanceKm, transportMode: inv.transportMode }
        : dc
          ? { id: dc.id, number: dc.dcNumber, vehicleNo: dc.vehicleNo, transportMode: dc.transportMode }
          : null;
    return <EWayBillModal resource={kind} doc={doc} onClose={onClose} />;
  }

  return (
    <Modal open title="Generate E-Way Bill" okText="Next" okButtonProps={{ disabled: !docId }} onCancel={onClose} onOk={() => setConfirmed(true)} destroyOnHidden>
      <Segmented
        style={{ marginBottom: 12 }}
        value={kind}
        onChange={(v) => {
          setKind(v as typeof kind);
          setDocId(undefined);
        }}
        options={[
          { value: "invoices", label: "Sales Invoice" },
          { value: "delivery-challans", label: "Delivery Challan" },
        ]}
      />
      <Select style={{ width: "100%" }} showSearch optionFilterProp="label" placeholder="Select the document" value={docId} onChange={setDocId} options={options} />
    </Modal>
  );
}
