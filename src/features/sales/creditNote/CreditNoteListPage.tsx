// src/features/sales/creditNote/CreditNoteListPage.tsx

import { useState } from "react";
import { Dropdown, Input, Modal, Table, message } from "antd";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import { showApiErrorPopup } from "../../../lib/apiError";
import {
  CancelIrnModal,
  EINVOICE_LABEL,
  EInvoiceTag,
  generateIrnWithFeedback,
  useGenerateIrn,
  within24h,
} from "../shared/compliance";
import { DATE_RANGE_FIELDS, FilterPanel, PageHeader, ReasonModal, StatusTag, money } from "../shared/components";
import { REFUND_STATUS_OPTIONS } from "../salesReturn/types";
import type { ListParams } from "../shared/types";
import { creditNoteApi } from "./api";
import { CREDIT_NOTE_REASONS, type CreditNote } from "./types";

const REASON_LABEL = Object.fromEntries(CREDIT_NOTE_REASONS.map((r) => [r.value, r.label]));

export function CreditNoteListPage() {
  const navigate = useNavigate();
  const [params, setParams] = useState<ListParams>({});
  const [search, setSearch] = useState("");
  const [cancelFor, setCancelFor] = useState<CreditNote | null>(null);
  const [irnCancelFor, setIrnCancelFor] = useState<CreditNote | null>(null);
  const { data = [], isPending } = creditNoteApi.useList({ ...params, search: search || params.search });
  const deleteMutation = creditNoteApi.useDelete();
  const action = creditNoteApi.useAction();
  const generateIrn = useGenerateIrn("credit-notes");

  function rowMenu(r: CreditNote): MenuProps["items"] {
    const live = r.status !== "Cancelled";
    const items: MenuProps["items"] = [{ key: "view", label: "View", onClick: () => navigate(`/sales/credit-note/${r.id}/view`) }];
    if (live && r.einvoiceStatus !== "Generated") {
      items.push({ key: "edit", label: "Edit / Record Refund", onClick: () => navigate(`/sales/credit-note/${r.id}`) });
    }
    if (live && r.einvoiceStatus === "Pending") {
      items.push({ key: "irn", label: "Generate IRN", onClick: () => generateIrnWithFeedback(generateIrn, r.id, r.creditNoteNumber) });
    }
    if (r.einvoiceStatus === "Generated" && within24h(r.ackDate)) {
      items.push({ key: "irn-cancel", label: "Cancel IRN", onClick: () => setIrnCancelFor(r) });
    }
    if (live && r.einvoiceStatus !== "Generated") {
      items.push({ type: "divider" });
      items.push({ key: "cancel", label: "Cancel Credit Note", onClick: () => setCancelFor(r) });
    }
    if (!r.irn) {
      items.push({
        key: "delete",
        label: "Delete",
        danger: true,
        onClick: () =>
          Modal.confirm({
            title: `Delete ${r.creditNoteNumber}?`,
            okButtonProps: { danger: true },
            onOk: () =>
              deleteMutation.mutateAsync(r.id).then(
                () => message.success("Deleted"),
                (e) => showApiErrorPopup("Could not delete the credit note", e)
              ),
          }),
      });
    }
    return items;
  }

  const columns: ColumnsType<CreditNote> = [
    {
      title: "Credit Note No.",
      dataIndex: "creditNoteNumber",
      render: (v: string, r) => <a onClick={() => navigate(`/sales/credit-note/${r.id}/view`)}>{v}</a>,
    },
    { title: "Date", dataIndex: "creditNoteDate" },
    { title: "Invoice No.", dataIndex: "invoiceNumber" },
    { title: "Return No.", dataIndex: "returnNumber", render: (v: string | null) => v ?? "-" },
    { title: "Customer", dataIndex: "customerName" },
    { title: "Reason", dataIndex: "reason", render: (v: string) => REASON_LABEL[v] ?? v },
    { title: "Net Amount", dataIndex: "netAmount", align: "right", render: (v: string) => money(v) },
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
      <PageHeader title="Credit Note" action={<a onClick={() => navigate("/sales/credit-note/new")}>+ New Credit Note</a>} />
      <FilterPanel
        onApply={setParams}
        fields={[
          { name: "search", label: "CN No. / Invoice No. / Customer" },
          { name: "status", label: "Status", type: "select", options: REFUND_STATUS_OPTIONS },
          {
            name: "einvoice_status",
            label: "E-Invoice",
            type: "select",
            options: Object.entries(EINVOICE_LABEL).map(([value, { label }]) => ({ value, label })),
          },
          ...DATE_RANGE_FIELDS,
        ]}
      />
      <Input.Search placeholder="Quick search (CN No. / Invoice No.)..." allowClear onSearch={setSearch} style={{ maxWidth: 320, marginBottom: 14 }} />
      <Table<CreditNote> rowKey="id" loading={isPending} dataSource={data} columns={columns} />
      <ReasonModal
        open={!!cancelFor}
        title={`Cancel ${cancelFor?.creditNoteNumber ?? ""}`}
        label="Reason"
        required
        loading={action.isPending}
        onCancel={() => setCancelFor(null)}
        onSubmit={(reason) =>
          cancelFor &&
          action.mutate(
            { id: cancelFor.id, action: "cancel", body: { reason } },
            {
              onSuccess: () => {
                message.success("Credit note cancelled");
                setCancelFor(null);
              },
              onError: (e) => showApiErrorPopup("Could not cancel the credit note", e),
            }
          )
        }
      />
      <CancelIrnModal
        resource="credit-notes"
        doc={irnCancelFor ? { id: irnCancelFor.id, number: irnCancelFor.creditNoteNumber } : null}
        onClose={() => setIrnCancelFor(null)}
      />
    </div>
  );
}
