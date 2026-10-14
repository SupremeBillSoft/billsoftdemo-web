import { useState } from "react";
import { useFieldArray } from "react-hook-form";
import type { Control } from "react-hook-form";
import { Button, Input, InputNumber, DatePicker, Select, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { ItemFormInput, CustomFieldRow } from "./schema";
import { theme } from "antd";
import { DISPLAY_DATE_FORMAT, formatDisplayDate } from "../../lib/date";

const LIMITS: Record<CustomFieldRow["type"], number> = {
  Text: 6,
  Date: 2,
  Float: 2,
};

export function CustomFieldsSection({
  control,
}: {
  control: Control<ItemFormInput>;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "customFields",
  });

  const [name, setName] = useState("");
  const [type, setType] = useState<CustomFieldRow["type"]>("Text");
  const [textValue, setTextValue] = useState("");
  const [numberValue, setNumberValue] = useState<number | null>(null);
  const [dateValue, setDateValue] = useState<dayjs.Dayjs | null>(null);
  const [nameError, setNameError] = useState("");
  const { token } = theme.useToken();
  const counts = fields.reduce<Record<string, number>>((acc, f) => {
    const row = f as unknown as CustomFieldRow;
    acc[row.type] = (acc[row.type] ?? 0) + 1;
    return acc;
  }, {});

  function resetDraft() {
    setName("");
    setTextValue("");
    setNumberValue(null);
    setDateValue(null);
    setNameError("");
  }

  function handleAdd() {
    if (!name.trim()) {
      setNameError("Custom Name is required");
      return;
    }
    if ((counts[type] ?? 0) >= LIMITS[type]) return; // guarded by disabled Select options too
    if (fields.length >= 10) return;

    const row: CustomFieldRow =
      type === "Text"
        ? { type: "Text", name: name.trim(), value: textValue || undefined }
        : type === "Date"
          ? {
              type: "Date",
              name: name.trim(),
              value: dateValue ? dateValue.format("YYYY-MM-DD") : undefined,
            }
          : {
              type: "Float",
              name: name.trim(),
              value: numberValue ?? undefined,
            };

    append(row);
    resetDraft();
  }

  const columns: ColumnsType<CustomFieldRow & { id: string }> = [
    { title: "Custom Name", dataIndex: "name" },
    { title: "Type", dataIndex: "type" },
    {
      title: "Value",
      dataIndex: "value",
      render: (v: unknown, row) => {
        if (v == null || v === "") return "-";
        return row.type === "Date" ? formatDisplayDate(String(v)) : String(v);
      },
    },
    {
      title: "",
      render: (_, __, index) => <a onClick={() => remove(index)}>Remove</a>,
    },
  ];

  return (
    <div
      style={{
        marginTop: 16,
        paddingTop: 16,
        borderTop: "1px dashed rgba(0,0,0,0.15)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "flex-end",
          marginBottom: 8,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 5 }}>
            Custom Name*
          </div>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError("");
            }}
            status={nameError ? "error" : undefined}
          />
          <div
            style={{ height: 15, fontSize: 11, color: "#ff4d4f", marginTop: 3 }}
          >
            {nameError}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 5 }}>
            Type*
          </div>
          <Select<CustomFieldRow["type"]>
            value={type}
            onChange={setType}
            style={{ width: "100%" }}
            options={(["Text", "Date", "Float"] as const).map((t) => ({
              value: t,
              label: t,
              disabled: (counts[t] ?? 0) >= LIMITS[t],
            }))}
          />
          <div style={{ height: 15 }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 5 }}>
            Value
          </div>
          {type === "Text" && (
            <Input
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
            />
          )}
          {type === "Date" && (
            <DatePicker
              value={dateValue}
              onChange={setDateValue}
              format={DISPLAY_DATE_FORMAT}
              style={{ width: "100%" }}
            />
          )}
          {type === "Float" && (
            <InputNumber
              value={numberValue}
              onChange={setNumberValue}
              style={{ width: "100%" }}
            />
          )}
          <div style={{ height: 15 }} />
        </div>
        <Button
          type="primary"
          onClick={handleAdd}
          disabled={fields.length >= 10}
          style={{ marginBottom: 15 }}
        >
          + Add
        </Button>
      </div>

      <div
        style={{
          fontSize: 11.5,
          color: token.colorTextSecondary,
          marginBottom: 10,
        }}
      >
        {fields.length}/10 custom fields used — Text: {counts.Text ?? 0}/6,
        Date: {counts.Date ?? 0}/2, Float: {counts.Float ?? 0}/2
      </div>

      {fields.length > 0 && (
        <Table<CustomFieldRow & { id: string }>
          dataSource={fields as (CustomFieldRow & { id: string })[]}
          rowKey="id"
          pagination={false}
          columns={columns}
        />
      )}
    </div>
  );
}
