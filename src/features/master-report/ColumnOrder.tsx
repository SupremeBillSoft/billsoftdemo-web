import { Button, Flex, Typography } from "antd";

import { useMasterReportStore } from "./store";
import type { MasterMeta } from "./types";

interface Props {
  master: MasterMeta;
}

export function ColumnOrder({ master }: Props) {
  const selected = useMasterReportStore((s) => s.columns);
  const moveColumn = useMasterReportStore((s) => s.moveColumn);
  const toggleColumn = useMasterReportStore((s) => s.toggleColumn);

  if (selected.length === 0) {
    return <Typography.Text type="secondary">No columns selected</Typography.Text>;
  }

  return (
    <div style={{ maxHeight: 260, overflowY: "auto" }}>
      <Flex vertical gap={6}>
        {selected.map((key, i) => {
          const label = master.columns.find((c) => c.key === key)?.label ?? key;
          return (
            <Flex key={key} align="center" gap={4}>
              <Typography.Text type="secondary" style={{ width: 22 }}>
                {i + 1}
              </Typography.Text>
              <Typography.Text style={{ flex: 1 }} ellipsis>
                {label}
              </Typography.Text>
              <Button size="small" type="text" disabled={i === 0} onClick={() => moveColumn(key, -1)} aria-label="Move up">
                ▲
              </Button>
              <Button
                size="small"
                type="text"
                disabled={i === selected.length - 1}
                onClick={() => moveColumn(key, 1)}
                aria-label="Move down"
              >
                ▼
              </Button>
              <Button size="small" type="text" onClick={() => toggleColumn(key)} aria-label="Remove column">
                ✕
              </Button>
            </Flex>
          );
        })}
      </Flex>
    </div>
  );
}
