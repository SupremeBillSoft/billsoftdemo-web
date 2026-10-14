// src/features/tax/TaxSearchListPage.tsx

import { useState } from "react";
import { Input, Table, Button, Tag } from "antd";
import { useNavigate } from "react-router-dom";
import { useTaxesQuery } from "./api";
import type { Tax } from "./types";

export function TaxSearchListPage() {
  const { data: taxes = [], isLoading } = useTaxesQuery();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const filtered = taxes.filter((t) => t.taxName.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Input.Search placeholder="Search taxes..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 320 }} />
        <Button type="primary" onClick={() => navigate("/tax/new")}>+ Create Tax</Button>
      </div>
      <Table<Tax>
        dataSource={filtered}
        loading={isLoading}
        rowKey="id"
        onRow={(record) => ({ onClick: () => navigate(`/tax/${record.id}`) })}
        columns={[
          { title: "Tax Code", dataIndex: "taxCode" },
          { title: "Tax Name", dataIndex: "taxName" },
          { title: "Tax Type", dataIndex: "taxType" },
          { title: "CGST %", dataIndex: "cgstPercentage" },
          { title: "SGST %", dataIndex: "sgstPercentage" },
          { title: "IGST %", dataIndex: "igstPercentage" },
          { title: "Status", dataIndex: "status", render: (s) => <Tag color={s === "Active" ? "green" : "default"}>{s}</Tag> },
        ]}
      />
    </div>
  );
}