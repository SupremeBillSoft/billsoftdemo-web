// src/features/purchaseRequisitions/PurchaseRequisitionApprovalPage.tsx
//
// The "PR Approval" sidebar page: only PRs still awaiting a decision, with
// the same three-dots row menu the PR list has. Reuses the exact same
// pieces as PurchaseRequisitionListPage (useApprovalDecisionMutation ->
// POST /purchase-requisitions/{id}/decision/ -> approvals.record_decision),
// so approving here and approving from the list can never behave
// differently - this page only changes WHICH rows are shown and routes
// every decision through a confirmation modal.

import { useMemo, useState } from "react";
import { Descriptions, Dropdown, Input, Table, Tag, message } from "antd";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import { usePendingPurchaseRequisitionsQuery } from "./api";
import { useApprovalDecisionMutation, type ApprovalDecision } from "../../lib/approvals/useApprovalDecision";
import { ApprovalDecisionModal, decisionActionLabel } from "../../lib/approvals/ApprovalDecisionModal";
import { showApiErrorPopup } from "../../lib/apiError";
import { usePartiesQuery } from "../parties/api"; // adjust to actual export name
import type { PurchaseRequisition } from "./types";

// Same key the list page / api.ts use - invalidating it refreshes the
// pending list below too (its key is nested under this one).
const KEY = ["purchase-requisitions"] as const;

export function PurchaseRequisitionApprovalPage() {
  const navigate = useNavigate();
  const { data = [], isPending } = usePendingPurchaseRequisitionsQuery();
  const { data: parties = [] } = usePartiesQuery();
  const decisionMutation = useApprovalDecisionMutation("/purchase-requisitions", KEY);

  const [quickSearch, setQuickSearch] = useState("");
  const [decisionModal, setDecisionModal] = useState<{ pr: PurchaseRequisition; decision: ApprovalDecision } | null>(null);

  const supplierMap = useMemo(() => {
    const map = new Map<number, { partyCode: string; partyName: string }>();
    for (const p of parties as any[]) map.set(p.id, { partyCode: p.partyCode, partyName: p.partyName });
    return map;
  }, [parties]);

  const supplierLabel = (supplierId: number | null) => {
    if (supplierId == null) return "—";
    const s = supplierMap.get(supplierId);
    return s ? `${s.partyCode} - ${s.partyName}` : String(supplierId);
  };

  const filtered = useMemo(() => {
    const q = quickSearch.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (pr) =>
        pr.prNumber.toLowerCase().includes(q) ||
        supplierLabel(pr.supplier).toLowerCase().includes(q) ||
        (pr.raisedBy ?? "").toLowerCase().includes(q)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, quickSearch, supplierMap]);

  function openDecision(pr: PurchaseRequisition, decision: ApprovalDecision) {
    setDecisionModal({ pr, decision });
  }

  function submitDecision(details: { approvedBy: string; reason: string }) {
    if (!decisionModal) return;
    const { pr, decision } = decisionModal;
    decisionMutation.mutate(
      { id: pr.id, decision, ...details },
      {
        onSuccess: () => {
          setDecisionModal(null);
          message.success(`${pr.prNumber}: ${decisionActionLabel(decision)} done`);
        },
        // Surface the backend's own message (e.g. "Only a Pending document
        // can be approved...") instead of failing silently.
        onError: (error) => showApiErrorPopup("Could not update this PR", error),
      }
    );
  }

  function getRowMenu(record: PurchaseRequisition): MenuProps["items"] {
    return [
      { key: "view", label: "View", onClick: () => navigate(`/purchase/requisition/${record.id}/view`) },
      { type: "divider" },
      { key: "approve", label: "Approve", onClick: () => openDecision(record, "Approved") },
      { key: "reject", label: "Reject", onClick: () => openDecision(record, "Rejected") },
      { key: "hold", label: "Hold", onClick: () => openDecision(record, "Hold") },
    ];
  }

  const columns: ColumnsType<PurchaseRequisition> = [
    { title: "PR No.", dataIndex: "prNumber", sorter: (a, b) => a.prNumber.localeCompare(b.prNumber) },
    { title: "Supplier", key: "supplier", render: (_, r) => supplierLabel(r.supplier) },
    { title: "PR Date", dataIndex: "prDate", sorter: (a, b) => a.prDate.localeCompare(b.prDate) },
    { title: "Raised By", dataIndex: "raisedBy" },
    { title: "Status", dataIndex: "status", render: (v: string) => <Tag color="gold">{v}</Tag> },
    {
      title: "",
      key: "actions",
      render: (_, record) => (
        <Dropdown menu={{ items: getRowMenu(record) }} trigger={["click"]}>
          <a onClick={(e) => e.preventDefault()}>⋮</a>
        </Dropdown>
      ),
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>PR Approval</h2>

      <div style={{ marginBottom: 14 }}>
        <Input.Search
          placeholder="Quick search (PR No. / Supplier / Raised By)..."
          value={quickSearch}
          onChange={(e) => setQuickSearch(e.target.value)}
          style={{ maxWidth: 340 }}
        />
      </div>

      <Table<PurchaseRequisition>
        rowKey="id"
        loading={isPending}
        dataSource={filtered}
        columns={columns}
        locale={{ emptyText: "No Purchase Requisitions awaiting approval" }}
      />

      <ApprovalDecisionModal
        decision={decisionModal?.decision ?? null}
        subject="Purchase Requisition"
        loading={decisionMutation.isPending}
        onCancel={() => setDecisionModal(null)}
        onSubmit={submitDecision}
      >
        {decisionModal && (
          <Descriptions column={1} size="small" style={{ marginBottom: 12 }}>
            <Descriptions.Item label="PR No.">{decisionModal.pr.prNumber}</Descriptions.Item>
            <Descriptions.Item label="Supplier">{supplierLabel(decisionModal.pr.supplier)}</Descriptions.Item>
            <Descriptions.Item label="PR Date">{decisionModal.pr.prDate}</Descriptions.Item>
            <Descriptions.Item label="Raised By">{decisionModal.pr.raisedBy}</Descriptions.Item>
          </Descriptions>
        )}
      </ApprovalDecisionModal>
    </div>
  );
}
