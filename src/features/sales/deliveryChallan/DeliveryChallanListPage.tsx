// src/features/sales/deliveryChallan/DeliveryChallanListPage.tsx

import { useState } from "react";
import { DatePicker, Dropdown, Input, InputNumber, Modal, Select, Table, Tag, message } from "antd";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { showApiErrorPopup } from "../../../lib/apiError";
import { EWayBillModal } from "../shared/compliance";
import {
  DATE_RANGE_FIELDS,
  FilterPanel,
  PageHeader,
  ReasonModal,
  StatusTag,
  SummaryCards,
  today,
  useGodownOptions,
} from "../shared/components";
import type { ListParams } from "../shared/types";
import { deliveryChallanApi } from "./api";
import { DC_TYPE_OPTIONS, PURPOSE_LABEL, type DeliveryChallan } from "./types";

const STATUS_FILTER = ["Open", "Closed", "Cancelled"].map((s) => ({ value: s, label: s }));
const RETURN_COLOR: Record<string, string> = {
  Returned: "green",
  Overdue: "red",
  "Partially returned": "gold",
  "Awaiting return": "blue",
};
const INVOICE_COLOR: Record<string, string> = {
  Invoiced: "green",
  "Partially invoiced": "gold",
  "Not invoiced": "blue",
  "Non billable": "default",
};

export function DeliveryChallanListPage() {
  const navigate = useNavigate();
  const [params, setParams] = useState<ListParams>({});
  const [search, setSearch] = useState("");
  const [cancelFor, setCancelFor] = useState<DeliveryChallan | null>(null);
  const [receiveFor, setReceiveFor] = useState<DeliveryChallan | null>(null);
  const [ewayFor, setEwayFor] = useState<DeliveryChallan | null>(null);

  const { data = [], isPending } = deliveryChallanApi.useList({ ...params, search: search || params.search });
  const { data: summary } = deliveryChallanApi.useGet<{ pendingChallans: number; overdueReturnables: number }>("summary/");
  const deleteMutation = deliveryChallanApi.useDelete();
  const action = deliveryChallanApi.useAction();

  function rowMenu(r: DeliveryChallan): MenuProps["items"] {
    const live = r.status !== "Cancelled";
    // Edit / cancel / delete only before anything was invoiced or came back
    // (the server enforces it; this just hides actions that would fail).
    const untouched =
      !["Invoiced", "Partially invoiced"].includes(r.invoiceStatus) &&
      !r.items.some((l) => Number(l.returnedQty ?? 0) > 0);
    const items: MenuProps["items"] = [{ key: "view", label: "View", onClick: () => navigate(`/sales/delivery-challan/${r.id}/view`) }];
    if (live && untouched) items.push({ key: "edit", label: "Edit", onClick: () => navigate(`/sales/delivery-challan/${r.id}`) });
    if (live && r.dcType !== "NonBillable" && r.status === "Open" && !r.returnable) {
      items.push({
        key: "invoice",
        label: "Create Invoice",
        onClick: () => navigate(`/sales/invoice/new?type=DC&customer=${r.customer}&challan=${r.id}`),
      });
    }
    if (live && r.returnable && r.returnStatus !== "Returned") {
      items.push({ key: "receive", label: "Receive Back", onClick: () => setReceiveFor(r) });
    }
    if (live) items.push({ key: "ewb", label: "Generate E-Way Bill", onClick: () => setEwayFor(r) });
    if (live && untouched) {
      items.push({ type: "divider" });
      items.push({ key: "cancel", label: "Cancel Challan", onClick: () => setCancelFor(r) });
      items.push({
        key: "delete",
        label: "Delete",
        danger: true,
        onClick: () =>
          Modal.confirm({
            title: `Delete ${r.dcNumber}?`,
            content: "The stock it took out goes back to the godown.",
            okButtonProps: { danger: true },
            onOk: () =>
              deleteMutation.mutateAsync(r.id).then(
                () => message.success("Deleted"),
                (e) => showApiErrorPopup("Could not delete the challan", e)
              ),
          }),
      });
    }
    return items;
  }

  const columns: ColumnsType<DeliveryChallan> = [
    {
      title: "DC No.",
      dataIndex: "dcNumber",
      render: (v: string, r) => <a onClick={() => navigate(`/sales/delivery-challan/${r.id}/view`)}>{v}</a>,
    },
    { title: "Date", dataIndex: "dcDate" },
    {
      title: "Type",
      key: "type",
      render: (_, r) =>
        r.dcType === "NonBillable" ? `Non billable · ${PURPOSE_LABEL[r.purpose]}` : DC_TYPE_OPTIONS.find((o) => o.value === r.dcType)?.label,
    },
    { title: "Customer", dataIndex: "customerName" },
    { title: "SO No.", dataIndex: "soNumber", render: (v: string | null) => v ?? "-" },
    { title: "Qty", dataIndex: "totalQuantity", render: (v: string) => Number(v) },
    {
      title: "Invoicing / Return",
      key: "progress",
      render: (_, r) =>
        r.returnable ? (
          <span>
            <Tag color={RETURN_COLOR[r.returnStatus ?? ""] ?? "default"}>{r.returnStatus}</Tag>
            {r.returnDueDate && <span style={{ fontSize: 12 }}>due {r.returnDueDate}</span>}
          </span>
        ) : (
          <Tag color={INVOICE_COLOR[r.invoiceStatus]}>{r.invoiceStatus}</Tag>
        ),
    },
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
      <PageHeader title="Delivery Challan" action={<a onClick={() => navigate("/sales/delivery-challan/new")}>+ New Delivery Challan</a>} />
      <SummaryCards
        cards={[
          { label: "Open Challans", value: summary?.pendingChallans },
          { label: "Returnables Overdue (s.143)", value: summary?.overdueReturnables },
        ]}
      />
      <FilterPanel
        onApply={setParams}
        fields={[
          { name: "search", label: "DC No. / Customer" },
          { name: "dc_type", label: "Challan Type", type: "select", options: DC_TYPE_OPTIONS },
          { name: "status", label: "Status", type: "select", options: STATUS_FILTER },
          ...DATE_RANGE_FIELDS,
        ]}
      />
      <Input.Search placeholder="Quick search (DC No. / Customer)..." allowClear onSearch={setSearch} style={{ maxWidth: 320, marginBottom: 14 }} />
      <Table<DeliveryChallan> rowKey="id" loading={isPending} dataSource={data} columns={columns} />

      <ReasonModal
        open={!!cancelFor}
        title={`Cancel ${cancelFor?.dcNumber ?? ""}`}
        label="Reason (stock goes back to the godown)"
        required
        loading={action.isPending}
        onCancel={() => setCancelFor(null)}
        onSubmit={(reason) =>
          cancelFor &&
          action.mutate(
            { id: cancelFor.id, action: "cancel", body: { reason } },
            {
              onSuccess: () => {
                message.success("Challan cancelled");
                setCancelFor(null);
              },
              onError: (e) => showApiErrorPopup("Could not cancel the challan", e),
            }
          )
        }
      />
      {receiveFor && <ReceiveBackModal challan={receiveFor} onClose={() => setReceiveFor(null)} />}
      <EWayBillModal
        resource="delivery-challans"
        doc={ewayFor ? { id: ewayFor.id, number: ewayFor.dcNumber, vehicleNo: ewayFor.vehicleNo, transportMode: ewayFor.transportMode } : null}
        onClose={() => setEwayFor(null)}
      />
    </div>
  );
}

// Goods coming back against a returnable challan (job work / repair /
// approval): puts stock back and stops the s.143 clock for that quantity.
function ReceiveBackModal({ challan, onClose }: { challan: DeliveryChallan; onClose: () => void }) {
  const action = deliveryChallanApi.useAction();
  const { options: godownOptions } = useGodownOptions();
  const outstanding = challan.items
    .map((l) => ({ ...l, left: Number(l.quantity) - Number(l.returnedQty ?? 0) }))
    .filter((l) => l.left > 0);
  const [qty, setQty] = useState<Record<number, number>>(() => Object.fromEntries(outstanding.map((l) => [l.id!, l.left])));
  const [godown, setGodown] = useState<Record<number, number | null>>(() =>
    Object.fromEntries(outstanding.map((l) => [l.id!, l.godown ?? null]))
  );
  const [returnDate, setReturnDate] = useState(today());
  const [partyDcNo, setPartyDcNo] = useState("");

  const lines = outstanding.filter((l) => (qty[l.id!] ?? 0) > 0);

  function submit() {
    action.mutate(
      {
        id: challan.id,
        action: "receive-back",
        body: {
          returnDate,
          partyDcNo,
          items: lines.map((l) => ({ dcItem: l.id, quantity: qty[l.id!], godown: godown[l.id!] })),
        },
      },
      {
        onSuccess: () => {
          message.success("Goods received back - stock updated");
          onClose();
        },
        onError: (e) => showApiErrorPopup("Could not receive the goods", e),
      }
    );
  }

  return (
    <Modal
      open
      width={760}
      title={`Receive back against ${challan.dcNumber}`}
      okText="Receive"
      okButtonProps={{ disabled: !lines.length }}
      confirmLoading={action.isPending}
      onCancel={onClose}
      onOk={submit}
      destroyOnHidden
    >
      <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
        <div>
          <div style={{ marginBottom: 4 }}>Received On</div>
          <DatePicker value={dayjs(returnDate)} onChange={(d) => setReturnDate(d ? d.format("YYYY-MM-DD") : today())} />
        </div>
        <div>
          <div style={{ marginBottom: 4 }}>Customer's DC No.</div>
          <Input value={partyDcNo} onChange={(e) => setPartyDcNo(e.target.value)} />
        </div>
      </div>
      <Table
        size="small"
        rowKey="id"
        pagination={false}
        dataSource={outstanding}
        columns={[
          { title: "Item", dataIndex: "itemCode" },
          { title: "Sent", dataIndex: "quantity", render: (v: string) => Number(v) },
          { title: "Still out", dataIndex: "left" },
          {
            title: "Receiving now",
            key: "qty",
            render: (_, l) => (
              <InputNumber min={0} max={l.left} value={qty[l.id!]} onChange={(v) => setQty((q) => ({ ...q, [l.id!]: v ?? 0 }))} />
            ),
          },
          {
            title: "Into Godown",
            key: "godown",
            render: (_, l) => (
              <Select
                style={{ width: 140 }}
                allowClear
                value={godown[l.id!] ?? undefined}
                options={godownOptions}
                onChange={(v) => setGodown((g) => ({ ...g, [l.id!]: v ?? null }))}
              />
            ),
          },
        ]}
      />
    </Modal>
  );
}
