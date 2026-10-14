// src/features/items/ItemSearchListPage.tsx
//
// Item Master list (BRD 6.3.1): dashboard summary, Search & Filter with
// Search / Show All, a sortable grid, and row actions View / Edit / Delete /
// Adjust Stock. An empty list shows the grid with "No records" (same as
// Party Master) rather than bouncing the user to Create.

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Dropdown, Input, Modal, Statistic, Table, Tag, message } from "antd";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DownOutlined, UpOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useDeleteItemMutation, useItemsQuery } from "./api";
import type { Item } from "./types";
import { showApiErrorPopup } from "../../lib/apiError";
import { StockAdjustmentModal, type AdjustableItem } from "../inventory/StockAdjustmentModal";
import { useStockQuery } from "../inventory/api";

interface Filters {
  itemName: string;
  itemCode: string;
  hsnCode: string;
}

const EMPTY_FILTERS: Filters = { itemName: "", itemCode: "", hsnCode: "" };

const contains = (value: unknown, query: string) => String(value ?? "").toLowerCase().includes(query.trim().toLowerCase());
const byText = (key: keyof Item) => (a: Item, b: Item) => String(a[key] ?? "").localeCompare(String(b[key] ?? ""));
const byNumber = (key: keyof Item) => (a: Item, b: Item) => Number(a[key] ?? 0) - Number(b[key] ?? 0);

export function ItemSearchListPage() {
  const { data: items = [], isLoading, error } = useItemsQuery();
  const { data: stockRows = [] } = useStockQuery({});
  const deleteItem = useDeleteItemMutation();
  const navigate = useNavigate();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [adjusting, setAdjusting] = useState<AdjustableItem | null>(null);

  useEffect(() => {
    if (error) showApiErrorPopup("Failed to load items", error);
  }, [error]);

  // Dashboard (BRD 6.3.1 item 1): stock value from the inventory ledger, and
  // items below their reorder level.
  const stockByItem = useMemo(() => {
    const map = new Map<number, number>();
    for (const row of stockRows) map.set(row.item, (map.get(row.item) ?? 0) + Number(row.stockQty));
    return map;
  }, [stockRows]);
  const totalStockValue = stockRows.reduce((sum, r) => sum + Number(r.stockValue), 0);
  const lowStockCount = items.filter(
    (i) => i.itemType === "Product" && Number(i.reorderLevel ?? 0) > 0 && (stockByItem.get(Number(i.id)) ?? 0) < Number(i.reorderLevel)
  ).length;

  const filtered = items.filter(
    (i) =>
      contains(i.itemName, applied.itemName) && contains(i.itemCode, applied.itemCode) && contains(i.hsnCode, applied.hsnCode)
  );

  function rowMenu(record: Item): MenuProps["items"] {
    return [
      { key: "view", label: "View", onClick: () => navigate(`/items/${record.itemCode}/view`) },
      { key: "edit", label: "Edit", onClick: () => navigate(`/items/${record.itemCode}`) },
      ...(record.itemType === "Product"
        ? [{
            key: "stock",
            label: "Opening Stock / Adjust Stock",
            onClick: () =>
              setAdjusting({ id: Number(record.id), itemCode: record.itemCode, itemName: record.itemName, uom: record.billingUom }),
          }]
        : []),
      { type: "divider" as const },
      {
        key: "delete",
        label: "Delete",
        danger: true,
        onClick: () =>
          Modal.confirm({
            title: `Delete item ${record.itemCode}?`,
            okButtonProps: { danger: true },
            onOk: () =>
              deleteItem
                .mutateAsync(record.itemCode)
                .then(() => message.success("Item deleted"))
                .catch((err) => showApiErrorPopup("Could not delete the item", err)),
          }),
      },
    ];
  }

  const columns: ColumnsType<Item> = [
    { title: "Item Code", dataIndex: "itemCode", sorter: byText("itemCode") },
    { title: "Item Name", dataIndex: "itemName", sorter: byText("itemName") },
    { title: "Item Type", dataIndex: "itemType", sorter: byText("itemType") },
    { title: "Item Category", dataIndex: "itemCategory", sorter: byText("itemCategory"), render: (v) => v || "—" },
    { title: "UOM", dataIndex: "billingUom", sorter: byText("billingUom") },
    { title: "Weight", dataIndex: "perUnitWeight", sorter: byNumber("perUnitWeight"), render: (v) => v ?? "—" },
    { title: "HSN No", dataIndex: "hsnCode", sorter: byText("hsnCode"), render: (v) => v || "—" },
    {
      title: "Stock",
      key: "stock",
      // Opening stock & stock adjustment hyperlink (Products only).
      render: (_, record) =>
        record.itemType === "Product" ? (
          <a
            onClick={() =>
              setAdjusting({ id: Number(record.id), itemCode: record.itemCode, itemName: record.itemName, uom: record.billingUom })
            }
          >
            {stockByItem.get(Number(record.id)) ?? 0} · Adjust
          </a>
        ) : (
          "—"
        ),
    },
    {
      title: "Status",
      dataIndex: "itemStatus",
      sorter: byText("itemStatus"),
      render: (s) => <Tag color={s === "Active" ? "green" : "default"}>{s}</Tag>,
    },
    {
      title: "",
      key: "actions",
      render: (_, record) => (
        <Dropdown menu={{ items: rowMenu(record) }} trigger={["click"]}>
          <a onClick={(e) => e.preventDefault()}>⋮</a>
        </Dropdown>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Items</h2>
        <Button type="primary" onClick={() => navigate("/items/new")}>+ Create Item</Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 18 }}>
        <Card size="small">
          <Statistic title="Total Stock Value" value={totalStockValue} precision={2} />
          <a onClick={() => navigate("/inventory/godown")}>Stock summary</a>
        </Card>
        <Card size="small">
          <Statistic title="Low Stock Items" value={lowStockCount} />
          <span style={{ fontSize: 12, color: "#8c8c8c" }}>Below their reorder level</span>
        </Card>
        <Card size="small">
          <Statistic title="Items Expiring (30 days)" value="—" />
          <span style={{ fontSize: 12, color: "#8c8c8c" }}>Needs batch tracking (not built yet)</span>
        </Card>
      </div>

      <div style={{ border: "1px solid #E4E1DA", borderRadius: 8, padding: 16, marginBottom: 18 }}>
        <div
          style={{ cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
          onClick={() => setFiltersOpen((o) => !o)}
        >
          {filtersOpen ? <UpOutlined /> : <DownOutlined />} Search & Filter
        </div>
        {filtersOpen && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 14 }}>
              {(
                [
                  ["itemName", "Item Name"],
                  ["itemCode", "Item Code"],
                  ["hsnCode", "HSN No."],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <div style={{ fontSize: 11.5, marginBottom: 5 }}>{label}</div>
                  <Input value={draft[key]} onChange={(e) => setDraft((f) => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <Button type="primary" onClick={() => setApplied(draft)}>Search</Button>
              <Button
                onClick={() => {
                  setDraft(EMPTY_FILTERS);
                  setApplied(EMPTY_FILTERS);
                }}
              >
                Show All
              </Button>
            </div>
          </>
        )}
      </div>

      <Table<Item>
        dataSource={filtered}
        loading={isLoading}
        rowKey="id"
        columns={columns}
        locale={{ emptyText: "No records" }}
      />
      <StockAdjustmentModal item={adjusting} onClose={() => setAdjusting(null)} />
    </div>
  );
}
