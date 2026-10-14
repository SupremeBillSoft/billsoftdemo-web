// src/features/parties/PartySearchListPage.tsx

import { useState } from "react";
import { Input, Table, Button, Modal, Tag } from "antd";
import { useNavigate } from "react-router-dom";
import { useEmployeeStore } from "./store";
import type { Employee } from "./types";

// one-line: search/filter logic lives here, separate from EmployeeTable's
// rendering concerns below — "cleanly separated" per your requirement,
// as two components on one screen rather than a shared blob.
function useEmployeeSearch(employees: Employee[]) {
  const [query, setQuery] = useState("");
  const filtered = employees.filter((p) => p.EmployeeName.toLowerCase().includes(query.toLowerCase()));
  return { query, setQuery, filtered };
}

export function EmployeeSearchListPage() {
  const employees = useEmployeeStore((s) => s.employees);
  const navigate = useNavigate();
  const { query, setQuery, filtered } = useEmployeeSearch(employees);

  // one-line: THE empty-state flow from your requirement — checked once, on
  // this screen's first render; real version swaps `parties.length` for the
  // API response length once /api/parties exists.
  const [checked, setChecked] = useState(false);
  if (!checked && employees.length === 0) {
    Modal.info({
      title: "No Records Found",
      centered: true,
      onOk: () => navigate("/employee/new"),
    });
    setChecked(true);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Input.Search placeholder="Search employees..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 320 }} />
        <div style={{ display: "flex", gap: 8 }}>
            <Button type="primary" onClick={() => navigate("/employee/new")}>+ Create Employee</Button>
        </div>
      </div>
      <Table<Employee>
        dataSource={filtered}
        rowKey="id"
        onRow={(record) => ({ onClick: () => navigate(`/employee/${record.id}`) })}
        columns={[
          { title: "Employee Code", dataIndex: "EmployeeCode" },
          { title: "Employee Name", dataIndex: "EmployeeName" },          
          { title: "Mobile Number", dataIndex: "MobileNumber" }, 
          { title: "Qualification", dataIndex: "Qualification" },
          { title: "Status", dataIndex: "Status", render: (s) => <Tag color={s === "Active" ? "green" : "default"}>{s}</Tag> },
        ]}
      />
    </div>
  );
}