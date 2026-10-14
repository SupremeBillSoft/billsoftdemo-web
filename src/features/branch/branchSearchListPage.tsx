import { useState } from "react";
import { Input, Table, Button, Tag } from "antd";
import { useNavigate } from "react-router-dom";
import { useBranchesQuery } from "./api"; // was: useBranchStore
import type { Branch } from "./types";

export function BranchSearchListPage() {
  const { data: branches = [], isLoading } = useBranchesQuery(); // was: items from store
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const filtered = branches.filter((b) => b.branchName.toLowerCase().includes(query.toLowerCase()) || b.branchCode.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Input.Search placeholder="Search branches..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 320 }} /> {/* was: "Search units..." */}
        <Button type="primary" onClick={() => navigate("/branch/new")}>+ Create Branch</Button>
      </div>
      <Table<Branch>
        dataSource={filtered}
        loading={isLoading}
        rowKey="id"
        onRow={(record) => ({ onClick: () => navigate(`/branch/${record.branchCode}`) })} // was: record.id
        columns={[
          { title: "Branch Code", dataIndex: "branchCode" },
          { title: "Branch Name", dataIndex: "branchName" },
          { title: "City", dataIndex: "city" },
          { title: "Mobile No", dataIndex: "mobileNo" },
          { title: "Status", dataIndex: "status", render: (s) => <Tag color={s === "Active" ? "green" : "default"}>{s}</Tag> },
        ]}
      />
    </div>
  );
}