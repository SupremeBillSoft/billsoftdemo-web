// src/lib/approvals/ApprovalDecisionModal.tsx
//
// The one Approve / Reject / Hold / Release dialog for PR and PO. Both
// "Approved by" and a reason are required before the decision is sent
// (BRD 6.5.1.2 / 6.5.2.2 - "User should provide below details before
// Approve/Reject/Hold").

import { useEffect, useState, type ReactNode } from "react";
import { Form, Input, Modal } from "antd";
import type { ApprovalDecision, DecisionDetails } from "./useApprovalDecision";

const ACTION_LABEL: Record<ApprovalDecision, string> = {
  Approved: "Approve",
  Rejected: "Reject",
  Hold: "Hold",
  Pending: "Release to Pending",
};

const BY_LABEL: Record<ApprovalDecision, string> = {
  Approved: "Approved By",
  Rejected: "Rejected By",
  Hold: "Held By",
  Pending: "Released By",
};

export function decisionActionLabel(decision: ApprovalDecision): string {
  return ACTION_LABEL[decision];
}

export function ApprovalDecisionModal({
  decision,
  subject,
  loading,
  onCancel,
  onSubmit,
  children,
}: {
  decision: ApprovalDecision | null; // null = closed
  subject: string; // e.g. "Purchase Requisition PR-0004" or "3 Purchase Orders"
  loading: boolean;
  onCancel: () => void;
  onSubmit: (details: DecisionDetails) => void;
  children?: ReactNode;
}) {
  const [approvedBy, setApprovedBy] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (decision) setReason("");
  }, [decision]);

  const ready = approvedBy.trim() !== "" && reason.trim() !== "";

  return (
    <Modal
      title={decision ? `${ACTION_LABEL[decision]} ${subject}` : ""}
      open={!!decision}
      okText={decision ? ACTION_LABEL[decision] : "OK"}
      okButtonProps={{ danger: decision === "Rejected", disabled: !ready }}
      onCancel={onCancel}
      onOk={() => onSubmit({ approvedBy: approvedBy.trim(), reason: reason.trim() })}
      confirmLoading={loading}
      destroyOnHidden
    >
      {children}
      {decision && (
        <Form layout="vertical">
          <Form.Item label={BY_LABEL[decision]} required>
            {/* TODO (login): fill from the logged-in user instead of typing. */}
            <Input value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} />
          </Form.Item>
          <Form.Item label="Reason" required>
            <Input.TextArea value={reason} onChange={(e) => setReason(e.target.value)} />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}
