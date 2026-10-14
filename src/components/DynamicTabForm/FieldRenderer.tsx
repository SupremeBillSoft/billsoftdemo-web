// src/components/DynamicTabForm/FieldRenderer.tsx

import { Controller, get } from "react-hook-form";
import type { Control, FieldValues, FieldErrors, UseFormSetValue } from "react-hook-form";
import { Checkbox, Form, Input, InputNumber, Select } from "antd";
import { useState } from "react";
import type { FieldConfig } from "./types";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

export function FieldRenderer<T extends FieldValues>({
  field,
  control,
  errors,
  dynamicOptions,
  setValue
}: {
  field: FieldConfig<T>;
  control: Control<T>;
  errors: FieldErrors<T>;
  dynamicOptions?: Record<string, string[]>;
  setValue?: UseFormSetValue<T>;
}) {
  const [creatablePanelOpen, setCreatablePanelOpen] = useState(false);
  const [newOptionValue, setNewOptionValue] = useState("");
  const [addedOptions, setAddedOptions] = useState<string[]>([]);
  const errorMessage = get(errors, field.name)?.message as string | undefined;
  const resolvedOptions: string[] = field.optionsSource
    ? (dynamicOptions?.[field.optionsSource as string] ?? [])
    : field.options ?? [];

  const selectOptions = [...resolvedOptions, ...addedOptions];

  return (
    <Form.Item label={field.type === "checkbox" ? undefined : field.label} required={field.required} validateStatus={errorMessage ? "error" : ""} help={errorMessage}>
      <Controller
        name={field.name}
        control={control}
        render={({ field: f }) => {
          const control_ = (() => {
            if (field.type === "checkbox") {
              return (
                <Checkbox
                  checked={f.value}
                  onChange={(e) => f.onChange(e.target.checked)}
                  disabled={field.disabled}
                >
                  {field.label}
                </Checkbox>
              );
            }
            if (field.type === "number") {
              return <InputNumber {...f} size="large" style={{ width: "100%" }} disabled={field.disabled} />;
            }
            if (field.type === "select") {
              return (
                <Select
                  {...f}
                  size="large"
                  style={{ width: "100%" }}
                  options={selectOptions.map((v) => ({ value: v }))}
                  disabled={field.disabled}
                  onChange={(val) => {
                    f.onChange(val);
                    if (field.onSelect && setValue)
                      field.onSelect(val, setValue); // ← new
                  }}
                />
              );
            }
            if (field.type === "creatable-select") {
              return (
                <div>
                  <Select {...f} size="large" options={selectOptions.map((v) => ({ value: v }))} style={{ width: "100%" }} disabled={field.disabled} />
                  <a onClick={() => setCreatablePanelOpen((o) => !o)} style={{ fontSize: 12, display: "block", marginTop: 4 }}>
                    + Add new {field.label.toLowerCase()}
                  </a>
                  {creatablePanelOpen && (
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <Input
                        size="small"
                        value={newOptionValue}
                        onChange={(e) => setNewOptionValue(e.target.value)}
                        placeholder={`Type a new ${field.label}...`}
                        style={{ flex: 1 }}
                      />
                      
                        <a onClick={() => {
                          if (!newOptionValue.trim()) return;
                          setAddedOptions((opts) => [...opts, newOptionValue.trim()]);
                          f.onChange(newOptionValue.trim());
                          setNewOptionValue("");
                          setCreatablePanelOpen(false);
                        }}
                      >
                        Add
                      </a>
                    </div>
                  )}
                </div>
              );
            }
            return <Input {...f} size="large" style={{ width: "100%" }} disabled={field.disabled} />;
          })();
          
          return field.onAddNew ? (
            <div>
              {control_}
              <a onClick={field.onAddNew} style={{ fontSize: 12, display: "block", marginTop: 4 }}>
                + Add new {field.label.toLowerCase()}
              </a>
            </div>
          ) : (
            control_
          );
        }}

//         if {field.type === "radio" && (
//   <Radio.Group>
//     {field.options?.map((option) => (
//       <Radio key={option} value={option}>
//         {option}
//       </Radio>
//     ))}
//   </Radio.Group>
// )}
//   return <Input {...f} size="large" style={{ width: "100%" }} />;
      />
    

    </Form.Item>
  );
}