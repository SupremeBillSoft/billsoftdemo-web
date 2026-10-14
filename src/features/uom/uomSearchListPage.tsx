// src/features/units/UnitSearchListPage.tsx

import { useState } from "react";
import { Input, Table, Button, Tag } from "antd";
import { useNavigate } from "react-router-dom";
import { useUnitsQuery } from "./api";
import type { Unit } from "./types";

export function UnitSearchListPage() {
  const { data: units = [], isLoading } = useUnitsQuery();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const filtered = units.filter((u) => u.unitName.toLowerCase().includes(query.toLowerCase()) || u.unitCode.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Input.Search placeholder="Search Units..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 320 }} />
        <Button type="primary" onClick={() => navigate("/uom/new")}>+ Create Unit</Button>
      </div>
      <Table<Unit>
        dataSource={filtered}
        loading={isLoading}
        rowKey="id"
        onRow={(record) => ({ onClick: () => navigate(`/uom/${record.unitCode}`) })}
        columns={[
          { title: "Unit Code", dataIndex: "unitCode" },
          { title: "Unit Name", dataIndex: "unitName" },
          { title: "Unit Description", dataIndex: "unitDescription" },
          { title: "Status", dataIndex: "unitStatus", render: (s) => <Tag color={s === "Active" ? "green" : "default"}>{s}</Tag> },
        ]}
      />
    </div>
  );
}