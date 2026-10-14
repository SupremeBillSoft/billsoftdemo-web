import { useState } from "react";
import { Input, Table, Button, Tag } from "antd";
import { useNavigate } from "react-router-dom";
import { useBanksQuery } from "./api";
import type { Bank } from "./types";
import { BankExcelUpload } from "./BankExcelUpload";

export function BankSearchListPage() {
  const { data: banks = [], isLoading } = useBanksQuery();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const filtered = banks.filter((b) => b.bankName.toLowerCase().includes(query.toLowerCase()) || b.bankCode.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Input.Search placeholder="Search banks..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 320 }} />
        <div style={{ display: "flex", gap: 8 }}>
          <BankExcelUpload />
          <Button type="primary" onClick={() => navigate("/bank/new")}>+ Create Bank</Button>
        </div>
      </div>
      <Table<Bank>
        dataSource={filtered}
        loading={isLoading}
        rowKey="id"
        onRow={(record) => ({ onClick: () => navigate(`/bank/${record.bankCode}`) })}
        columns={[
          { title: "Bank Code", dataIndex: "bankCode" },
          { title: "Bank Name", dataIndex: "bankName" },
          { title: "Branch Name", dataIndex: "branchName" },
          { title: "Status", dataIndex: "status", render: (s) => <Tag color={s === "Active" ? "green" : "default"}>{s}</Tag> },
        ]}
      />
    </div>
  );
}