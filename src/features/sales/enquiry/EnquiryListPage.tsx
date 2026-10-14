// src/features/sales/enquiry/EnquiryListPage.tsx

import { useState } from "react";
import { Dropdown, Input, Modal, Table, Tag, message } from "antd";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import { showApiErrorPopup } from "../../../lib/apiError";
import {
  DATE_RANGE_FIELDS,
  FilterPanel,
  PageHeader,
  StatusTag,
  SummaryCards,
} from "../shared/components";
import type { ListParams } from "../shared/types";
import { enquiryApi } from "./api";
import { FollowUpModal } from "./EnquiryFormPage";
import type { Enquiry, FollowUpState } from "./types";

// Follow-up colouring: overdue red, due today orange, upcoming green.
const FOLLOW_UP_TAG: Record<FollowUpState, { color: string; label: string } | null> = {
  overdue: { color: "red", label: "Overdue" },
  today: { color: "orange", label: "Today" },
  upcoming: { color: "green", label: "Upcoming" },
  none: { color: "default", label: "Not scheduled" },
  closed: null,
};

export function EnquiryListPage() {
  const navigate = useNavigate();
  const [params, setParams] = useState<ListParams>({});
  const [search, setSearch] = useState("");
  const [followUpFor, setFollowUpFor] = useState<number | null>(null);
  const { data = [], isPending } = enquiryApi.useList({ ...params, search: search || params.search });
  const { data: summary } = enquiryApi.useGet<{ pendingEnquiries: number }>("summary/");
  const deleteMutation = enquiryApi.useDelete();

  function rowMenu(record: Enquiry): MenuProps["items"] {
    const items: MenuProps["items"] = [
      { key: "view", label: "View", onClick: () => navigate(`/enquiry/${record.id}/view`) },
      { key: "edit", label: "Edit", onClick: () => navigate(`/enquiry/${record.id}`) },
    ];
    if (record.status === "Open") {
      items.push({ key: "followup", label: "Add Follow-up", onClick: () => setFollowUpFor(record.id) });
      items.push({
        key: "quote",
        label: "Create Quotation",
        onClick: () => navigate(`/sales/quotation/new?enquiry=${record.id}`),
      });
    }
    items.push({ type: "divider" });
    items.push({
      key: "delete",
      label: "Delete",
      danger: true,
      onClick: () =>
        Modal.confirm({
          title: `Delete enquiry ${record.enquiryNumber}?`,
          content: "This action cannot be undone.",
          okButtonProps: { danger: true },
          onOk: () =>
            deleteMutation.mutateAsync(record.id).then(
              () => message.success("Deleted"),
              (e) => showApiErrorPopup("Could not delete the Enquiry", e)
            ),
        }),
    });
    return items;
  }

  const columns: ColumnsType<Enquiry> = [
    {
      title: "Enquiry No.",
      dataIndex: "enquiryNumber",
      render: (v: string, r) => <a onClick={() => navigate(`/enquiry/${r.id}/view`)}>{v}</a>,
    },
    { title: "Date", dataIndex: "enquiryDate" },
    { title: "Customer / Prospect", dataIndex: "customerName" },
    { title: "Area", dataIndex: "area", render: (v: string) => v || "-" },
    { title: "Mode", dataIndex: "enquiryMode", render: (v: string) => v || "-" },
    { title: "Contact", key: "contact", render: (_, r) => [r.contactPerson, r.contactNumber].filter(Boolean).join(" / ") || "-" },
    {
      title: "Next Follow-up",
      key: "follow",
      render: (_, r) => {
        const tag = FOLLOW_UP_TAG[r.followUpState];
        if (!tag) return "-";
        return (
          <span>
            {r.nextFollowUpDate ?? ""} {r.nextFollowUpTime ? r.nextFollowUpTime.slice(0, 5) : ""}{" "}
            <Tag color={tag.color}>{tag.label}</Tag>
          </span>
        );
      },
    },
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
      <PageHeader title="Enquiry" action={<a onClick={() => navigate("/enquiry/new")}>+ New Enquiry</a>} />
      <SummaryCards cards={[{ label: "Pending Enquiries", value: summary?.pendingEnquiries }]} />
      <FilterPanel
        onApply={setParams}
        fields={[
          { name: "search", label: "Enquiry No. / Customer" },
          { name: "area", label: "Area" },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "Open", label: "Open" },
              { value: "Closed", label: "Closed" },
            ],
          },
          ...DATE_RANGE_FIELDS,
        ]}
      />
      <Input.Search
        placeholder="Quick search (Enquiry No. / Customer / Area)..."
        allowClear
        onSearch={setSearch}
        style={{ maxWidth: 320, marginBottom: 14 }}
      />
      <Table<Enquiry> rowKey="id" loading={isPending} dataSource={data} columns={columns} />
      {followUpFor !== null && <FollowUpModal enquiryId={followUpFor} open onClose={() => setFollowUpFor(null)} />}
    </div>
  );
}
