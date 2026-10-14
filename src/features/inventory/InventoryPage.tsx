// src/features/inventory/InventoryPage.tsx
//
// BRD 6.6.1 Inventory list screen: pick a godown, manage godowns
// (create / edit / delete - delete is refused once the godown has stock
// history), search items, see stock quantity and value, and multi-select
// items to transfer to another godown.

import { useMemo, useState } from "react";
import { Button, Form, Input, Modal, Select, Space, Switch, Table, Tag, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import { useDeleteGodownMutation, useGodownsQuery, useSaveGodownMutation, useStockQuery } from "./api";
import type { Godown, GodownPayload, StockRow } from "./types";
import { showApiErrorPopup } from "../../lib/apiError";

const { Title, Text } = Typography;

const EMPTY_GODOWN: GodownPayload = { name: "", location: "", state: "", description: "", isMain: false, status: "Active" };

function GodownModal({ godown, onClose }: { godown: Godown | "new" | null; onClose: () => void }) {
  const saveMutation = useSaveGodownMutation();
  const [draft, setDraft] = useState<GodownPayload>(EMPTY_GODOWN);
  const [loadedFor, setLoadedFor] = useState<Godown | "new" | null>(null);
  if (godown !== loadedFor) {
    setLoadedFor(godown);
    setDraft(godown && godown !== "new" ? { ...godown } : EMPTY_GODOWN);
  }

  async function handleSave() {
    if (!draft.name.trim()) {
      message.error("Godown name is required");
      return;
    }
    try {
      await saveMutation.mutateAsync({ id: godown && godown !== "new" ? godown.id : undefined, values: draft });
      message.success("Godown saved");
      onClose();
    } catch (error) {
      showApiErrorPopup("Could not save the godown", error);
    }
  }

  const set = <K extends keyof GodownPayload>(key: K, value: GodownPayload[K]) => setDraft((d) => ({ ...d, [key]: value }));

  return (
    <Modal
      title={godown === "new" ? "Create Godown" : "Edit Godown"}
      open={!!godown}
      onCancel={onClose}
      onOk={handleSave}
      okText="Save"
      confirmLoading={saveMutation.isPending}
    >
      <Form layout="vertical">
        <Form.Item label="Godown Name" required>
          <Input value={draft.name} onChange={(e) => set("name", e.target.value)} />
        </Form.Item>
        <Form.Item label="Location">
          <Input value={draft.location} onChange={(e) => set("location", e.target.value)} />
        </Form.Item>
        <Form.Item label="State">
          <Input value={draft.state} onChange={(e) => set("state", e.target.value)} />
        </Form.Item>
        <Form.Item label="Description (optional)">
          <Input.TextArea value={draft.description} onChange={(e) => set("description", e.target.value)} />
        </Form.Item>
        <Space size={32}>
          <Form.Item label="Main Godown">
            <Switch checked={draft.isMain} onChange={(v) => set("isMain", v)} />
          </Form.Item>
          <Form.Item label="Active">
            <Switch checked={draft.status === "Active"} onChange={(v) => set("status", v ? "Active" : "Inactive")} />
          </Form.Item>
        </Space>
      </Form>
    </Modal>
  );
}

export function InventoryPage() {
  const navigate = useNavigate();
  const { data: godowns = [] } = useGodownsQuery();
  const deleteMutation = useDeleteGodownMutation();
  const [godownId, setGodownId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Godown | "new" | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);

  const selectedGodown = godowns.find((g) => g.id === godownId) ?? null;
  const { data: rows = [], isLoading } = useStockQuery({ godown: godownId, search });

  const totalValue = useMemo(() => rows.reduce((sum, r) => sum + Number(r.stockValue), 0), [rows]);

  function handleDelete(godown: Godown) {
    Modal.confirm({
      title: `Delete godown "${godown.name}"?`,
      content: "A godown that holds or has held stock can't be deleted.",
      okButtonProps: { danger: true },
      onOk: () =>
        deleteMutation
          .mutateAsync(godown.id)
          .then(() => {
            setGodownId(null);
            message.success("Godown deleted");
          })
          .catch((error) => showApiErrorPopup("Could not delete the godown", error)),
    });
  }

  function transferSelected() {
    const items = rows.filter((r) => selectedKeys.includes(`${r.item}-${r.batchNo}`)).map((r) => r.item);
    navigate("/inventory/stock-transfer", { state: { fromGodown: godownId, items } });
  }

  const columns: ColumnsType<StockRow> = [
    { title: "Item Name", dataIndex: "itemName", sorter: (a, b) => a.itemName.localeCompare(b.itemName) },
    { title: "Item Code", dataIndex: "itemCode" },
    { title: "Item Batch", dataIndex: "batchNo", render: (v: string) => v || "—" },
    {
      title: "Stock Quantity",
      key: "qty",
      sorter: (a, b) => Number(a.stockQty) - Number(b.stockQty),
      render: (_, r) => `${Number(r.stockQty)} ${r.uom ?? ""}`,
    },
    { title: "Stock Value", dataIndex: "stockValue", render: (v: string) => Number(v).toFixed(2) },
    { title: "Selling Price", dataIndex: "sellingPrice", render: (v: number | null) => v ?? "—" },
    { title: "Purchase Price", dataIndex: "purchasePrice", render: (v: number | null) => v ?? "—" },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Inventory</Title>
        <Space>
          <Button onClick={() => navigate("/inventory/stock-transfer")}>Stock Transfer</Button>
          <Button type="primary" onClick={() => setEditing("new")}>+ Create Godown</Button>
        </Space>
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <Select
          style={{ minWidth: 240 }}
          placeholder="All godowns"
          allowClear
          value={godownId ?? undefined}
          onChange={(v) => {
            setGodownId(v ?? null);
            setSelectedKeys([]);
          }}
          options={godowns.map((g) => ({ value: g.id, label: g.name }))}
        />
        {selectedGodown && (
          <>
            <Text type="secondary">
              {[selectedGodown.location, selectedGodown.state].filter(Boolean).join(", ") || "No location set"}
            </Text>
            {selectedGodown.isMain && <Tag color="blue">Main Godown</Tag>}
            {selectedGodown.status !== "Active" && <Tag>Inactive</Tag>}
            <a onClick={() => setEditing(selectedGodown)}>Edit</a>
            <a style={{ color: "#ff4d4f" }} onClick={() => handleDelete(selectedGodown)}>Delete</a>
          </>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <Input.Search
          placeholder="Search by Item Name / Item Code"
          allowClear
          onSearch={setSearch}
          style={{ maxWidth: 320 }}
        />
        <Space>
          <Text>Total stock value: <strong>{totalValue.toFixed(2)}</strong></Text>
          {selectedKeys.length > 0 && (
            <Button disabled={!godownId} onClick={transferSelected} title={godownId ? "" : "Pick the source godown first"}>
              Transfer {selectedKeys.length} selected
            </Button>
          )}
        </Space>
      </div>

      <Table<StockRow>
        rowKey={(r) => `${r.item}-${r.batchNo}`}
        loading={isLoading}
        dataSource={rows}
        columns={columns}
        rowSelection={{ selectedRowKeys: selectedKeys, onChange: setSelectedKeys }}
        locale={{ emptyText: "No stocked items found" }}
      />

      <GodownModal godown={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
