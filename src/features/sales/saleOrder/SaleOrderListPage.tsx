// src/features/sales/saleOrder/SaleOrderListPage.tsx

import { useState } from "react";
import { Button, Dropdown, Input, Modal, Table, Tag, message } from "antd";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import { getApiErrorMessage, showApiErrorPopup } from "../../../lib/apiError";
import {
  DATE_RANGE_FIELDS,
  FilterPanel,
  GodownPickerModal,
  PageHeader,
  ReasonModal,
  StatusTag,
  SummaryCards,
  money,
} from "../shared/components";
import type { ListParams } from "../shared/types";
import { saleOrderApi } from "./api";
import { SO_TYPE_OPTIONS, type SaleOrder, type SaleOrderLine } from "./types";

const STATUS_FILTER = [
  { value: "Pending", label: "Pending" },
  { value: "Completed", label: "Order Completed" },
  { value: "Closed", label: "Closed" },
];

interface BulkInvoiceResult {
  invoices: string[];
  failed: { customer: number; orders: string[]; error: unknown }[];
}

export function SaleOrderListPage() {
  const navigate = useNavigate();
  const [params, setParams] = useState<ListParams>({});
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  // Which godown-picker / reason prompt is open, and for which orders.
  const [invoiceFor, setInvoiceFor] = useState<number[] | null>(null);
  const [closeFor, setCloseFor] = useState<number[] | null>(null);
  const [linesFor, setLinesFor] = useState<SaleOrder | null>(null);

  const { data = [], isPending } = saleOrderApi.useList({ ...params, search: search || params.search });
  const { data: summary } = saleOrderApi.useGet<{ totalSaleOrders: number; pendingSaleOrders: number }>("summary/");
  const deleteMutation = saleOrderApi.useDelete();
  const action = saleOrderApi.useAction<unknown>();

  const selectedOpen = data.filter((o) => selected.includes(o.id) && o.status !== "Closed").map((o) => o.id);

  async function convertToInvoice(ids: number[], godown: number) {
    try {
      if (ids.length === 1) {
        const inv = (await action.mutateAsync({ id: ids[0], action: "convert-to-invoice", body: { godown } })) as {
          invoiceNumber: string;
        };
        message.success(`Invoice ${inv.invoiceNumber} created`);
      } else {
        const result = (await action.mutateAsync({ action: "bulk-convert-to-invoice", body: { ids, godown } })) as BulkInvoiceResult;
        reportBulkInvoice(result);
      }
      setInvoiceFor(null);
      setSelected([]);
    } catch (error) {
      const data = (error as { response?: { data?: BulkInvoiceResult } }).response?.data;
      if (data?.failed) reportBulkInvoice(data);
      else showApiErrorPopup("Could not create the invoice", error);
    }
  }

  function reportBulkInvoice(result: BulkInvoiceResult) {
    const lines = [
      result.invoices.length ? `Created: ${result.invoices.join(", ")}` : "No invoices were created.",
      ...result.failed.map((f) => `${f.orders.join(", ")}: ${typeof f.error === "string" ? f.error : JSON.stringify(f.error)}`),
    ];
    (result.failed.length ? Modal.warning : Modal.success)({
      title: "Bulk invoice (one invoice per customer)",
      content: <div style={{ whiteSpace: "pre-line" }}>{lines.join("\n")}</div>,
    });
  }

  async function closeOrders(ids: number[], reason: string) {
    try {
      if (ids.length === 1) {
        await action.mutateAsync({ id: ids[0], action: "close", body: { reason } });
        message.success("Order closed");
      } else {
        const result = (await action.mutateAsync({ action: "bulk-close", body: { ids, reason } })) as {
          closed: number[];
          failed: { id: number; error: string }[];
        };
        message.success(`${result.closed.length} order(s) closed`);
        if (result.failed.length) Modal.warning({ title: "Some orders were not closed", content: result.failed.map((f) => f.error).join("\n") });
      }
      setCloseFor(null);
      setSelected([]);
    } catch (error) {
      showApiErrorPopup("Could not close the order", error);
    }
  }

  function rowMenu(r: SaleOrder): MenuProps["items"] {
    const items: MenuProps["items"] = [{ key: "view", label: "View", onClick: () => navigate(`/sales/sale-order/${r.id}/view`) }];
    if (r.status !== "Closed") {
      items.push({ key: "edit", label: "Edit / Amend", onClick: () => navigate(`/sales/sale-order/${r.id}`) });
    }
    if (r.status === "Pending") {
      items.push({ type: "divider" });
      items.push({ key: "dc", label: "Create Delivery Challan", onClick: () => navigate(`/sales/delivery-challan/new?saleOrder=${r.id}`) });
      items.push({ key: "inv", label: "Convert to Invoice", onClick: () => setInvoiceFor([r.id]) });
      items.push({ key: "lines", label: "Close Items...", onClick: () => setLinesFor(r) });
    }
    if (r.status !== "Closed") items.push({ key: "close", label: "Close Order", onClick: () => setCloseFor([r.id]) });
    items.push({ type: "divider" });
    items.push({
      key: "delete",
      label: "Delete",
      danger: true,
      onClick: () =>
        Modal.confirm({
          title: `Delete ${r.soNumber}?`,
          okButtonProps: { danger: true },
          onOk: () =>
            deleteMutation.mutateAsync(r.id).then(
              () => message.success("Deleted"),
              (e) => showApiErrorPopup("Could not delete the Sale Order", e)
            ),
        }),
    });
    return items;
  }

  const columns: ColumnsType<SaleOrder> = [
    {
      title: "SO No.",
      dataIndex: "displayNumber",
      render: (v: string, r) => <a onClick={() => navigate(`/sales/sale-order/${r.id}/view`)}>{v}</a>,
    },
    { title: "Date", dataIndex: "soDate" },
    { title: "Type", dataIndex: "soType", render: (v: string) => (v === "Export" ? <Tag color="geekblue">Export</Tag> : "Domestic") },
    { title: "Customer", dataIndex: "customerName" },
    { title: "Quotation No.", dataIndex: "quotationNumber", render: (v: string | null) => v ?? "-" },
    { title: "Customer PO", dataIndex: "customerPoNo", render: (v: string) => v || "-" },
    { title: "Net Amount", dataIndex: "netAmount", align: "right", render: (v: string) => money(v) },
    {
      title: "Status",
      dataIndex: "status",
      render: (v: string) => <StatusTag status={v === "Completed" ? "Completed" : v} />,
    },
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
      <PageHeader title="Sale Order" action={<a onClick={() => navigate("/sales/sale-order/new")}>+ New Sale Order</a>} />
      <SummaryCards
        cards={[
          { label: "Total Sale Orders", value: summary?.totalSaleOrders },
          { label: "Pending Sale Orders", value: summary?.pendingSaleOrders },
        ]}
      />
      <FilterPanel
        onApply={setParams}
        fields={[
          { name: "search", label: "SO No. / Customer" },
          { name: "so_type", label: "Order Type", type: "select", options: SO_TYPE_OPTIONS },
          { name: "status", label: "Status", type: "select", options: STATUS_FILTER },
          ...DATE_RANGE_FIELDS,
        ]}
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <Input.Search placeholder="Quick search (SO No. / Customer)..." allowClear onSearch={setSearch} style={{ maxWidth: 320 }} />
        {selectedOpen.length > 0 && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span>{selectedOpen.length} selected -</span>
            <Button size="small" onClick={() => setInvoiceFor(selectedOpen)}>
              Bulk Convert to Invoice
            </Button>
            <Button size="small" onClick={() => setCloseFor(selectedOpen)}>
              Bulk Close
            </Button>
          </div>
        )}
      </div>
      <Table<SaleOrder>
        rowKey="id"
        loading={isPending}
        dataSource={data}
        columns={columns}
        rowSelection={{ selectedRowKeys: selected, onChange: (keys) => setSelected(keys as number[]) }}
      />

      <GodownPickerModal
        open={!!invoiceFor}
        title={invoiceFor && invoiceFor.length > 1 ? `Convert ${invoiceFor.length} orders (one invoice per customer)` : "Convert to Invoice"}
        loading={action.isPending}
        onCancel={() => setInvoiceFor(null)}
        onSubmit={(godown) => invoiceFor && convertToInvoice(invoiceFor, godown)}
      />
      <ReasonModal
        open={!!closeFor}
        title={closeFor && closeFor.length > 1 ? `Close ${closeFor.length} orders` : "Close Order"}
        label="Reason (pending quantities will be written off)"
        required
        loading={action.isPending}
        onCancel={() => setCloseFor(null)}
        onSubmit={(reason) => closeFor && closeOrders(closeFor, reason)}
      />
      {linesFor && <CloseLinesModal order={linesFor} onClose={() => setLinesFor(null)} />}
    </div>
  );
}

// BRD "close each item in a Sale Order": write off the pending balance of
// the chosen lines; the order completes once nothing is pending.
function CloseLinesModal({ order, onClose }: { order: SaleOrder; onClose: () => void }) {
  const { data: lines = [], isPending } = saleOrderApi.useGet<SaleOrderLine[]>(`${order.id}/pending-lines/`);
  const action = saleOrderApi.useAction();
  const [picked, setPicked] = useState<number[]>([]);

  function submit() {
    action.mutate(
      { id: order.id, action: "close-lines", body: { line_ids: picked } },
      {
        onSuccess: () => {
          message.success(`${picked.length} item(s) closed`);
          onClose();
        },
        onError: (e) => Modal.error({ title: "Could not close the items", content: getApiErrorMessage(e) }),
      }
    );
  }

  return (
    <Modal
      open
      width={720}
      title={`Close items on ${order.displayNumber}`}
      okText="Close Selected Items"
      okButtonProps={{ disabled: !picked.length }}
      confirmLoading={action.isPending}
      onCancel={onClose}
      onOk={submit}
      destroyOnHidden
    >
      <Table<SaleOrderLine>
        size="small"
        rowKey="id"
        loading={isPending}
        pagination={false}
        dataSource={lines}
        rowSelection={{ selectedRowKeys: picked, onChange: (keys) => setPicked(keys as number[]) }}
        locale={{ emptyText: "Nothing pending on this order" }}
        columns={[
          { title: "Item", dataIndex: "itemCode" },
          { title: "Description", dataIndex: "description" },
          { title: "Ordered", dataIndex: "quantity", render: (v: string) => Number(v) },
          { title: "Delivered", dataIndex: "deliveredQty", render: (v: string) => Number(v) },
          { title: "Pending (to write off)", dataIndex: "pendingQty", render: (v: string) => <strong>{Number(v)}</strong> },
        ]}
      />
    </Modal>
  );
}
