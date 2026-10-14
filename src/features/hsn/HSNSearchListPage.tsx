import { useState } from "react";
import { Input, Table, Button, Tag } from "antd";
import { useNavigate } from "react-router-dom";
import { useHSNsQuery } from "./api";
import type { HSN } from "./types";

export function HSNSearchListPage() {
  const { data: hsns = [], isLoading } = useHSNsQuery();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const filtered = hsns.filter((h) => h.hsnCode.includes(query) || h.hsnName.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Input.Search placeholder="Search HSNs..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 320 }} />
        <Button type="primary" onClick={() => navigate("/hsn/new")}>+ Create HSN</Button>
      </div>
      <Table<HSN>
        dataSource={filtered}
        loading={isLoading}
        rowKey="id"
        onRow={(record) => ({ onClick: () => navigate(`/hsn/${record.hsnCode}`) })}
        columns={[
          { title: "HSN Code", dataIndex: "hsnCode" },
          { title: "HSN Name", dataIndex: "hsnName" },
          { title: "Item Type", dataIndex: "itemType" },
          { title: "Product Category", dataIndex: "productCategory" },
          { title: "Tax Type", dataIndex: "taxType" },
          { title: "Status", dataIndex: "status", render: (s) => <Tag color={s === "Active" ? "green" : "default"}>{s}</Tag> },
        ]}
      />
    </div>
  );
}