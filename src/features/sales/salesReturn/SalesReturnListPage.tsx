// src/features/sales/salesReturn/SalesReturnListPage.tsx

import { useState } from "react";
import { Dropdown, Input, Modal, Table, message } from "antd";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import { showApiErrorPopup } from "../../../lib/apiError";
import { DATE_RANGE_FIELDS, FilterPanel, PageHeader, ReasonModal, StatusTag, money } from "../shared/components";
import type { ListParams } from "../shared/types";
import { salesReturnApi } from "./api";
import { REFUND_STATUS_OPTIONS, type SalesReturn } from "./types";

export function SalesReturnListPage() {
  const navigate = useNavigate();
  const [params, setParams] = useState<ListParams>({});
  const [search, setSearch] = useState("");
  const [cancelFor, setCancelFor] = useState<SalesReturn | null>(null);
  const { data = [], isPending } = salesReturnApi.useList({ ...params, search: search || params.search });
  const deleteMutation = salesReturnApi.useDelete();
  const action = salesReturnApi.useAction();

  function rowMenu(r: SalesReturn): MenuProps["items"] {
    const live = r.status !== "Cancelled";
    const items: MenuProps["items"] = [{ key: "view", label: "View", onClick: () => navigate(`/sales/return/${r.id}/view`) }];
    if (live) {
      items.push({ key: "edit", label: "Edit / Record Refund", onClick: () => navigate(`/sales/return/${r.id}`) });
      items.push({ key: "cn", label: "Issue Credit Note", onClick: () => navigate(`/sales/credit-note/new?invoice=${r.salesInvoice}&return=${r.id}`) });
      items.push({ type: "divider" });
      items.push({ key: "cancel", label: "Cancel Return", onClick: () => setCancelFor(r) });
      items.push({
        key: "delete",
        label: "Delete",
        danger: true,
        onClick: () =>
          Modal.confirm({
            title: `Delete ${r.returnNumber}?`,
            content: "The returned stock is taken back out of the godown.",
            okButtonProps: { danger: true },
            onOk: () =>
              deleteMutation.mutateAsync(r.id).then(
                () => message.success("Deleted"),
                (e) => showApiErrorPopup("Could not delete the return", e)
              ),
          }),
      });
    }
    return items;
  }

  const columns: ColumnsType<SalesReturn> = [
    { title: "Return No.", dataIndex: "returnNumber", render: (v: string, r) => <a onClick={() => navigate(`/sales/return/${r.id}/view`)}>{v}</a> },
    { title: "Date", dataIndex: "returnDate" },
    { title: "Invoice No.", dataIndex: "invoiceNumber" },
    { title: "Customer", dataIndex: "customerName" },
    { title: "Reason", dataIndex: "reason", render: (v: string) => v || "-" },
    { title: "Net Amount", dataIndex: "netAmount", align: "right", render: (v: string) => money(v) },
    { title: "To Refund", dataIndex: "balanceAmount", align: "right", render: (v: string, r) => (r.status === "Cancelled" ? "-" : money(v)) },
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
      <PageHeader title="Sales Return" action={<a onClick={() => navigate("/sales/return/new")}>+ New Sales Return</a>} />
      <FilterPanel
        onApply={setParams}
        fields={[
          { name: "search", label: "Return No. / Invoice No. / Customer" },
          { name: "status", label: "Status", type: "select", options: REFUND_STATUS_OPTIONS },
          ...DATE_RANGE_FIELDS,
        ]}
      />
      <Input.Search placeholder="Quick search (Return No. / Invoice No.)..." allowClear onSearch={setSearch} style={{ maxWidth: 320, marginBottom: 14 }} />
      <Table<SalesReturn> rowKey="id" loading={isPending} dataSource={data} columns={columns} />
      <ReasonModal
        open={!!cancelFor}
        title={`Cancel ${cancelFor?.returnNumber ?? ""}`}
        label="Reason (the returned stock is taken back out)"
        required
        loading={action.isPending}
        onCancel={() => setCancelFor(null)}
        onSubmit={(reason) =>
          cancelFor &&
          action.mutate(
            { id: cancelFor.id, action: "cancel", body: { reason } },
            {
              onSuccess: () => {
                message.success("Return cancelled");
                setCancelFor(null);
              },
              onError: (e) => showApiErrorPopup("Could not cancel the return", e),
            }
          )
        }
      />
    </div>
  );
}
