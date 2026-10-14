// src/features/sales/quotation/QuotationListPage.tsx

import { useState } from "react";
import { Dropdown, Input, Modal, Table, message } from "antd";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import { showApiErrorPopup } from "../../../lib/apiError";
import {
  DATE_RANGE_FIELDS,
  FilterPanel,
  GodownPickerModal,
  PageHeader,
  StatusTag,
  SummaryCards,
  money,
} from "../shared/components";
import type { ListParams } from "../shared/types";
import { quotationApi } from "./api";
import { LOCKED_QUOTATION_STATUSES, type Quotation } from "./types";

const STATUS_FILTER = ["Draft", "Sent", "Accepted", "Declined", "Converted"].map((s) => ({ value: s, label: s }));

export function QuotationListPage() {
  const navigate = useNavigate();
  const [params, setParams] = useState<ListParams>({});
  const [search, setSearch] = useState("");
  const [invoiceFor, setInvoiceFor] = useState<Quotation | null>(null);
  const { data = [], isPending } = quotationApi.useList({ ...params, search: search || params.search });
  const { data: summary } = quotationApi.useGet<{ pendingQuotations: number }>("summary/");
  const deleteMutation = quotationApi.useDelete();
  const action = quotationApi.useAction<{ id: number; soNumber?: string; invoiceNumber?: string }>();

  function run(record: Quotation, name: string, success: string, body?: unknown) {
    return action
      .mutateAsync({ id: record.id, action: name, body })
      .then((result) => {
        message.success(success.replace("{n}", result.soNumber ?? result.invoiceNumber ?? ""));
        return result;
      })
      .catch((e) => {
        showApiErrorPopup(`Could not update ${record.quotationNumber}`, e);
        return null;
      });
  }

  function rowMenu(r: Quotation): MenuProps["items"] {
    const open = r.status === "Draft" || r.status === "Sent";
    const items: MenuProps["items"] = [
      { key: "view", label: "View", onClick: () => navigate(`/sales/quotation/${r.id}/view`) },
    ];
    if (!LOCKED_QUOTATION_STATUSES.includes(r.status)) {
      items.push({ key: "edit", label: "Edit", onClick: () => navigate(`/sales/quotation/${r.id}`) });
    }
    if (r.status === "Draft") items.push({ key: "sent", label: "Mark as Sent", onClick: () => run(r, "mark-sent", "Marked as sent") });
    if (open) {
      items.push({
        key: "accept",
        label: "Accept",
        disabled: r.isExpired,
        title: r.isExpired ? "Expired - extend Valid Till first" : undefined,
        onClick: () => run(r, "accept", "Quotation accepted"),
      });
      items.push({
        key: "decline",
        label: "Decline",
        onClick: () =>
          Modal.confirm({ title: `Decline ${r.quotationNumber}?`, onOk: () => run(r, "decline", "Quotation declined") }),
      });
    }
    if (r.status === "Accepted") {
      items.push({ type: "divider" });
      items.push({
        key: "so",
        label: "Convert to Sale Order",
        onClick: () =>
          run(r, "convert-to-sales-order", "Sale Order {n} created").then((so) => so && navigate(`/sales/sale-order/${so.id}`)),
      });
      items.push({ key: "inv", label: "Convert to Invoice", onClick: () => setInvoiceFor(r) });
    }
    if (r.status !== "Converted") {
      items.push({ type: "divider" });
      items.push({
        key: "delete",
        label: "Delete",
        danger: true,
        onClick: () =>
          Modal.confirm({
            title: `Delete ${r.quotationNumber}?`,
            okButtonProps: { danger: true },
            onOk: () =>
              deleteMutation.mutateAsync(r.id).then(
                () => message.success("Deleted"),
                (e) => showApiErrorPopup("Could not delete the Quotation", e)
              ),
          }),
      });
    }
    return items;
  }

  const columns: ColumnsType<Quotation> = [
    {
      title: "Quotation No.",
      dataIndex: "quotationNumber",
      render: (v: string, r) => <a onClick={() => navigate(`/sales/quotation/${r.id}/view`)}>{v}</a>,
    },
    { title: "Date", dataIndex: "quotationDate" },
    { title: "Customer", dataIndex: "customerName" },
    { title: "Enquiry No.", dataIndex: "enquiryNumber", render: (v: string | null) => v ?? "-" },
    { title: "Valid Till", dataIndex: "validTill", render: (v: string | null) => v ?? "-" },
    { title: "Net Amount", dataIndex: "netAmount", align: "right", render: (v: string) => money(v) },
    {
      title: "Status",
      key: "status",
      render: (_, r) => <StatusTag status={r.isExpired ? "Expired" : r.status} />,
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
      <PageHeader title="Quotation" action={<a onClick={() => navigate("/sales/quotation/new")}>+ New Quotation</a>} />
      <SummaryCards cards={[{ label: "Pending Quotations", value: summary?.pendingQuotations }]} />
      <FilterPanel
        onApply={setParams}
        fields={[
          { name: "search", label: "Quotation No. / Customer" },
          { name: "status", label: "Status", type: "select", options: STATUS_FILTER },
          ...DATE_RANGE_FIELDS,
        ]}
      />
      <Input.Search
        placeholder="Quick search (Quotation No. / Customer)..."
        allowClear
        onSearch={setSearch}
        style={{ maxWidth: 320, marginBottom: 14 }}
      />
      <Table<Quotation> rowKey="id" loading={isPending} dataSource={data} columns={columns} />
      <GodownPickerModal
        open={!!invoiceFor}
        title={`Convert ${invoiceFor?.quotationNumber ?? ""} to Invoice`}
        loading={action.isPending}
        onCancel={() => setInvoiceFor(null)}
        onSubmit={(godown) =>
          invoiceFor &&
          run(invoiceFor, "convert-to-invoice", "Invoice {n} created", { godown }).then((inv) => inv && setInvoiceFor(null))
        }
      />
    </div>
  );
}
