// src/features/inventory/StockTransferPage.tsx
//
// BRD 6.6.1 item 9: move stock from one godown to another. Source and
// destination must differ; each line is capped at what's available in the
// source godown (the backend re-checks and refuses to go below zero).
// Posted transfers are listed below and can't be edited - move stock back
// with another transfer.

import { useEffect, useMemo, useState } from "react";
import { Button, DatePicker, Divider, Form, Input, InputNumber, Select, Table, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useLocation } from "react-router-dom";
import { useCreateStockTransferMutation, useGodownsQuery, useStockQuery, useStockTransfersQuery } from "./api";
import type { StockTransfer } from "./types";
import { showApiErrorPopup } from "../../lib/apiError";

const { Title } = Typography;

interface Line {
  item: number;
  quantity: number;
}

export function StockTransferPage() {
  const location = useLocation();
  const preset = (location.state ?? {}) as { fromGodown?: number | null; items?: number[] };

  const { data: godowns = [] } = useGodownsQuery();
  const { data: transfers = [], isLoading } = useStockTransfersQuery();
  const createMutation = useCreateStockTransferMutation();

  const [fromGodown, setFromGodown] = useState<number | null>(preset.fromGodown ?? null);
  const [toGodown, setToGodown] = useState<number | null>(null);
  const [transferDate, setTransferDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [remarks, setRemarks] = useState("");
  const [lines, setLines] = useState<Line[]>(() => (preset.items ?? []).map((item) => ({ item, quantity: 0 })));

  const { data: sourceStock = [] } = useStockQuery({ godown: fromGodown });
  const availableByItem = useMemo(() => {
    const map = new Map<number, number>();
    for (const row of sourceStock) map.set(row.item, (map.get(row.item) ?? 0) + Number(row.stockQty));
    return map;
  }, [sourceStock]);
  const itemLabel = useMemo(() => {
    const map = new Map<number, string>();
    for (const row of sourceStock) map.set(row.item, `${row.itemCode} - ${row.itemName}`);
    return map;
  }, [sourceStock]);

  // Changing the source godown invalidates lines for items it doesn't hold.
  useEffect(() => {
    if (fromGodown && sourceStock.length) {
      setLines((current) => current.filter((l) => (availableByItem.get(l.item) ?? 0) > 0));
    }
  }, [fromGodown, sourceStock, availableByItem]);

  const godownOptions = godowns.filter((g) => g.status === "Active").map((g) => ({ value: g.id, label: g.name }));
  const itemOptions = sourceStock
    .filter((r) => Number(r.stockQty) > 0 && !lines.some((l) => l.item === r.item))
    .map((r) => ({ value: r.item, label: `${r.itemCode} - ${r.itemName} (available ${Number(r.stockQty)})` }));

  async function handleSubmit() {
    const items = lines.filter((l) => l.quantity > 0);
    if (!fromGodown || !toGodown || fromGodown === toGodown) {
      message.error("Pick two different godowns.");
      return;
    }
    if (items.length === 0) {
      message.error("Add at least one item with a quantity.");
      return;
    }
    try {
      await createMutation.mutateAsync({ fromGodown, toGodown, transferDate, remarks, items });
      message.success("Stock transferred");
      setLines([]);
      setRemarks("");
    } catch (error) {
      showApiErrorPopup("Could not transfer stock", error);
    }
  }

  const lineColumns: ColumnsType<Line> = [
    { title: "Item", key: "item", render: (_, l) => itemLabel.get(l.item) ?? l.item },
    { title: "Available", key: "available", render: (_, l) => availableByItem.get(l.item) ?? 0 },
    {
      title: "Transfer Qty",
      key: "qty",
      render: (_, l, index) => (
        <InputNumber
          min={0}
          max={availableByItem.get(l.item) ?? 0}
          value={l.quantity}
          onChange={(v) => setLines((ls) => ls.map((x, i) => (i === index ? { ...x, quantity: v ?? 0 } : x)))}
        />
      ),
    },
    {
      title: "",
      key: "remove",
      render: (_, __, index) => <a onClick={() => setLines((ls) => ls.filter((_, i) => i !== index))}>Remove</a>,
    },
  ];

  const historyColumns: ColumnsType<StockTransfer> = [
    { title: "Transfer No.", dataIndex: "transferNumber" },
    { title: "Date", dataIndex: "transferDate" },
    { title: "From", dataIndex: "fromGodownName" },
    { title: "To", dataIndex: "toGodownName" },
    {
      title: "Items",
      key: "items",
      render: (_, t) => t.items.map((i) => `${i.itemCode} × ${Number(i.quantity)}`).join(", "),
    },
    { title: "Remarks", dataIndex: "remarks" },
    { title: "Created By", dataIndex: "createdBy" },
  ];

  return (
    <div>
      <Title level={3}>Stock Transfer</Title>
      <Form layout="vertical">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", columnGap: 24 }}>
          <Form.Item label="From Godown" required>
            <Select value={fromGodown ?? undefined} options={godownOptions} onChange={setFromGodown} />
          </Form.Item>
          <Form.Item label="To Godown" required>
            <Select
              value={toGodown ?? undefined}
              options={godownOptions.filter((g) => g.value !== fromGodown)}
              onChange={setToGodown}
            />
          </Form.Item>
          <Form.Item label="Transfer Date" required>
            <DatePicker
              style={{ width: "100%" }}
              value={dayjs(transferDate)}
              onChange={(d) => setTransferDate((d ?? dayjs()).format("YYYY-MM-DD"))}
            />
          </Form.Item>
          <Form.Item label="Remarks">
            <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </Form.Item>
        </div>
        <Form.Item label="Add Item">
          <Select
            style={{ maxWidth: 420 }}
            showSearch
            optionFilterProp="label"
            disabled={!fromGodown}
            placeholder={fromGodown ? "Select an item in stock" : "Pick the From Godown first"}
            value={null}
            options={itemOptions}
            onChange={(item: number) => setLines((ls) => [...ls, { item, quantity: 0 }])}
          />
        </Form.Item>
      </Form>
      <Table<Line> rowKey="item" dataSource={lines} columns={lineColumns} pagination={false} />
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
        <Button type="primary" onClick={handleSubmit} loading={createMutation.isPending}>
          Transfer Stock
        </Button>
      </div>

      <Divider>Transfer History</Divider>
      <Table<StockTransfer> rowKey="id" loading={isLoading} dataSource={transfers} columns={historyColumns} />
    </div>
  );
}
