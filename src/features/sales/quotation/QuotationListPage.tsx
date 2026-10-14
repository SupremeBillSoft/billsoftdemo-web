// src/features/sales/quotation/QuotationListPage.tsx
//
// CHANGES vs the previous version (search for "// NEW"):
//   1. Collapsible "Search & Filter" panel like the old list: Customer Code / Customer Name combos,
//      From / To date (default = today + the 2 days before), Status, Search / Reset
//   2. Sorting: newest first (date desc, then quotation no. desc) by default; every column header sorts
//   3. Click a row to see its items (and sub items) in a popup; the row's ⋮ menu still works as before

import { useMemo, useState } from "react";
import { Button, DatePicker, Dropdown, Input, Modal, Select, Table, message } from "antd";
import { DownOutlined, UpOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { showApiErrorPopup } from "../../../lib/apiError";
import { DISPLAY_DATE_FORMAT, formatDisplayDate } from "../../../lib/date";
import { CustomerSelect } from "../../parties/PartySelect";
import {
  DATE_RANGE_FIELDS,
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

const DEFAULT_RANGE_DAYS = 2; // today + the 2 days before
const ISO = "YYYY-MM-DD";

// The date filter param names are whatever the shared date-range fields use, so they always match the backend.
const [FROM_KEY, TO_KEY] = DATE_RANGE_FIELDS.map((f) => f.name as string);

interface Filters {
  fromDate: string;
  toDate: string;
  customer?: number;
  status?: string;
}

const defaultFilters = (): Filters => ({
  fromDate: dayjs().subtract(DEFAULT_RANGE_DAYS, "day").format(ISO),
  toDate: dayjs().format(ISO),
});

// What the popup needs from a quotation's lines (the list API returns lines with their sub items).
interface PopupBreakup {
  id?: number;
  description: string;
  hsnSac?: string;
  quantity: number | string;
  uom?: string;
  rate: number | string;
  amount?: number | string;
}
interface PopupLine {
  id?: number;
  description: string;
  estimationType?: string;
  hsnSac?: string;
  quantity: number | string;
  uom?: string;
  rate: number | string;
  lineTotal?: number | string;
  breakups?: PopupBreakup[];
}
interface PopupRow {
  key: string;
  sNo: string;
  child: boolean;
  description: string;
  type: string;
  hsnSac: string;
  quantity: number | string;
  uom: string;
  rate: number | string;
  amount: number | string | undefined;
}

// lines, each followed by its sub items: 1, 2, 2.1, 2.2 ...
function popupRows(items: unknown): PopupRow[] {
  const rows: PopupRow[] = [];
  ((items ?? []) as PopupLine[]).forEach((line, i) => {
    rows.push({
      key: `L${i}`,
      sNo: String(i + 1),
      child: false,
      description: line.description,
      type: line.estimationType ?? "Direct",
      hsnSac: line.hsnSac ?? "",
      quantity: line.quantity,
      uom: line.uom ?? "",
      rate: line.rate,
      amount: line.lineTotal,
    });
    (line.breakups ?? []).forEach((b, j) =>
      rows.push({
        key: `L${i}.${j}`,
        sNo: `${i + 1}.${j + 1}`,
        child: true,
        description: b.description,
        type: "",
        hsnSac: b.hsnSac ?? "",
        quantity: b.quantity,
        uom: b.uom ?? "",
        rate: b.rate,
        amount: b.amount,
      }),
    );
  });
  return rows;
}

// year code first, then the number as a number (so "10" sorts after "9")
const byNumber = (a: Quotation, b: Quotation) =>
  (a.quotationYearCode ?? "").localeCompare(b.quotationYearCode ?? "") ||
  Number(a.quotationNumber) - Number(b.quotationNumber);

export function QuotationListPage() {
  const navigate = useNavigate();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draft, setDraft] = useState<Filters>(defaultFilters); // what the panel shows
  const [applied, setApplied] = useState<Filters>(defaultFilters); // what is actually loaded
  const [search, setSearch] = useState("");
  const [invoiceFor, setInvoiceFor] = useState<Quotation | null>(null);
  const [selected, setSelected] = useState<Quotation | null>(null); // NEW: row whose items are shown

  const params = {
    [FROM_KEY]: applied.fromDate,
    [TO_KEY]: applied.toDate,
    status: applied.status,
    customer: applied.customer,
    search: search || undefined,
  } as unknown as ListParams;

  const { data = [], isPending } = quotationApi.useList(params);
  const { data: summary } = quotationApi.useGet<{ pendingQuotations: number }>("summary/");
  const deleteMutation = quotationApi.useDelete();
  const action = quotationApi.useAction<{ id: number; soNumber?: string; invoiceNumber?: string }>();

  // The server filters by date too; this keeps the list right even if a filter isn't applied server-side.
  const rows = useMemo(
    () =>
      data.filter(
        (q) =>
          q.quotationDate >= applied.fromDate &&
          q.quotationDate <= applied.toDate &&
          (applied.customer == null || (q as unknown as { customer: number }).customer === applied.customer),
      ),
    [data, applied],
  );

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

  // NEW: sorters. Default = newest first: date desc, then quotation no. desc.
  const columns: ColumnsType<Quotation> = [
    {
      title: "Quotation No.",
      key: "quotationNumber",
      sorter: byNumber,
      render: (_, r) => (
        <a
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/sales/quotation/${r.id}/view`);
          }}
        >
          {r.quotationNumber} / {r.quotationYearCode}
        </a>
      ),
    },
    {
      title: "Date",
      dataIndex: "quotationDate",
      defaultSortOrder: "descend",
      sorter: (a, b) => a.quotationDate.localeCompare(b.quotationDate) || byNumber(a, b),
      render: (v: string) => formatDisplayDate(v),
    },
    { title: "Customer", dataIndex: "customerName", sorter: (a, b) => (a.customerName ?? "").localeCompare(b.customerName ?? "") },
    {
      title: "Enquiry No.",
      dataIndex: "enquiryNumber",
      sorter: (a, b) => (a.enquiryNumber ?? "").localeCompare(b.enquiryNumber ?? ""),
      render: (v: string | null) => v ?? "-",
    },
    {
      title: "Valid Till",
      dataIndex: "validTill",
      sorter: (a, b) => (a.validTill ?? "").localeCompare(b.validTill ?? ""),
      render: (v: string | null) => (v ? formatDisplayDate(v) : "-"),
    },
    {
      title: "Net Amount",
      dataIndex: "netAmount",
      align: "right",
      sorter: (a, b) => Number(a.netAmount) - Number(b.netAmount),
      render: (v: string) => money(v),
    },
    {
      title: "Status",
      key: "status",
      sorter: (a, b) => (a.isExpired ? "Expired" : a.status).localeCompare(b.isExpired ? "Expired" : b.status),
      render: (_, r) => <StatusTag status={r.isExpired ? "Expired" : r.status} />,
    },
    {
      title: "",
      key: "actions",
      render: (_, r) => (
        // stopPropagation keeps the ⋮ menu from also opening the items popup
        <div onClick={(e) => e.stopPropagation()}>
          <Dropdown menu={{ items: rowMenu(r) }} trigger={["click"]}>
            <a onClick={(e) => e.preventDefault()}>⋮</a>
          </Dropdown>
        </div>
      ),
    },
  ];

  // popup table: same look as the entry grid (sub items shaded blue, numbered 2.1, 2.2 ...)
  const popupColumns: ColumnsType<PopupRow> = [
    { title: "#", dataIndex: "sNo", width: 60, render: (v: string, r) => <span style={{ color: r.child ? "#1a3fd0" : undefined }}>{v}</span> },
    { title: "Description", dataIndex: "description" },
    { title: "Estimation Type", dataIndex: "type", render: (v: string) => v || "" },
    { title: "HSN/SAC", dataIndex: "hsnSac", render: (v: string) => v || "-" },
    { title: "Qty", dataIndex: "quantity", align: "right", render: (v: number | string) => Number(v ?? 0) },
    { title: "Unit", dataIndex: "uom", render: (v: string) => v || "-" },
    { title: "Rate", dataIndex: "rate", align: "right", render: (v: number | string) => money(v) },
    { title: "Amount", dataIndex: "amount", align: "right", render: (v?: number | string) => (v == null ? "-" : money(v)) },
  ];

  const labelStyle = { fontSize: 11.5, marginBottom: 5 };

  return (
    <div>
      <PageHeader title="Quotation" action={<a onClick={() => navigate("/sales/quotation/new")}>+ New Quotation</a>} />
      <SummaryCards cards={[{ label: "Pending Quotations", value: summary?.pendingQuotations }]} />

      {/* NEW: collapsible Search & Filter panel */}
      <div style={{ border: "1px solid #E4E1DA", borderRadius: 8, padding: 16, marginBottom: 18 }}>
        <div
          style={{ cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
          onClick={() => setFiltersOpen((o) => !o)}
        >
          {filtersOpen ? <UpOutlined /> : <DownOutlined />} Search & Filter
        </div>
        {filtersOpen && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 14 }}>
              <div>
                <div style={labelStyle}>Customer Code</div>
                <CustomerSelect by="code" value={draft.customer} onChange={(id) => setDraft((f) => ({ ...f, customer: id }))} />
              </div>
              <div>
                <div style={labelStyle}>Customer Name</div>
                <CustomerSelect by="name" value={draft.customer} onChange={(id) => setDraft((f) => ({ ...f, customer: id }))} />
              </div>
              <div>
                <div style={labelStyle}>Status</div>
                <Select
                  allowClear
                  style={{ width: "100%" }}
                  placeholder="All"
                  options={STATUS_FILTER}
                  value={draft.status}
                  onChange={(v) => setDraft((f) => ({ ...f, status: v }))}
                />
              </div>
              <div>
                <div style={labelStyle}>From Date</div>
                <DatePicker
                  style={{ width: "100%" }}
                  format={DISPLAY_DATE_FORMAT}
                  allowClear={false}
                  value={draft.fromDate ? dayjs(draft.fromDate) : null}
                  onChange={(d) => d && setDraft((f) => ({ ...f, fromDate: d.format(ISO) }))}
                />
              </div>
              <div>
                <div style={labelStyle}>To Date</div>
                <DatePicker
                  style={{ width: "100%" }}
                  format={DISPLAY_DATE_FORMAT}
                  allowClear={false}
                  disabledDate={(d) => !!draft.fromDate && d.isBefore(dayjs(draft.fromDate), "day")}
                  value={draft.toDate ? dayjs(draft.toDate) : null}
                  onChange={(d) => d && setDraft((f) => ({ ...f, toDate: d.format(ISO) }))}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <Button type="primary" onClick={() => setApplied(draft)}>
                Search
              </Button>
              <Button
                onClick={() => {
                  const r = defaultFilters();
                  setDraft(r);
                  setApplied(r);
                }}
              >
                Reset
              </Button>
            </div>
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 14 }}>
        <Input.Search
          placeholder="Quick search (Quotation No. / Customer)..."
          allowClear
          onSearch={setSearch}
          style={{ maxWidth: 320 }}
        />
        <span style={{ fontSize: 12, color: "#6b6b6b" }}>
          Showing {formatDisplayDate(applied.fromDate)} to {formatDisplayDate(applied.toDate)}
        </span>
      </div>

      <Table<Quotation>
        rowKey="id"
        loading={isPending}
        dataSource={rows}
        columns={columns}
        sortDirections={["descend", "ascend"]}
        // NEW: clicking a row opens its items; the ⋮ menu and the number link stop the click
        onRow={(record) => ({ onClick: () => setSelected(record), style: { cursor: "pointer" } })}
      />

      {/* NEW: items popup */}
      <Modal
        title={selected ? `Quotation ${selected.quotationNumber} / ${selected.quotationYearCode} — Items` : ""}
        open={!!selected}
        onCancel={() => setSelected(null)}
        width={900}
        footer={[
          selected && !LOCKED_QUOTATION_STATUSES.includes(selected.status) && (
            <Button key="edit" onClick={() => navigate(`/sales/quotation/${selected.id}`)}>
              Edit
            </Button>
          ),
          <Button key="close" type="primary" onClick={() => setSelected(null)}>
            Close
          </Button>,
        ]}
      >
        {selected && (
          <>
            <div style={{ display: "flex", gap: 24, marginBottom: 16, fontSize: 13, flexWrap: "wrap" }}>
              <div><b>Customer:</b> {selected.customerName}</div>
              <div><b>Date:</b> {formatDisplayDate(selected.quotationDate)}</div>
              <div><b>Valid Till:</b> {selected.validTill ? formatDisplayDate(selected.validTill) : "-"}</div>
              <div><b>Net Amount:</b> {money(selected.netAmount)}</div>
            </div>
            <Table<PopupRow>
              size="small"
              rowKey="key"
              pagination={false}
              dataSource={popupRows(selected.items)}
              columns={popupColumns}
              onRow={(r) => ({ style: r.child ? { background: "#f1f9ff" } : undefined })}
            />
          </>
        )}
      </Modal>

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
