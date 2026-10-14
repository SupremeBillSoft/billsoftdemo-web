// src/features/purchaseOrders/PurchaseOrderListPage.tsx

import { useMemo, useState } from "react";
import { Button, DatePicker, Dropdown, Input, Modal, Select, Table, Tag } from "antd";
import { DownOutlined, UpOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";
import { PO_KEY, usePurchaseOrdersQuery, useDeletePurchaseOrderMutation } from "./api";
import {
  useApprovalDecisionMutation,
  useBulkApprovalDecisionMutation,
  type ApprovalDecision,
  type DecisionDetails,
} from "../../lib/approvals/useApprovalDecision";
import { ApprovalDecisionModal } from "../../lib/approvals/ApprovalDecisionModal";
import { showApiErrorPopup } from "../../lib/apiError";
import { usePartiesQuery } from "../parties/api"; // adjust to actual export name
import type { PurchaseOrder } from "./types";

const STATUS_COLOR: Record<string, string> = {
  Pending: "gold",
  Approved: "green",
  Rejected: "red",
  Hold: "default",
};

const STATUS_OPTIONS = [
  { value: "Pending", label: "Pending" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
  { value: "Hold", label: "Hold" },
];

const TAX_TYPE_OPTIONS = [
  { value: "Intra-State", label: "Intra-State (CGST+SGST)" },
  { value: "Inter-State", label: "Inter-State (IGST)" },
];

// one-line: PO only stores the supplier's Party id - Code/Name search needs a
// join against the parties list, same as the PO form page already does for
// its own supplier dropdown.
interface SupplierLookup {
  partyCode: string;
  partyName: string;
}

interface FilterState {
  supplierCode: string;
  supplierName: string;
  status?: string;
  taxType?: string;
  fromDate: Dayjs | null;
  toDate: Dayjs | null;
}

const EMPTY_FILTERS: FilterState = {
  supplierCode: "",
  supplierName: "",
  status: undefined,
  taxType: undefined,
  fromDate: null,
  toDate: null,
};

// one-line: PO has no single "tax type" field - it's derived per-document
// from whichever tax columns the line items actually carry (IGST vs
// CGST/SGST), same split logic the GST engine itself uses.
function getTaxType(po: PurchaseOrder): "Intra-State" | "Inter-State" | null {
  const igst = po.items.reduce((sum, i) => sum + (i.igst ?? 0), 0);
  const cgstSgst = po.items.reduce((sum, i) => sum + (i.cgst ?? 0) + (i.sgst ?? 0), 0);
  if (igst > 0) return "Inter-State";
  if (cgstSgst > 0) return "Intra-State";
  return null;
}

export function PurchaseOrderListPage() {
  const navigate = useNavigate();
  const { data = [], isPending } = usePurchaseOrdersQuery();
  const { data: parties = [] } = usePartiesQuery();
  const deleteMutation = useDeletePurchaseOrderMutation();
  const decisionMutation = useApprovalDecisionMutation("/purchase-orders", PO_KEY);
  const bulkDecisionMutation = useBulkApprovalDecisionMutation("/purchase-orders", PO_KEY);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const [draftFilters, setDraftFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(EMPTY_FILTERS);

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [decisionModal, setDecisionModal] = useState<{ ids: number[]; decision: ApprovalDecision } | null>(null);

  const supplierMap = useMemo(() => {
    const map = new Map<number, SupplierLookup>();
    for (const p of parties as any[]) {
      map.set(p.id, { partyCode: p.partyCode, partyName: p.partyName });
    }
    return map;
  }, [parties]);

  const filtered = useMemo(() => {
    return data.filter((po) => {
      const supplier = supplierMap.get(po.supplier);
      const supplierCode = supplier?.partyCode ?? "";
      const supplierName = supplier?.partyName ?? "";

      if (
        quickSearch &&
        !po.poNumber.toLowerCase().includes(quickSearch.toLowerCase()) &&
        !supplierCode.toLowerCase().includes(quickSearch.toLowerCase()) &&
        !supplierName.toLowerCase().includes(quickSearch.toLowerCase())
      ) {
        return false;
      }
      if (appliedFilters.supplierCode && !supplierCode.toLowerCase().includes(appliedFilters.supplierCode.toLowerCase())) return false;
      if (appliedFilters.supplierName && !supplierName.toLowerCase().includes(appliedFilters.supplierName.toLowerCase())) return false;
      if (appliedFilters.status && po.status !== appliedFilters.status) return false;
      if (appliedFilters.taxType && getTaxType(po) !== appliedFilters.taxType) return false;
      if (appliedFilters.fromDate && dayjs(po.poDate).isBefore(appliedFilters.fromDate, "day")) return false;
      if (appliedFilters.toDate && dayjs(po.poDate).isAfter(appliedFilters.toDate, "day")) return false;
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

  // Every decision (bulk too) asks for "Approved by" + a reason first.
  function requestDecision(ids: number[], decision: ApprovalDecision) {
    setDecisionModal({ ids, decision });
  }

  function confirmDecision(details: DecisionDetails) {
    if (!decisionModal) return;
    const { ids, decision } = decisionModal;
    const callbacks = {
      onSuccess: () => {
        setDecisionModal(null);
        setSelectedRowKeys([]);
      },
      onError: (error: unknown) => showApiErrorPopup("Could not update the Purchase Order", error),
    };
    if (ids.length === 1) decisionMutation.mutate({ id: ids[0], decision, ...details }, callbacks);
    else bulkDecisionMutation.mutate({ ids, decision, ...details }, callbacks);
  }

  function getRowMenu(record: PurchaseOrder): MenuProps["items"] {
    const items: MenuProps["items"] = [
      { key: "view", label: "View", onClick: () => navigate(`/purchase/order/${record.id}/view`) },
    ];
    if (record.status === "Pending") {
      items.push({ key: "modify", label: "Modify", onClick: () => navigate(`/purchase/order/${record.id}`) });
      items.push({ type: "divider" });
      items.push({ key: "approve", label: "Approve", onClick: () => requestDecision([record.id], "Approved") });
      items.push({ key: "reject", label: "Reject", onClick: () => requestDecision([record.id], "Rejected") });
      items.push({ key: "hold", label: "Hold", onClick: () => requestDecision([record.id], "Hold") });
      items.push({ type: "divider" });
      items.push({
        key: "delete",
        label: "Delete",
        danger: true,
        onClick: () => Modal.confirm({ title: "Delete this Purchase Order?", onOk: () => deleteMutation.mutate(record.id) }),
      });
    }
    if (record.status === "Hold") {
      items.push({ key: "release", label: "Release to Pending", onClick: () => requestDecision([record.id], "Pending") });
    }
    return items;
  }

  const columns: ColumnsType<PurchaseOrder> = useMemo(
    () => [
      { title: "PO No.", dataIndex: "poNumber", sorter: (a, b) => a.poNumber.localeCompare(b.poNumber) },
      { title: "PR No.", key: "prNo", render: (_, r) => (r.prNumbers.length ? r.prNumbers.join(", ") : "-") },
      {
        title: "Supplier",
        key: "supplier",
        render: (_, r) => {
          const s = supplierMap.get(r.supplier);
          return s ? `${s.partyCode} - ${s.partyName}` : r.supplier;
        },
      },
      { title: "PO Date", dataIndex: "poDate", sorter: (a, b) => a.poDate.localeCompare(b.poDate) },
      {
        title: "Tax Type",
        key: "taxType",
        render: (_, r) => getTaxType(r) ?? "—",
      },
      { title: "Raised By", dataIndex: "raisedBy", render: (v: string) => v || "—" },
      { title: "Approved By", dataIndex: "approvedBy", render: (v: string) => v || "—" },
      { title: "Net Amount", dataIndex: "netAmount", render: (v: string | number) => Number(v).toFixed(2) },
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

  const selectedPendingIds = filtered
    .filter((po) => selectedRowKeys.includes(po.id) && po.status === "Pending")
    .map((po) => po.id);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h2>Purchase Orders</h2>
        <a onClick={() => navigate("/purchase/order/new")}>+ New Purchase Order</a>
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
                <Input
                  value={draftFilters.supplierCode}
                  onChange={(e) => setDraftFilters((f) => ({ ...f, supplierCode: e.target.value }))}
                />
              </div>
              <div>
                <div style={{ fontSize: 11.5, marginBottom: 5 }}>Supplier Name</div>
                <Input
                  value={draftFilters.supplierName}
                  onChange={(e) => setDraftFilters((f) => ({ ...f, supplierName: e.target.value }))}
                />
              </div>
              <div>
                <div style={{ fontSize: 11.5, marginBottom: 5 }}>Approval Status</div>
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
                <div style={{ fontSize: 11.5, marginBottom: 5 }}>Tax Type</div>
                <Select
                  allowClear
                  style={{ width: "100%" }}
                  placeholder="All"
                  options={TAX_TYPE_OPTIONS}
                  value={draftFilters.taxType}
                  onChange={(v) => setDraftFilters((f) => ({ ...f, taxType: v }))}
                />
              </div>
              <div>
                <div style={{ fontSize: 11.5, marginBottom: 5 }}>From Date</div>
                <DatePicker
                  style={{ width: "100%" }}
                  value={draftFilters.fromDate}
                  onChange={(d) => setDraftFilters((f) => ({ ...f, fromDate: d }))}
                />
              </div>
              <div>
                <div style={{ fontSize: 11.5, marginBottom: 5 }}>To Date</div>
                <DatePicker
                  style={{ width: "100%" }}
                  value={draftFilters.toDate}
                  onChange={(d) => setDraftFilters((f) => ({ ...f, toDate: d }))}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <Button type="primary" onClick={handleSearch}>
                Search
              </Button>
              <Button onClick={handleShowAll}>Show All</Button>
            </div>
          </>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <Input.Search
          placeholder="Quick search (PO No. / Supplier)..."
          value={quickSearch}
          onChange={(e) => setQuickSearch(e.target.value)}
          style={{ maxWidth: 300 }}
        />
        {selectedPendingIds.length > 0 && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span>{selectedPendingIds.length} selected —</span>
            <Button size="small" onClick={() => requestDecision(selectedPendingIds, "Approved")}>
              Bulk Approve
            </Button>
            <Button size="small" onClick={() => requestDecision(selectedPendingIds, "Rejected")}>
              Bulk Reject
            </Button>
          </div>
        )}
      </div>

      <Table<PurchaseOrder>
        rowKey="id"
        loading={isPending}
        dataSource={filtered}
        columns={columns}
        rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
      />

      <ApprovalDecisionModal
        decision={decisionModal?.decision ?? null}
        subject={decisionModal ? `${decisionModal.ids.length} Purchase Order(s)` : ""}
        loading={decisionMutation.isPending || bulkDecisionMutation.isPending}
        onCancel={() => setDecisionModal(null)}
        onSubmit={confirmDecision}
      />
    </div>
  );
}
