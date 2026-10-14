// src/components/DynamicTabForm/FlatTabPanel.tsx

import { useWatch } from "react-hook-form";
import type { Control, FieldValues, FieldErrors, UseFormSetValue } from "react-hook-form";
import { Row, Col } from "antd";
import { FieldRenderer } from "./FieldRenderer";
import type { FlatTabConfig } from "./types";

// one-line: extracted into its own component specifically so useWatch (a
// hook) can be called safely — it can't live inline inside DynamicTabForm's
// .map() over tabs, since that callback isn't itself a component.
export function FlatTabPanel<T extends FieldValues>({
  tab,
  control,
  errors,
  dynamicOptions,
  setValue,
  readOnly,
}: {
  tab: FlatTabConfig<T>;
  control: Control<T>;
  errors: FieldErrors<T>;
  dynamicOptions?: Record<string, string[]>;
  setValue?: UseFormSetValue<T>;
  readOnly?: boolean;
}) {
  const watched = useWatch({ control }); // whole-form watch — fine at this field count; scope to specific names if a tab ever gets huge

  const visibleFields = tab.fields.filter((f) => !f.showWhen || (watched as Record<string, unknown>)[f.showWhen.field as string] === f.showWhen.equals);

  return (
    <div>
      <Row gutter={24}>
        {visibleFields.map((f) => (
          <Col span={6} key={f.name as string}>
            <FieldRenderer
              field={readOnly ? { ...f, disabled: true, onAddNew: undefined } : f}
              control={control}
              errors={errors}
              dynamicOptions={dynamicOptions}
              setValue={setValue}
            />
          </Col>
        ))}
      </Row>
      {tab.renderFooter?.(control)}
    </div>
  );
}
