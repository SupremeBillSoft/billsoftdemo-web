// src/features/docNumberFormats/DocNumberFormatListPage.tsx

import { useMemo, useState } from "react";
import { Button, DatePicker, Dropdown, Modal, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { MenuProps } from "antd";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { useDeleteDocumentNumberFormatMutation, useDocumentNumberFormatsQuery, useStartNewVersionMutation } from "./api";
import type { DocumentNumberFormat } from "./types";
import { showApiErrorPopup } from "../../lib/apiError";

const BASE_PATH = "/settings/document-number-formats";

export function DocNumberFormatListPage() {
  const navigate = useNavigate();
  const { data = [], isPending } = useDocumentNumberFormatsQuery();
  const startNewVersion = useStartNewVersionMutation();
  const deleteMutation = useDeleteDocumentNumberFormatMutation();

  const [startVersionTarget, setStartVersionTarget] = useState<DocumentNumberFormat | null>(null);
  const [newFromDate, setNewFromDate] = useState<dayjs.Dayjs | null>(dayjs());

  const classification = (r: DocumentNumberFormat) =>
    [r.doc, r.docType, r.docSubType].filter(Boolean).join(" / ");

  // Modify / Delete only while the version hasn't issued a number yet; after
  // that it's history and changes go through Start New Version.
  function getRowMenu(record: DocumentNumberFormat): MenuProps["items"] {
    if (!record.isCurrentVersion) {
      return [{ key: "view", label: "View", onClick: () => navigate(`${BASE_PATH}/${record.id}/view`) }];
    }
    if (record.issuedCount === 0) {
      return [
        { key: "modify", label: "Modify", onClick: () => navigate(`${BASE_PATH}/${record.id}`) },
        {
          key: "delete",
          label: "Delete",
          danger: true,
          onClick: () =>
            Modal.confirm({
              title: `Delete the format for ${classification(record)}?`,
              okButtonProps: { danger: true },
              onOk: () =>
                deleteMutation.mutateAsync(record.id).catch((error) => showApiErrorPopup("Could not delete", error)),
            }),
        },
      ];
    }
    return [
      {
        key: "start-new-version",
        label: "Start New Version",
        onClick: () => {
          setStartVersionTarget(record);
          setNewFromDate(dayjs());
        },
      },
      { key: "view", label: "View", onClick: () => navigate(`${BASE_PATH}/${record.id}/view`) },
    ];
  }

  const columns: ColumnsType<DocumentNumberFormat> = useMemo(
    () => [
      { title: "Sl No", dataIndex: "entryNo", sorter: (a, b) => a.entryNo - b.entryNo },
      { title: "Document", dataIndex: "doc", sorter: (a, b) => a.doc.localeCompare(b.doc) },
      { title: "Doc Type", dataIndex: "docType" },
      { title: "Doc Sub Type", dataIndex: "docSubType" },
      { title: "Doc No (next)", dataIndex: "docNo" },
      { title: "Format DocNo (next)", dataIndex: "finalDocFormat" },
      { title: "From Date", dataIndex: "fromDate", render: (v: string) => dayjs(v).format("DD-MMM-YY") },
      {
        title: "To",
        dataIndex: "toDate",
        render: (v: string | null) => (v ? dayjs(v).format("DD-MMM-YY") : "-"),
      },
      {
        title: "Status",
        key: "status",
        render: (_, r) => (r.isCurrentVersion ? <Tag color="green">Current</Tag> : <Tag>Closed</Tag>),
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
    []
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h2>Document Number Formatting List</h2>
        <Button type="primary" onClick={() => navigate(`${BASE_PATH}/new`)}>
          + Add
        </Button>
      </div>
      <Table<DocumentNumberFormat>
        rowKey="id"
        loading={isPending}
        dataSource={data}
        columns={columns}
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title="Start New Format Version"
        open={!!startVersionTarget}
        onCancel={() => setStartVersionTarget(null)}
        onOk={() => {
          if (!startVersionTarget || !newFromDate) return;
          startNewVersion.mutate(
            { id: startVersionTarget.id, fromDate: newFromDate.format("YYYY-MM-DD") },
            {
              onSuccess: () => setStartVersionTarget(null),
              onError: (error) => showApiErrorPopup("Could not start a new version", error),
            }
          );
        }}
        okText="Start"
        confirmLoading={startNewVersion.isPending}
      >
        <p>
          This closes the current version of <strong>{startVersionTarget ? classification(startVersionTarget) : ""}</strong> as
          of the date below, and opens a new one starting from 1. Numbers already issued are not affected.
        </p>
        <DatePicker value={newFromDate} onChange={setNewFromDate} style={{ width: "100%" }} />
      </Modal>
    </div>
  );
}
