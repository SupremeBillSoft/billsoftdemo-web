import { Button, Flex, Input, Segmented, Select, Typography } from "antd";

import { operatorLabel } from "./format";
import { useMasterReportStore } from "./store";
import type { Condition, Logic, MasterMeta, ReportColumnMeta } from "./types";

interface Props {
  master: MasterMeta;
  ignored: number;
}

function ValueInput({
  col,
  cond,
  onChange,
}: {
  col: ReportColumnMeta;
  cond: Condition;
  onChange: (value: string | boolean) => void;
}) {
  switch (col.type) {
    case "bool":
      return (
        <Select
          style={{ width: 120 }}
          value={cond.value === true}
          onChange={(v: boolean) => onChange(v)}
          options={[
            { value: true, label: "Yes" },
            { value: false, label: "No" },
          ]}
        />
      );
    case "number":
      return (
        <Input
          style={{ width: 160 }}
          type="number"
          value={typeof cond.value === "string" ? cond.value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "date":
    case "datetime":
      return (
        <Input
          style={{ width: 160 }}
          type="date"
          value={typeof cond.value === "string" ? cond.value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    default:
      return (
        <Input
          style={{ width: 200 }}
          placeholder="Value"
          value={typeof cond.value === "string" ? cond.value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

export function ConditionBuilder({ master, ignored }: Props) {
  const conditions = useMasterReportStore((s) => s.conditions);
  const logic = useMasterReportStore((s) => s.logic);
  const addCondition = useMasterReportStore((s) => s.addCondition);
  const updateCondition = useMasterReportStore((s) => s.updateCondition);
  const changeConditionColumn = useMasterReportStore((s) => s.changeConditionColumn);
  const removeCondition = useMasterReportStore((s) => s.removeCondition);
  const setLogic = useMasterReportStore((s) => s.setLogic);

  const filterable = master.columns.filter((c) => c.filterable);

  return (
    <Flex vertical gap={8}>
      {conditions.length === 0 && <Typography.Text type="secondary">No filters: all records are shown.</Typography.Text>}

      {conditions.map((cond) => {
        const col = master.columns.find((c) => c.key === cond.column);
        if (!col) return null;
        return (
          <Flex key={cond.id} gap={8} wrap align="center">
            <Select
              style={{ width: 200 }}
              showSearch
              optionFilterProp="label"
              value={cond.column}
              options={filterable.map((c) => ({ value: c.key, label: c.label }))}
              onChange={(key: string) => {
                const next = master.columns.find((c) => c.key === key);
                if (next) changeConditionColumn(cond.id, next);
              }}
            />
            <Select
              style={{ width: 190 }}
              value={cond.op}
              options={col.operators.map((op) => ({ value: op, label: operatorLabel(col.type, op) }))}
              onChange={(op) => updateCondition(cond.id, { op })}
            />
            <ValueInput col={col} cond={cond} onChange={(value) => updateCondition(cond.id, { value })} />
            <Button type="text" danger onClick={() => removeCondition(cond.id)} aria-label="Remove filter">
              ✕
            </Button>
          </Flex>
        );
      })}

      <Flex gap={12} align="center" wrap>
        <Button size="small" onClick={() => addCondition(master)}>
          + Add filter
        </Button>
        {conditions.length > 1 && (
          <Segmented<Logic>
            size="small"
            options={["AND", "OR"]}
            value={logic}
            onChange={(v) => setLogic(v)}
          />
        )}
        {ignored > 0 && (
          <Typography.Text type="warning">
            {ignored} incomplete filter{ignored > 1 ? "s" : ""} ignored until a value is entered
          </Typography.Text>
        )}
      </Flex>
    </Flex>
  );
}
