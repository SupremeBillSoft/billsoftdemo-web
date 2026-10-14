import { Alert, Empty, Table, Typography, theme } from "antd";
import type { TableColumnsType } from "antd";
import type { CSSProperties } from "react";

import { formatCell } from "./format";
import type { ReportRow, RunResponse } from "./types";

interface Props {
  result: RunResponse | null;
  showBusinessHeader: boolean;
  showSerialNo: boolean;
  /** Child reports: parent columns are filled only on the first row of each parent. */
  parentOnce: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
}

export function ReportPreview({
  result,
  showBusinessHeader,
  showSerialNo,
  parentOnce,
  page,
  pageSize,
  onPageChange,
}: Props) {
  const { token } = theme.useToken(); // keep above the early return (rules of hooks)

  if (!result) {
    return <Empty description="Choose a master and at least one column to see the report" />;
  }

  const { business } = result;

  const parentKeys = result.columns.filter((c) => c.group).map((c) => c.key);
  const collapse = parentOnce && parentKeys.length > 0;
  // With "once per parent" the server leaves repeat cells empty, so a row that still
  // carries a parent value is the first row of its parent: draw a heavier line above it.
  const startsParent = (row: ReportRow) => collapse && parentKeys.some((k) => row[k] !== null && row[k] !== undefined);
  const parentDivider = (row: ReportRow): { style?: CSSProperties } =>
    startsParent(row) ? { style: { borderTop: `2px solid ${token.colorBorder}` } } : {};

  const columns: TableColumnsType<ReportRow> = [
    ...(showSerialNo
      ? [
          {
            title: "#",
            key: "__sno",
            width: 64,
            align: "right" as const,
            onCell: parentDivider,
            render: (_: unknown, __: ReportRow, index: number) => (page - 1) * pageSize + index + 1,
          },
        ]
      : []),
    ...result.columns.map((c) => {
      const isParent = Boolean(c.group);
      return {
        title: c.label,
        dataIndex: c.key,
        key: c.key,
        align: c.type === "number" ? ("right" as const) : ("left" as const),
        // parent columns are shaded, matching the column picker
        onHeaderCell: () => (isParent ? { style: { background: token.colorPrimaryBg } } : {}),
        onCell: parentDivider,
        render: (value: ReportRow[string]) =>
          collapse && isParent && (value === null || value === undefined) ? null : formatCell(value, c.type),
      };
    }),
  ];

  return (
    <div>
      {showBusinessHeader &&
        (business ? (
          <div style={{ textAlign: "center", borderBottom: "2px solid currentColor", paddingBottom: 8, marginBottom: 12 }}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {business.name}
            </Typography.Title>
            {business.address && (
              <div>
                <Typography.Text type="secondary">{business.address}</Typography.Text>
              </div>
            )}
            {business.contact && (
              <div>
                <Typography.Text type="secondary">{business.contact}</Typography.Text>
              </div>
            )}
          </div>
        ) : (
          <Alert
            style={{ marginBottom: 12 }}
            type="info"
            showIcon
            message="Business information has not been set up yet, so the report header is left out."
          />
        ))}

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 4 }}>
        <Typography.Text strong>{result.label} Report</Typography.Text>
        <Typography.Text type="secondary">
          Generated: {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
        </Typography.Text>
      </div>

      <Table<ReportRow>
        size="small"
        bordered
        columns={columns}
        dataSource={result.results.map((row, i) => ({ ...row, __key: `${page}-${i}` }))}
        rowKey="__key"
        scroll={{ x: "max-content" }}
        pagination={{
          current: page,
          pageSize,
          total: result.count,
          showSizeChanger: true,
          pageSizeOptions: [25, 50, 100, 200],
          showTotal: (total) => `Total records: ${total}`,
          onChange: onPageChange,
        }}
      />
    </div>
  );
}
