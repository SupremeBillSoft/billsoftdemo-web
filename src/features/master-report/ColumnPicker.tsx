import { Button, Checkbox, Flex, Input, Typography, theme } from "antd";
import { useMemo, useState } from "react";

import { useMasterReportStore } from "./store";
import type { MasterMeta, ReportColumnMeta } from "./types";

interface Props {
  master: MasterMeta;
}

export function ColumnPicker({ master }: Props) {
  const { token } = theme.useToken();
  const [search, setSearch] = useState("");
  const selected = useMasterReportStore((s) => s.columns);
  const toggleColumn = useMasterReportStore((s) => s.toggleColumn);
  const setColumns = useMasterReportStore((s) => s.setColumns);

  // Child reports have parent columns (group = "Party"); they get their own shaded block.
  const hasGroups = master.columns.some((c) => c.group);

  const sections = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = master.columns.filter((c) => c.label.toLowerCase().includes(q) || c.key.toLowerCase().includes(q));
    const bySection = new Map<string, ReportColumnMeta[]>();
    for (const c of matches) {
      const name = c.group || "";
      bySection.set(name, [...(bySection.get(name) ?? []), c]);
    }
    return Array.from(bySection.entries());
  }, [master, search]);

  return (
    <Flex vertical gap={8}>
      <Flex justify="space-between" align="center">
        <Typography.Text type="secondary">
          {selected.length} of {master.columns.length} selected
        </Typography.Text>
        <Flex gap={4}>
          <Button type="link" size="small" onClick={() => setColumns(master.columns.map((c) => c.key))}>
            All
          </Button>
          <Button type="link" size="small" onClick={() => setColumns([])}>
            None
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => setColumns(master.columns.filter((c) => c.default).map((c) => c.key))}
          >
            Default
          </Button>
        </Flex>
      </Flex>

      <Input allowClear placeholder="Search columns…" value={search} onChange={(e) => setSearch(e.target.value)} />

      <div style={{ maxHeight: 300, overflowY: "auto" }}>
        {sections.length === 0 ? (
          <Typography.Text type="secondary">No columns match</Typography.Text>
        ) : (
          <Flex vertical gap={10}>
            {sections.map(([name, cols]) => (
              <div
                key={name || "own"}
                style={name ? { background: token.colorPrimaryBg, borderRadius: token.borderRadius, padding: 8 } : undefined}
              >
                {hasGroups && (
                  <Typography.Text strong type="secondary" style={{ display: "block", marginBottom: 6 }}>
                    {name ? `${name} details` : master.label}
                  </Typography.Text>
                )}
                <Flex vertical gap={6}>
                  {cols.map((c) => (
                    <Checkbox key={c.key} checked={selected.includes(c.key)} onChange={() => toggleColumn(c.key)}>
                      {c.label}
                    </Checkbox>
                  ))}
                </Flex>
              </div>
            ))}
          </Flex>
        )}
      </div>
    </Flex>
  );
}
