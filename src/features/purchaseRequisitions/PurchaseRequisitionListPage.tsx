// src/features/purchaseRequisitions/PurchaseRequisitionListPage.tsx

import { useMemo, useState } from "react";
import { Button, DatePicker, Dropdown, Input, Modal, Select, Table, Tag } from "antd";
import { DownOutlined, UpOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";
import { usePurchaseRequisitionsQuery, useDeletePurchaseRequisitionMutation } from "./api";
import { useApprovalDecisionMutation, type ApprovalDecision } from "../../lib/approvals/useApprovalDecision";
import { ApprovalDecisionModal } from "../../lib/approvals/ApprovalDecisionModal";
import { showApiErrorPopup } from "../../lib/apiError";
import { usePartiesQuery } from "../parties/api"; // adjust to actual export name
import type { PurchaseRequisition } from "./types";

const KEY = ["purchase-requisitions"] as const;

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

// one-line: PR only stores the supplier's Party id - Code/Name search needs a
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

export function PurchaseRequisitionListPage() {
  const navigate = useNavigate();
  const { data = [], isPending } = usePurchaseRequisitionsQuery();
  const { data: parties = [] } = usePartiesQuery();
  const deleteMutation = useDeletePurchaseRequisitionMutation();
  const decisionMutation = useApprovalDecisionMutation("/purchase-requisitions", KEY);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  // one-line: draft holds what's typed in the panel; appliedFilters is what
  // actually filters the table - kept separate so typing doesn't filter
  // live, only clicking Search does (same pattern as PartySearchListPage).
  const [draftFilters, setDraftFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(EMPTY_FILTERS);

  const [decisionModal, setDecisionModal] = useState<{ pr: PurchaseRequisition; decision: ApprovalDecision } | null>(null);

  const supplierMap = useMemo(() => {
    const map = new Map<number, SupplierLookup>();
    for (const p of parties as any[]) {
      map.set(p.id, { partyCode: p.partyCode, partyName: p.partyName });
    }
    return map;
  }, [parties]);

  const filtered = useMemo(() => {
    return data.filter((pr) => {
      const supplier = pr.supplier != null ? supplierMap.get(pr.supplier) : undefined;
      const supplierCode = supplier?.partyCode ?? "";
      const supplierName = supplier?.partyName ?? "";

      if (
        quickSearch &&
        !pr.prNumber.toLowerCase().includes(quickSearch.toLowerCase()) &&
        !supplierCode.toLowerCase().includes(quickSearch.toLowerCase()) &&
        !supplierName.toLowerCase().includes(quickSearch.toLowerCase())
      ) {
        return false;
      }
      if (appliedFilters.supplierCode && !supplierCode.toLowerCase().includes(appliedFilters.supplierCode.toLowerCase())) return false;
      if (appliedFilters.supplierName && !supplierName.toLowerCase().includes(appliedFilters.supplierName.toLowerCase())) return false;
      if (appliedFilters.status && pr.status !== appliedFilters.status) return false;
      if (appliedFilters.fromDate && dayjs(pr.prDate).isBefore(appliedFilters.fromDate, "day")) return false;
      if (appliedFilters.toDate && dayjs(pr.prDate).isAfter(appliedFilters.toDate, "day")) return false;
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

  function requestDecision(pr: PurchaseRequisition, decision: ApprovalDecision) {
    setDecisionModal({ pr, decision });
  }

  function getRowMenu(record: PurchaseRequisition): MenuProps["items"] {
    const items: MenuProps["items"] = [
      { key: "view", label: "View", onClick: () => navigate(`/purchase/requisition/${record.id}/view`) },
    ];
    if (record.status === "Pending") {
      items.push({ key: "modify", label: "Modify", onClick: () => navigate(`/purchase/requisition/${record.id}`) });
      items.push({ type: "divider" });
      items.push({ key: "approve", label: "Approve", onClick: () => requestDecision(record, "Approved") });
      items.push({ key: "reject", label: "Reject", onClick: () => requestDecision(record, "Rejected") });
      items.push({ key: "hold", label: "Hold", onClick: () => requestDecision(record, "Hold") });
      items.push({ type: "divider" });
      items.push({
        key: "delete",
        label: "Delete",
        danger: true,
        onClick: () =>
          Modal.confirm({
            title: "Delete this Purchase Requisition?",
            onOk: () => deleteMutation.mutate(record.id),
          }),
      });
    }
    if (record.status === "Hold") {
      items.push({ key: "release", label: "Release to Pending", onClick: () => requestDecision(record, "Pending") });
    }
    return items;
  }

  const columns: ColumnsType<PurchaseRequisition> = useMemo(
    () => [
      { title: "PR No.", dataIndex: "prNumber", sorter: (a, b) => a.prNumber.localeCompare(b.prNumber) },
      { title: "PR Type", dataIndex: "prType", render: (v: string) => (v === "General" ? "General" : "Item based") },
      {
        title: "Supplier",
        key: "supplier",
        render: (_, r) => {
          if (r.supplier == null) return "—";
          const s = supplierMap.get(r.supplier);
          return s ? `${s.partyCode} - ${s.partyName}` : r.supplier;
        },
      },
      { title: "PR Date", dataIndex: "prDate", sorter: (a, b) => a.prDate.localeCompare(b.prDate) },
      { title: "Raised By", dataIndex: "raisedBy" },
      { title: "Approved By", dataIndex: "approvedBy", render: (v: string) => v || "—" },
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
        <h2>Purchase Requisitions</h2>
        <a onClick={() => navigate("/purchase/requisition/new")}>+ New Purchase Requisition</a>
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
              <div />
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
          placeholder="Quick search (PR No. / Supplier)..."
          value={quickSearch}
          onChange={(e) => setQuickSearch(e.target.value)}
          style={{ maxWidth: 300 }}
        />
      </div>

      <Table<PurchaseRequisition> rowKey="id" loading={isPending} dataSource={filtered} columns={columns} />

      <ApprovalDecisionModal
        decision={decisionModal?.decision ?? null}
        subject={decisionModal ? `PR ${decisionModal.pr.prNumber}` : ""}
        loading={decisionMutation.isPending}
        onCancel={() => setDecisionModal(null)}
        onSubmit={(details) => {
          if (!decisionModal) return;
          decisionMutation.mutate(
            { id: decisionModal.pr.id, decision: decisionModal.decision, ...details },
            {
              onSuccess: () => setDecisionModal(null),
              onError: (error) => showApiErrorPopup("Could not update this PR", error),
            }
          );
        }}
      />
    </div>
  );
}
