// src/components/DynamicTabForm/DynamicTabForm.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { Tabs, message } from "antd";
import type { FieldValues } from "react-hook-form";
import { RepeatableTabPanel } from "./RepeatableTabPanel";
import { FlatTabPanel } from "./FlatTabPanel";
import type { DynamicTabFormProps, TabConfig } from "./types";

// The top-level form field names a tab owns, so a validation error can be
// traced back to the tab it lives on.
function fieldsOwnedBy<T extends FieldValues>(tab: TabConfig<T>): string[] {
  if (tab.repeatable) return [tab.arrayFieldName as string];
  return [...tab.fields.map((f) => String(f.name).split(".")[0]), ...(tab.errorFields ?? [])];
}

export function DynamicTabForm<T extends FieldValues>({ tabs, control, errors, dynamicOptions, defaultActiveTabKey, setValue, readOnly }: DynamicTabFormProps<T>) {
  const [activeKey, setActiveKey] = useState(defaultActiveTabKey ?? tabs[0]?.key);

  const tabsWithErrors = useMemo(() => {
    const errorNames = new Set(Object.keys(errors ?? {}));
    return tabs.filter((tab) => fieldsOwnedBy(tab).some((name) => errorNames.has(name))).map((tab) => tab.key);
  }, [tabs, errors]);

  // A failed save with errors only on tabs the user isn't looking at used to
  // look like "nothing happened" - jump to the first tab with an error.
  const lastErrorSignature = useRef("");
  useEffect(() => {
    const signature = Object.keys(errors ?? {}).sort().join(",");
    if (signature === lastErrorSignature.current) return;
    lastErrorSignature.current = signature;
    if (tabsWithErrors.length === 0) return;
    if (!tabsWithErrors.includes(activeKey)) {
      setActiveKey(tabsWithErrors[0]);
    }
    message.error("Please fix the highlighted fields before saving.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errors, tabsWithErrors]);

  return (
    <Tabs
      activeKey={activeKey}
      onChange={setActiveKey}
      items={tabs.map((tab) => ({
        key: tab.key,
        label: tabsWithErrors.includes(tab.key) ? <span style={{ color: "#ff4d4f" }}>{tab.label} •</span> : tab.label,
        children: tab.repeatable ? (
          <RepeatableTabPanel tab={tab} control={control} dynamicOptions={dynamicOptions} readOnly={readOnly} />
        ) : (
          <FlatTabPanel tab={tab} control={control} errors={errors} dynamicOptions={dynamicOptions} setValue={setValue} readOnly={readOnly} />
        ),
      }))}
    />
  );
}
