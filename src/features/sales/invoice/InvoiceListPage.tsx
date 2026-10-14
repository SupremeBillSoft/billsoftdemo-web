// src/features/sales/invoice/InvoiceListPage.tsx

import { useState } from "react";
import { Dropdown, Input, Modal, Table, Tag, message } from "antd";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import { showApiErrorPopup } from "../../../lib/apiError";
import {
  CancelIrnModal,
  EINVOICE_LABEL,
  EInvoiceTag,
  EWayBillModal,
  generateIrnWithFeedback,
  useGenerateIrn,
  within24h,
} from "../shared/compliance";
import {
  DATE_RANGE_FIELDS,
  FilterPanel,
  PageHeader,
  ReasonModal,
  StatusTag,
  SummaryCards,
  money,
} from "../shared/components";
import type { ListParams } from "../shared/types";
import { invoiceApi } from "./api";
import { INVOICE_TYPE_OPTIONS, TAX_NATURE_OPTIONS, type SalesInvoice } from "./types";

const TYPE_LABEL = Object.fromEntries(INVOICE_TYPE_OPTIONS.map((o) => [o.value, o.label]));

export function InvoiceListPage() {
  const navigate = useNavigate();
  const [params, setParams] = useState<ListParams>({});
  const [search, setSearch] = useState("");
  const [cancelFor, setCancelFor] = useState<SalesInvoice | null>(null);
  const [irnCancelFor, setIrnCancelFor] = useState<SalesInvoice | null>(null);
  const [ewayFor, setEwayFor] = useState<SalesInvoice | null>(null);

  const { data = [], isPending } = invoiceApi.useList({ ...params, search: search || params.search });
  const { data: summary } = invoiceApi.useGet<{ pendingInvoices: number; receivable: string; einvoicePending: number }>("summary/");
  const deleteMutation = invoiceApi.useDelete();
  const action = invoiceApi.useAction();
  const generateIrn = useGenerateIrn("invoices");

  function rowMenu(r: SalesInvoice): MenuProps["items"] {
    const active = r.status === "Active";
    const taxInvoice = r.invoiceType !== "Proforma";
    const items: MenuProps["items"] = [{ key: "view", label: "View", onClick: () => navigate(`/sales/invoice/${r.id}/view`) }];
    if (active && r.einvoiceStatus !== "Generated") {
      items.push({ key: "edit", label: "Edit", onClick: () => navigate(`/sales/invoice/${r.id}`) });
    }
    if (active && r.einvoiceStatus === "Pending") {
      items.push({ key: "irn", label: "Generate IRN", onClick: () => generateIrnWithFeedback(generateIrn, r.id, r.invoiceNumber) });
    }
    if (r.einvoiceStatus === "Generated" && within24h(r.ackDate)) {
      items.push({ key: "irn-cancel", label: "Cancel IRN", onClick: () => setIrnCancelFor(r) });
    }
    if (active && taxInvoice) {
      items.push({ key: "ewb", label: "Generate E-Way Bill", onClick: () => setEwayFor(r) });
      items.push({ type: "divider" });
      items.push({ key: "return", label: "Sales Return", onClick: () => navigate(`/sales/return/new?invoice=${r.id}`) });
      items.push({ key: "cn", label: "Credit Note", onClick: () => navigate(`/sales/credit-note/new?invoice=${r.id}`) });
    }
    if (active && r.einvoiceStatus !== "Generated") {
      items.push({ type: "divider" });
      items.push({ key: "cancel", label: "Cancel Invoice", onClick: () => setCancelFor(r) });
    }
    if (!r.irn) {
      items.push({
        key: "delete",
        label: "Delete",
        danger: true,
        onClick: () =>
          Modal.confirm({
            title: `Delete ${r.invoiceNumber}?`,
            content: "Stock it took out goes back. Prefer Cancel to keep the number in the series.",
            okButtonProps: { danger: true },
            onOk: () =>
              deleteMutation.mutateAsync(r.id).then(
                () => message.success("Deleted"),
                (e) => showApiErrorPopup("Could not delete the invoice", e)
              ),
          }),
      });
    }
    return items;
  }

  const columns: ColumnsType<SalesInvoice> = [
    {
      title: "Invoice No.",
      dataIndex: "invoiceNumber",
      render: (v: string, r) => <a onClick={() => navigate(`/sales/invoice/${r.id}/view`)}>{v}</a>,
    },
    { title: "Date", dataIndex: "invoiceDate" },
    {
      title: "Type",
      key: "type",
      render: (_, r) => (r.invoiceType === "Proforma" ? <Tag>Proforma</Tag> : r.invoiceType === "Export" ? <Tag color="geekblue">Export</Tag> : TYPE_LABEL[r.invoiceType]),
    },
    { title: "Customer", dataIndex: "customerName" },
    { title: "Net Amount", dataIndex: "netAmount", align: "right", render: (v: string) => money(v) },
    {
      title: "Balance",
      dataIndex: "balanceAmount",
      align: "right",
      render: (v: string, r) => (r.invoiceType === "Proforma" || r.status === "Cancelled" ? "-" : Number(v) > 0 ? <strong>{money(v)}</strong> : <Tag color="green">Paid</Tag>),
    },
    { title: "E-Invoice", key: "einv", render: (_, r) => (r.einvoiceStatus === "NotApplicable" ? "-" : <EInvoiceTag status={r.einvoiceStatus} />) },
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
      <PageHeader title="Sales Invoice" action={<a onClick={() => navigate("/sales/invoice/new")}>+ New Invoice</a>} />
      <SummaryCards
        cards={[
          { label: "Unpaid Invoices", value: summary?.pendingInvoices },
          { label: "Receivable (₹)", value: summary ? money(summary.receivable) : undefined },
          { label: "IRN Pending", value: summary?.einvoicePending },
        ]}
      />
      <FilterPanel
        onApply={setParams}
        fields={[
          { name: "search", label: "Invoice No. / Customer / IRN" },
          { name: "invoice_type", label: "Invoice Type", type: "select", options: INVOICE_TYPE_OPTIONS.map(({ value, label }) => ({ value, label })) },
          { name: "tax_nature", label: "Nature", type: "select", options: TAX_NATURE_OPTIONS },
          { name: "status", label: "Status", type: "select", options: ["Active", "Cancelled"].map((s) => ({ value: s, label: s })) },
          {
            name: "einvoice_status",
            label: "E-Invoice",
            type: "select",
            options: Object.entries(EINVOICE_LABEL).map(([value, { label }]) => ({ value, label })),
          },
          ...DATE_RANGE_FIELDS,
        ]}
      />
      <Input.Search placeholder="Quick search (Invoice No. / Customer)..." allowClear onSearch={setSearch} style={{ maxWidth: 320, marginBottom: 14 }} />
      <Table<SalesInvoice> rowKey="id" loading={isPending} dataSource={data} columns={columns} />

      <ReasonModal
        open={!!cancelFor}
        title={`Cancel ${cancelFor?.invoiceNumber ?? ""}`}
        label="Reason (stock goes back; the number stays used)"
        required
        loading={action.isPending}
        onCancel={() => setCancelFor(null)}
        onSubmit={(reason) =>
          cancelFor &&
          action.mutate(
            { id: cancelFor.id, action: "cancel", body: { reason } },
            {
              onSuccess: () => {
                message.success("Invoice cancelled");
                setCancelFor(null);
              },
              onError: (e) => showApiErrorPopup("Could not cancel the invoice", e),
            }
          )
        }
      />
      <CancelIrnModal
        resource="invoices"
        doc={irnCancelFor ? { id: irnCancelFor.id, number: irnCancelFor.invoiceNumber } : null}
        onClose={() => setIrnCancelFor(null)}
      />
      <EWayBillModal
        resource="invoices"
        doc={
          ewayFor
            ? { id: ewayFor.id, number: ewayFor.invoiceNumber, vehicleNo: ewayFor.vehicleNo, distanceKm: ewayFor.distanceKm, transportMode: ewayFor.transportMode }
            : null
        }
        onClose={() => setEwayFor(null)}
      />
    </div>
  );
}
