// src/features/inventory/StockAdjustmentModal.tsx
//
// The Item Master "Adjust Stock Quantity" popup (BRD 6.3.1 item 7): date
// (defaults to today), godown (mandatory), Add / Reduce, quantity with the
// stock unit, live Current -> Updated stock, remarks, and the audit
// history (Old / Updated / Adjusted Qty / Updated By / Updated On).
// Reducing below zero is blocked here and again by the backend.

import { useState } from "react";
import { DatePicker, Form, Input, InputNumber, Modal, Radio, Select, Table, Tabs, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useAdjustStockMutation, useGodownsQuery, useStockAdjustmentHistoryQuery, useStockQuery } from "./api";
import type { AdjustmentType, StockAdjustmentHistoryRow } from "./types";
import { showApiErrorPopup } from "../../lib/apiError";

export interface AdjustableItem {
  id: number;
  itemCode: string;
  itemName: string;
  uom?: string;
}

const HISTORY_COLUMNS: ColumnsType<StockAdjustmentHistoryRow> = [
  { title: "Date", dataIndex: "movementDate" },
  { title: "Godown", dataIndex: "godownName" },
  { title: "Old Stock", dataIndex: "oldStock", render: (v: string) => Number(v) },
  { title: "Adjusted Qty", dataIndex: "adjustedQty", render: (v: string) => (Number(v) > 0 ? `+${Number(v)}` : Number(v)) },
  { title: "Updated Stock", dataIndex: "updatedStock", render: (v: string) => Number(v) },
  { title: "Remarks", dataIndex: "remarks" },
  { title: "Updated By", dataIndex: "updatedBy" },
  { title: "Updated On", dataIndex: "updatedOn", render: (v: string) => dayjs(v).format("DD-MM-YYYY HH:mm") },
];

export function StockAdjustmentModal({ item, onClose }: { item: AdjustableItem | null; onClose: () => void }) {
  const { data: godowns = [] } = useGodownsQuery();
  const adjustMutation = useAdjustStockMutation();
  const [godown, setGodown] = useState<number | null>(null);
  const [type, setType] = useState<AdjustmentType>("Add");
  const [quantity, setQuantity] = useState(0);
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [remarks, setRemarks] = useState("");

  const effectiveGodown = godown ?? godowns.find((g) => g.isMain)?.id ?? null;
  const { data: stockRows = [] } = useStockQuery({ godown: effectiveGodown, item: item?.id ?? null });
  const { data: history = [] } = useStockAdjustmentHistoryQuery(item?.id ?? null);

  const current = stockRows.reduce((sum, r) => sum + Number(r.stockQty), 0);
  const delta = type === "Add" ? quantity : -quantity;
  const updated = current + delta;
  const belowZero = updated < 0;

  function reset() {
    setGodown(null);
    setType("Add");
    setQuantity(0);
    setRemarks("");
    setDate(dayjs().format("YYYY-MM-DD"));
  }

  function close() {
    reset();
    onClose();
  }

  async function handleSave() {
    if (!item || !effectiveGodown || quantity <= 0 || belowZero) return;
    try {
      await adjustMutation.mutateAsync({ item: item.id, godown: effectiveGodown, adjustmentType: type, quantity, date, remarks });
      message.success("Stock updated");
      setQuantity(0);
      setRemarks("");
    } catch (error) {
      showApiErrorPopup("Could not adjust stock", error);
    }
  }

  return (
    <Modal
      title={item ? `Adjust Stock Quantity - ${item.itemCode} ${item.itemName}` : ""}
      open={!!item}
      onCancel={close}
      onOk={handleSave}
      okText="Save"
      cancelText="Close"
      okButtonProps={{ disabled: !effectiveGodown || quantity <= 0 || belowZero }}
      confirmLoading={adjustMutation.isPending}
      width={820}
    >
      <Tabs
        items={[
          {
            key: "adjust",
            label: "Adjust",
            children: (
              <Form layout="vertical">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", columnGap: 16 }}>
                  <Form.Item label="Date">
                    <DatePicker
                      style={{ width: "100%" }}
                      value={dayjs(date)}
                      onChange={(d) => setDate((d ?? dayjs()).format("YYYY-MM-DD"))}
                    />
                  </Form.Item>
                  <Form.Item label="Godown" required>
                    <Select
                      value={effectiveGodown ?? undefined}
                      options={godowns.filter((g) => g.status === "Active").map((g) => ({ value: g.id, label: g.name }))}
                      onChange={setGodown}
                    />
                  </Form.Item>
                  <Form.Item label="Adjustment">
                    <Radio.Group
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      options={[
                        { value: "Add", label: "Add (+)" },
                        { value: "Reduce", label: "Reduce (-)" },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item
                    label="Quantity"
                    validateStatus={belowZero ? "error" : undefined}
                    help={belowZero ? "Can't reduce below the available stock" : undefined}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      value={quantity}
                      addonAfter={item?.uom || undefined}
                      onChange={(v) => setQuantity(v ?? 0)}
                    />
                  </Form.Item>
                  <Form.Item label="Current Stock">
                    <Input value={current} disabled />
                  </Form.Item>
                  <Form.Item label="Updated Stock">
                    <Input value={updated} disabled />
                  </Form.Item>
                </div>
                <Form.Item label="Remarks">
                  <Input.TextArea value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                </Form.Item>
              </Form>
            ),
          },
          {
            key: "history",
            label: `History (${history.length})`,
            children: <Table rowKey="id" size="small" dataSource={history} columns={HISTORY_COLUMNS} pagination={{ pageSize: 8 }} />,
          },
        ]}
      />
    </Modal>
  );
}
