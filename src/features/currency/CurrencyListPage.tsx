import { useNavigate } from "react-router-dom";
import { Button, Space, Table, Tag, Popconfirm } from "antd";
import type { ColumnsType } from "antd/es/table";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useCurrenciesQuery, useDeleteCurrencyMutation } from "./api";
import type { Currency } from "./types";

export function CurrencyListPage() {
  const navigate = useNavigate();
  const { data: currencies = [], isLoading } = useCurrenciesQuery();
  const deleteCurrency = useDeleteCurrencyMutation();

  const columns: ColumnsType<Currency> = [
    { title: "Code", dataIndex: "currencyCode", width: 90 },
    { title: "Currency Name", dataIndex: "currencyName" },
    { title: "Symbol", dataIndex: "symbol", width: 90 },
    { title: "Major Unit", dataIndex: "majorUnitName" },
    { title: "Minor Unit", dataIndex: "minorUnitName", render: (v: string) => v || "—" },
    { title: "Decimals", dataIndex: "decimalPlaces", width: 90, align: "center" },
    { title: "Position", dataIndex: "symbolPosition", width: 100 },
    { title: "Status", dataIndex: "status", width: 100, render: (s: Currency["status"]) => <Tag color={s === "Active" ? "green" : "default"}>{s}</Tag> },
    {
      title: "Actions", key: "actions", width: 100,
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => navigate(`/currency/${record.currencyCode}`)} />
          <Popconfirm title="Delete this currency?" onConfirm={() => deleteCurrency.mutate(record.currencyCode)} okText="Delete" okButtonProps={{ danger: true }}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Currency Master</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/currency/new")}>Add Currency</Button>
      </div>
      <Table<Currency> rowKey="id" columns={columns} dataSource={currencies} loading={isLoading} pagination={{ pageSize: 10 }} />
    </div>
  );
}