// src/features/purchaseReturns/PurchaseReturnListPage.tsx

import { useMemo, useState } from "react";
import { Button, DatePicker, Dropdown, Input, Modal, Select, Table, Tag } from "antd";
import { DownOutlined, UpOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";
import { usePurchaseReturnsQuery, useDeletePurchaseReturnMutation } from "./api";
import { REFUND_STATUS_COLOR, REFUND_STATUS_OPTIONS } from "./refundStatus";
import { usePartiesQuery } from "../parties/api"; // adjust to actual export name
import type { PurchaseReturn } from "./types";

interface SupplierLookup {
  partyCode: string;
  partyName: string;
}

interface FilterState {
  supplierCode: string;
  supplierName: string;
  status?: string;
  fromDate: Dayjs | null;
  toDate: Dayjs | null;
}

const EMPTY_FILTERS: FilterState = {
  supplierCode: "",
  supplierName: "",
  status: undefined,
  fromDate: null,
  toDate: null,
};

export function PurchaseReturnListPage() {
  const navigate = useNavigate();
  const { data = [], isPending } = usePurchaseReturnsQuery();
  const { data: parties = [] } = usePartiesQuery();
  const deleteMutation = useDeletePurchaseReturnMutation();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const [draftFilters, setDraftFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(EMPTY_FILTERS);

  const supplierMap = useMemo(() => {
    const map = new Map<number, SupplierLookup>();
    for (const p of parties as any[]) map.set(p.id, { partyCode: p.partyCode, partyName: p.partyName });
    return map;
  }, [parties]);

  const filtered = useMemo(() => {
    return data.filter((ret) => {
      const supplier = supplierMap.get(ret.supplier);
      const supplierCode = supplier?.partyCode ?? "";
      const supplierName = supplier?.partyName ?? "";

      if (
        quickSearch &&
        !ret.returnNumber.toLowerCase().includes(quickSearch.toLowerCase()) &&
        !supplierCode.toLowerCase().includes(quickSearch.toLowerCase()) &&
        !supplierName.toLowerCase().includes(quickSearch.toLowerCase())
      ) {
        return false;
      }
      if (appliedFilters.supplierCode && !supplierCode.toLowerCase().includes(appliedFilters.supplierCode.toLowerCase())) return false;
      if (appliedFilters.supplierName && !supplierName.toLowerCase().includes(appliedFilters.supplierName.toLowerCase())) return false;
      if (appliedFilters.status && ret.status !== appliedFilters.status) return false;
      if (appliedFilters.fromDate && dayjs(ret.returnDate).isBefore(appliedFilters.fromDate, "day")) return false;
      if (appliedFilters.toDate && dayjs(ret.returnDate).isAfter(appliedFilters.toDate, "day")) return false;
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

  // BRD 6.5.4 row actions: no approval step - Modify (e.g. to record a
  // refund) and Delete are always available.
  function getRowMenu(record: PurchaseReturn): MenuProps["items"] {
    return [
      { key: "view", label: "View", onClick: () => navigate(`/purchase/return/${record.id}/view`) },
      { key: "modify", label: "Modify", onClick: () => navigate(`/purchase/return/${record.id}`) },
      { type: "divider" },
      {
        key: "delete",
        label: "Delete",
        danger: true,
        onClick: () => Modal.confirm({ title: "Delete this Purchase Return?", onOk: () => deleteMutation.mutate(record.id) }),
      },
    ];
  }

  const columns: ColumnsType<PurchaseReturn> = useMemo(
    () => [
      { title: "Return No.", dataIndex: "returnNumber", sorter: (a, b) => a.returnNumber.localeCompare(b.returnNumber) },
      { title: "Invoice No.", dataIndex: "invoiceNumber" },
      {
        title: "Supplier",
        key: "supplier",
        render: (_, r) => {
          const s = supplierMap.get(r.supplier);
          return s ? `${s.partyCode} - ${s.partyName}` : r.supplier;
        },
      },
      { title: "Return Date", dataIndex: "returnDate", sorter: (a, b) => a.returnDate.localeCompare(b.returnDate) },
      { title: "Reason", dataIndex: "reason" },
      { title: "Net Amount", dataIndex: "netAmount", render: (v: number) => Number(v).toFixed(2) },
      { title: "Refunded", dataIndex: "amountRefunded", render: (v: number) => Number(v).toFixed(2) },
      { title: "Balance", dataIndex: "balanceAmount", render: (v: number) => Number(v).toFixed(2) },
      {
        title: "Status",
        dataIndex: "status",
        render: (v: string) => <Tag color={REFUND_STATUS_COLOR[v] ?? "default"}>{v}</Tag>,
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
        <h2>Purchase Returns</h2>
        <a onClick={() => navigate("/purchase/return/new")}>+ New Purchase Return</a>
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
                <div style={{ fontSize: 11.5, marginBottom: 5 }}>Status</div>
                <Select
                  allowClear
                  style={{ width: "100%" }}
                  placeholder="All"
                  options={REFUND_STATUS_OPTIONS}
                  value={draftFilters.status}
                  onChange={(v) => setDraftFilters((f) => ({ ...f, status: v }))}
                />
              </div>
              <div />
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
          placeholder="Quick search (Return No. / Supplier)..."
          value={quickSearch}
          onChange={(e) => setQuickSearch(e.target.value)}
          style={{ maxWidth: 300 }}
        />
      </div>

      <Table<PurchaseReturn> rowKey="id" loading={isPending} dataSource={filtered} columns={columns} />
    </div>
  );
}
