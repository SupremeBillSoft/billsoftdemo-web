// src/features/purchaseOrders/PurchaseOrderApprovalPage.tsx
//
// The "PO Approval" sidebar page (BRD 6.5.2.2): POs awaiting a decision,
// with Approve / Reject / Hold per row, Bulk Approve / Reject (BRD "Bulk
// Approval/Rejection option"), and Release to Pending for held POs. Every
// decision goes through the same ApprovalDecisionModal and endpoint as the
// PO list, so approving here and there can never behave differently.

import { useMemo, useState } from "react";
import { Button, Descriptions, Dropdown, Input, Segmented, Table, Tag, message } from "antd";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import { PO_KEY, usePurchaseOrdersByStatusQuery } from "./api";
import {
  useApprovalDecisionMutation,
  useBulkApprovalDecisionMutation,
  type ApprovalDecision,
  type DecisionDetails,
} from "../../lib/approvals/useApprovalDecision";
import { ApprovalDecisionModal, decisionActionLabel } from "../../lib/approvals/ApprovalDecisionModal";
import { showApiErrorPopup } from "../../lib/apiError";
import { usePartiesQuery } from "../parties/api";
import type { PurchaseOrder } from "./types";

export function PurchaseOrderApprovalPage() {
  const navigate = useNavigate();
  const [statusView, setStatusView] = useState<"Pending" | "Hold">("Pending");
  const { data = [], isPending } = usePurchaseOrdersByStatusQuery(statusView);
  const { data: parties = [] } = usePartiesQuery();
  const decisionMutation = useApprovalDecisionMutation("/purchase-orders", PO_KEY);
  const bulkDecisionMutation = useBulkApprovalDecisionMutation("/purchase-orders", PO_KEY);

  const [quickSearch, setQuickSearch] = useState("");
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [decisionModal, setDecisionModal] = useState<{ pos: PurchaseOrder[]; decision: ApprovalDecision } | null>(null);

  const supplierLabel = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of parties as any[]) map.set(p.id, `${p.partyCode} - ${p.partyName}`);
    return (id: number) => map.get(id) ?? String(id);
  }, [parties]);

  const filtered = useMemo(() => {
    const q = quickSearch.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (po) =>
        po.poNumber.toLowerCase().includes(q) ||
        supplierLabel(po.supplier).toLowerCase().includes(q) ||
        po.prNumbers.some((n) => n.toLowerCase().includes(q))
    );
  }, [data, quickSearch, supplierLabel]);

  function openDecision(pos: PurchaseOrder[], decision: ApprovalDecision) {
    setDecisionModal({ pos, decision });
  }

  function submitDecision(details: DecisionDetails) {
    if (!decisionModal) return;
    const { pos, decision } = decisionModal;
    const done = () => {
      setDecisionModal(null);
      setSelectedRowKeys([]);
      message.success(`${pos.length === 1 ? pos[0].poNumber : `${pos.length} POs`}: ${decisionActionLabel(decision)} done`);
    };
    const onError = (error: unknown) => showApiErrorPopup("Could not update the Purchase Order", error);
    if (pos.length === 1) {
      decisionMutation.mutate({ id: pos[0].id, decision, ...details }, { onSuccess: done, onError });
    } else {
      bulkDecisionMutation.mutate(
        { ids: pos.map((po) => po.id), decision, ...details },
        {
          onSuccess: (result: { succeeded: number[]; failed: { id: number; error: string }[] }) => {
            if (result.failed?.length) {
              showApiErrorPopup("Some Purchase Orders were not updated", new Error(result.failed.map((f) => f.error).join("\n")));
            }
            done();
          },
          onError,
        }
      );
    }
  }

  function getRowMenu(record: PurchaseOrder): MenuProps["items"] {
    const view = { key: "view", label: "View", onClick: () => navigate(`/purchase/order/${record.id}/view`) };
    if (record.status === "Hold") {
      return [view, { type: "divider" }, { key: "release", label: "Release to Pending", onClick: () => openDecision([record], "Pending") }];
    }
    return [
      view,
      { type: "divider" },
      { key: "approve", label: "Approve", onClick: () => openDecision([record], "Approved") },
      { key: "reject", label: "Reject", onClick: () => openDecision([record], "Rejected") },
      { key: "hold", label: "Hold", onClick: () => openDecision([record], "Hold") },
    ];
  }

  const columns: ColumnsType<PurchaseOrder> = [
    { title: "PO No.", dataIndex: "poNumber", sorter: (a, b) => a.poNumber.localeCompare(b.poNumber) },
    { title: "PO Date", dataIndex: "poDate", sorter: (a, b) => a.poDate.localeCompare(b.poDate) },
    { title: "Supplier", key: "supplier", render: (_, r) => supplierLabel(r.supplier) },
    { title: "PR No.", key: "prNo", render: (_, r) => (r.prNumbers.length ? r.prNumbers.join(", ") : "—") },
    {
      title: "Items",
      key: "items",
      render: (_, r) => r.items.map((i) => `${i.itemCode ?? i.item} × ${Number(i.orderQty)}`).join(", "),
    },
    { title: "Net Amount", dataIndex: "netAmount", render: (v: number) => Number(v).toFixed(2) },
    { title: "Raised By", dataIndex: "raisedBy", render: (v: string) => v || "—" },
    { title: "Status", dataIndex: "status", render: (v: string) => <Tag color={v === "Hold" ? "default" : "gold"}>{v}</Tag> },
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

  const selected = filtered.filter((po) => selectedRowKeys.includes(po.id));

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>PO Approval</h2>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Segmented
            value={statusView}
            onChange={(v) => {
              setStatusView(v as "Pending" | "Hold");
              setSelectedRowKeys([]);
            }}
            options={["Pending", "Hold"]}
          />
          <Input.Search
            placeholder="Quick search (PO No. / Supplier / PR No.)..."
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            style={{ width: 320 }}
          />
        </div>
        {statusView === "Pending" && selected.length > 0 && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span>{selected.length} selected —</span>
            <Button size="small" type="primary" onClick={() => openDecision(selected, "Approved")}>
              Bulk Approve
            </Button>
            <Button size="small" danger onClick={() => openDecision(selected, "Rejected")}>
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
        rowSelection={statusView === "Pending" ? { selectedRowKeys, onChange: setSelectedRowKeys } : undefined}
        locale={{ emptyText: statusView === "Pending" ? "No Purchase Orders awaiting approval" : "No Purchase Orders on hold" }}
      />

      <ApprovalDecisionModal
        decision={decisionModal?.decision ?? null}
        subject={decisionModal ? (decisionModal.pos.length === 1 ? "Purchase Order" : `${decisionModal.pos.length} Purchase Orders`) : ""}
        loading={decisionMutation.isPending || bulkDecisionMutation.isPending}
        onCancel={() => setDecisionModal(null)}
        onSubmit={submitDecision}
      >
        {decisionModal?.pos.length === 1 && (
          <Descriptions column={1} size="small" style={{ marginBottom: 12 }}>
            <Descriptions.Item label="PO No.">{decisionModal.pos[0].poNumber}</Descriptions.Item>
            <Descriptions.Item label="Supplier">{supplierLabel(decisionModal.pos[0].supplier)}</Descriptions.Item>
            <Descriptions.Item label="PR No.">{decisionModal.pos[0].prNumbers.join(", ") || "—"}</Descriptions.Item>
            <Descriptions.Item label="Net Amount">{Number(decisionModal.pos[0].netAmount).toFixed(2)}</Descriptions.Item>
          </Descriptions>
        )}
      </ApprovalDecisionModal>
    </div>
  );
}
