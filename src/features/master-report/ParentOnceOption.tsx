import { Checkbox } from "antd";

import { useMasterReportStore } from "./store";
import type { MasterMeta } from "./types";

interface Props {
  master: MasterMeta;
}

/** Shown only for child reports (masters that have parent columns). */
export function ParentOnceOption({ master }: Props) {
  const parentOnce = useMasterReportStore((s) => s.parentOnce);
  const setParentOnce = useMasterReportStore((s) => s.setParentOnce);

  const group = master.columns.find((c) => c.group)?.group;
  if (!group) return null;

  return (
    <Checkbox checked={parentOnce} onChange={(e) => setParentOnce(e.target.checked)}>
      Show {group.toLowerCase()} details once per {group.toLowerCase()}
    </Checkbox>
  );
}
