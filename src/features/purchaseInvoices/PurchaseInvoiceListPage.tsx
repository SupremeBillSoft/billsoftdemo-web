// src/features/purchaseInvoices/PurchaseInvoiceListPage.tsx

import { useMemo, useState } from "react";
import { Button, DatePicker, Dropdown, Input, Modal, Select, Table, Tag } from "antd";
import { DownOutlined, UpOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";
import {
  usePurchaseInvoicesQuery,
  useDeletePurchaseInvoiceMutation,
  useCancelPurchaseInvoiceMutation,
} from "./api";
import { usePartiesQuery } from "../parties/api"; // adjust to actual export name
import type { PurchaseInvoice } from "./types";

const STATUS_COLOR: Record<string, string> = {
  Active: "green",
  Cancelled: "default",
};

const STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "Cancelled", label: "Cancelled" },
];

interface SupplierLookup {
  partyCode: string;
  partyName: string;
}

interface FilterState {
  supplierCode: string;
  supplierName: string;
  poNumber: string;
  status?: string;
  fromDate: Dayjs | null;
  toDate: Dayjs | null;
}

const EMPTY_FILTERS: FilterState = {
  supplierCode: "",
  supplierName: "",
  poNumber: "",
  status: undefined,
  fromDate: null,
  toDate: null,
};

export function PurchaseInvoiceListPage() {
  const navigate = useNavigate();
  const { data = [], isPending } = usePurchaseInvoicesQuery();
  const { data: parties = [] } = usePartiesQuery();
  const deleteMutation = useDeletePurchaseInvoiceMutation();
  const cancelMutation = useCancelPurchaseInvoiceMutation();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const [draftFilters, setDraftFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(EMPTY_FILTERS);

  const supplierMap = useMemo(() => {
    const map = new Map<number, SupplierLookup>();
    for (const p of parties as any[]) map.set(p.id, { partyCode: p.partyCode, partyName: p.partyName });
    return map;
  }, [parties]);

  // Note: the invoice payload only carries the PO's numeric id, not its
  // po_number string - the PO No. column/filter below works against that id
  // directly (good enough for a quick filter; a resolved PO No. would need
  // fetching the PO list too, same join pattern as the supplier lookup).
  const filtered = useMemo(() => {
    return data.filter((inv) => {
      const supplier = supplierMap.get(inv.supplier);
      const supplierCode = supplier?.partyCode ?? "";
      const supplierName = supplier?.partyName ?? "";

      if (
        quickSearch &&
        !inv.invoiceNumber.toLowerCase().includes(quickSearch.toLowerCase()) &&
        !inv.supplierInvoiceNo.toLowerCase().includes(quickSearch.toLowerCase()) &&
        !supplierCode.toLowerCase().includes(quickSearch.toLowerCase()) &&
        !supplierName.toLowerCase().includes(quickSearch.toLowerCase())
      ) {
        return false;
      }
      if (appliedFilters.supplierCode && !supplierCode.toLowerCase().includes(appliedFilters.supplierCode.toLowerCase())) return false;
      if (appliedFilters.supplierName && !supplierName.toLowerCase().includes(appliedFilters.supplierName.toLowerCase())) return false;
      if (appliedFilters.poNumber && !(inv.poNumber ?? "").toLowerCase().includes(appliedFilters.poNumber.toLowerCase())) return false;
      if (appliedFilters.status && inv.status !== appliedFilters.status) return false;
      if (appliedFilters.fromDate && dayjs(inv.invoiceDate).isBefore(appliedFilters.fromDate, "day")) return false;
      if (appliedFilters.toDate && dayjs(inv.invoiceDate).isAfter(appliedFilters.toDate, "day")) return false;
      return true;
    });
  }, [data, supplierMap, quickSearch, appliedFilters]);

  function handleSearch() {
    setAppliedFilters(draftFilters);
  }
  function handleShowAll() {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setQuickSearch("");
  }

  function getRowMenu(record: PurchaseInvoice): MenuProps["items"] {
    const items: MenuProps["items"] = [
      { key: "view", label: "View", onClick: () => navigate(`/purchase/invoice/${record.id}/view`) },
    ];
    if (record.status === "Active") {
      items.push({ key: "modify", label: "Modify", onClick: () => navigate(`/purchase/invoice/${record.id}`) });
      items.push({ type: "divider" });
      items.push({
        key: "cancel",
        label: "Cancel",
        danger: true,
        onClick: () =>
          Modal.confirm({
            title: "Cancel this Purchase Invoice?",
            content: "This reverses the quantity it consumed on the source PO, but keeps the record for audit.",
            onOk: () => cancelMutation.mutate(record.id),
          }),
      });
      items.push({
        key: "delete",
        label: "Delete",
        danger: true,
        onClick: () =>
          Modal.confirm({
            title: "Delete this Purchase Invoice?",
            content: "This permanently removes the record (only possible while nothing has been returned against it).",
            onOk: () => deleteMutation.mutate(record.id),
          }),
      });
    }
    return items;
  }

  const columns: ColumnsType<PurchaseInvoice> = useMemo(
    () => [
      { title: "Invoice No.", dataIndex: "invoiceNumber", sorter: (a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber) },
      { title: "Supplier Inv. No.", dataIndex: "supplierInvoiceNo" },
      {
        title: "Supplier",
        key: "supplier",
        render: (_, r) => {
          const s = supplierMap.get(r.supplier);
          return s ? `${s.partyCode} - ${s.partyName}` : r.supplier;
        },
      },
      { title: "Type", dataIndex: "invoiceType", render: (v: string) => (v === "Freight" ? "Freight" : "PO Based") },
      { title: "PO No.", key: "poNumber", render: (_, r) => r.poNumber ?? "—" },
      { title: "Invoice Date", dataIndex: "invoiceDate", sorter: (a, b) => a.invoiceDate.localeCompare(b.invoiceDate) },
      { title: "Net Amount", dataIndex: "netAmount", render: (v: number) => Number(v).toFixed(2) },
      {
        title: "Status",
        dataIndex: "status",
        render: (v: string) => <Tag color={STATUS_COLOR[v] ?? "default"}>{v}</Tag>,
      },
      {
        title: "",
        key: "actions",
        render: (_, record) => (
          <Dropdown menu={{ items: getRowMenu(record) }} trigger={["click"]}>
            <a onClick={(e) => e.preventDefault()}>⋮</a>
          </Dropdown>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [supplierMap]
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h2>Purchase Invoices</h2>
        <a onClick={() => navigate("/purchase/invoice/new")}>+ New Purchase Invoice</a>
      </div>

      <div style={{ border: "1px solid #E4E1DA", borderRadius: 8, padding: 16, marginBottom: 18 }}>
        <div
          style={{ cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
          onClick={() => setFiltersOpen((o) => !o)}
        >
          {filtersOpen ? <UpOutlined /> : <DownOutlined />} Search & Filter
        </div>
        {filtersOpen && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 14 }}>
              <div>
                <div style={{ fontSize: 11.5, marginBottom: 5 }}>Supplier Code</div>
                <Input value={draftFilters.supplierCode} onChange={(e) => setDraftFilters((f) => ({ ...f, supplierCode: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 11.5, marginBottom: 5 }}>Supplier Name</div>
                <Input value={draftFilters.supplierName} onChange={(e) => setDraftFilters((f) => ({ ...f, supplierName: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 11.5, marginBottom: 5 }}>PO No.</div>
                <Input value={draftFilters.poNumber} onChange={(e) => setDraftFilters((f) => ({ ...f, poNumber: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 11.5, marginBottom: 5 }}>Status</div>
                <Select
                  allowClear
                  style={{ width: "100%" }}
                  placeholder="All"
                  options={STATUS_OPTIONS}
                  value={draftFilters.status}
                  onChange={(v) => setDraftFilters((f) => ({ ...f, status: v }))}
                />
              </div>
              <div>
                <div style={{ fontSize: 11.5, marginBottom: 5 }}>From Date</div>
                <DatePicker style={{ width: "100%" }} value={draftFilters.fromDate} onChange={(d) => setDraftFilters((f) => ({ ...f, fromDate: d }))} />
              </div>
              <div>
                <div style={{ fontSize: 11.5, marginBottom: 5 }}>To Date</div>
                <DatePicker style={{ width: "100%" }} value={draftFilters.toDate} onChange={(d) => setDraftFilters((f) => ({ ...f, toDate: d }))} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <Button type="primary" onClick={handleSearch}>Search</Button>
              <Button onClick={handleShowAll}>Show All</Button>
            </div>
          </>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <Input.Search
          placeholder="Quick search (Invoice No. / Supplier Inv. No. / Supplier)..."
          value={quickSearch}
          onChange={(e) => setQuickSearch(e.target.value)}
          style={{ maxWidth: 340 }}
        />
      </div>

      <Table<PurchaseInvoice> rowKey="id" loading={isPending} dataSource={filtered} columns={columns} />
    </div>
  );
}
