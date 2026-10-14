// src/features/sales/eInvoice/EInvoicePage.tsx
//
// BRD 6.4.6 E-Invoice: every B2B invoice / credit note that needs an IRN,
// in one place - generate (one or many), see IRN / Ack details, cancel
// within 24 hours. The documents themselves are created on their screens.

import { useState } from "react";
import { Alert, Button, Input, Modal, Segmented, Select, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../../../lib/apiError";
import { apiClient } from "../../../lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useCompanySettingsQuery } from "../../settings/api";
import { creditNoteApi } from "../creditNote/api";
import { invoiceApi } from "../invoice/api";
import { SALES_KEY } from "../shared/api";
import { CancelIrnModal, EINVOICE_LABEL, EInvoiceTag, within24h, type EInvoiceFields } from "../shared/compliance";
import { PageHeader, SummaryCards, money } from "../shared/components";

type Kind = "invoices" | "credit-notes";

interface Row extends EInvoiceFields {
  id: number;
  number: string;
  date: string;
  customerName?: string;
  netAmount?: string;
  status: string;
}

const STATUS_OPTIONS = Object.entries(EINVOICE_LABEL)
  .filter(([v]) => v !== "NotApplicable")
  .map(([value, { label }]) => ({ value, label }));

export function EInvoicePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: settings } = useCompanySettingsQuery();
  const [kind, setKind] = useState<Kind>("invoices");
  const [einvoiceStatus, setEinvoiceStatus] = useState<string | undefined>("Pending");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [running, setRunning] = useState(false);
  const [cancelFor, setCancelFor] = useState<Row | null>(null);

  const params = { einvoice_status: einvoiceStatus, search };
  const invoices = invoiceApi.useList(params, kind === "invoices");
  const notes = creditNoteApi.useList(params, kind === "credit-notes");
  const { data: invoicePending } = invoiceApi.useList({ einvoice_status: "Pending", status: "Active" });
  const { data: notePending } = creditNoteApi.useList({ einvoice_status: "Pending" });

  const rows: Row[] =
    kind === "invoices"
      ? (invoices.data ?? [])
          .filter((i) => i.einvoiceStatus !== "NotApplicable")
          .map((i) => ({ ...i, number: i.invoiceNumber, date: i.invoiceDate }))
      : (notes.data ?? [])
          .filter((n) => n.einvoiceStatus !== "NotApplicable")
          .map((n) => ({ ...n, number: n.creditNoteNumber, date: n.creditNoteDate }));

  // Generate one after another so each document's result is reported.
  async function generateSelected() {
    const targets = rows.filter((r) => selected.includes(r.id) && r.einvoiceStatus === "Pending" && r.status !== "Cancelled");
    setRunning(true);
    const done: string[] = [];
    const failed: string[] = [];
    for (const r of targets) {
      try {
        await apiClient.post(`/sales/${kind}/${r.id}/einvoice/generate/`, {});
        done.push(r.number);
      } catch (e) {
        failed.push(`${r.number}: ${getApiErrorMessage(e)}`);
      }
    }
    setRunning(false);
    setSelected([]);
    queryClient.invalidateQueries({ queryKey: SALES_KEY });
    (failed.length ? Modal.warning : Modal.success)({
      title: `IRN generated for ${done.length} of ${targets.length}`,
      content: <div style={{ whiteSpace: "pre-line" }}>{[done.length ? `Done: ${done.join(", ")}` : "", ...failed].filter(Boolean).join("\n")}</div>,
    });
  }

  const columns: ColumnsType<Row> = [
    {
      title: kind === "invoices" ? "Invoice No." : "Credit Note No.",
      dataIndex: "number",
      render: (v: string, r) => <a onClick={() => navigate(`/sales/${kind === "invoices" ? "invoice" : "credit-note"}/${r.id}/view`)}>{v}</a>,
    },
    { title: "Date", dataIndex: "date" },
    { title: "Customer", dataIndex: "customerName" },
    { title: "Net Amount", dataIndex: "netAmount", align: "right", render: (v: string) => money(v) },
    { title: "E-Invoice", key: "einv", render: (_, r) => <EInvoiceTag status={r.einvoiceStatus} /> },
    {
      title: "IRN",
      dataIndex: "irn",
      render: (v: string) => (v ? <code title={v}>{v.slice(0, 16)}…</code> : "-"),
    },
    { title: "Ack No.", dataIndex: "ackNo", render: (v: string) => v || "-" },
    { title: "Ack Date", dataIndex: "ackDate", render: (v: string | null) => (v ? dayjs(v).format("DD-MM-YYYY HH:mm") : "-") },
    {
      title: "",
      key: "actions",
      render: (_, r) =>
        r.einvoiceStatus === "Generated" && within24h(r.ackDate) ? (
          <a onClick={() => setCancelFor(r)}>Cancel IRN</a>
        ) : r.einvoiceStatus === "Generated" ? (
          <span style={{ color: "#8c8c8c", fontSize: 12 }}>Past 24 h - use a Credit Note</span>
        ) : null,
    },
  ];

  const selectable = rows.filter((r) => selected.includes(r.id) && r.einvoiceStatus === "Pending").length;

  return (
    <div>
      <PageHeader title="E-Invoice" />
      {settings && !settings.einvoiceEnabled && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title="E-invoicing is turned off in Company Settings, so new invoices won't need an IRN."
          action={<Button size="small" onClick={() => navigate("/settings")}>Settings</Button>}
        />
      )}
      {settings?.aato10crOrMore && (
        <Alert type="warning" showIcon style={{ marginBottom: 16 }} title="Turnover Rs 10 crore+: each document must get its IRN within 30 days of its date." />
      )}
      <SummaryCards
        cards={[
          { label: "Invoices awaiting IRN", value: invoicePending?.length },
          { label: "Credit notes awaiting IRN", value: notePending?.length },
        ]}
      />
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <Segmented
          value={kind}
          onChange={(v) => {
            setKind(v as Kind);
            setSelected([]);
          }}
          options={[
            { value: "invoices", label: "Invoices" },
            { value: "credit-notes", label: "Credit Notes" },
          ]}
        />
        <Select style={{ width: 180 }} allowClear placeholder="All statuses" value={einvoiceStatus} onChange={setEinvoiceStatus} options={STATUS_OPTIONS} />
        <Input.Search placeholder="Document No. / Customer / IRN" allowClear onSearch={setSearch} style={{ maxWidth: 300 }} />
        <div style={{ flex: 1 }} />
        {selectable > 0 && (
          <Button type="primary" loading={running} onClick={generateSelected}>
            Generate IRN for {selectable} selected
          </Button>
        )}
      </div>
      <Table<Row>
        rowKey="id"
        loading={kind === "invoices" ? invoices.isPending : notes.isPending}
        dataSource={rows}
        columns={columns}
        rowSelection={{
          selectedRowKeys: selected,
          onChange: (keys) => setSelected(keys as number[]),
          getCheckboxProps: (r) => ({ disabled: r.einvoiceStatus !== "Pending" || r.status === "Cancelled" }),
        }}
      />
      <CancelIrnModal resource={kind} doc={cancelFor ? { id: cancelFor.id, number: cancelFor.number } : null} onClose={() => setCancelFor(null)} />
    </div>
  );
}
