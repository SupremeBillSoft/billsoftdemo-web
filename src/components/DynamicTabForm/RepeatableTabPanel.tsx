// src/components/DynamicTabForm/RepeatableTabPanel.tsx
import { useState } from "react";
import { useFieldArray } from "react-hook-form";
import type {
  Control,
  FieldValues,
  ArrayPath,
  FieldArrayWithId,
} from "react-hook-form";
import { Button, Checkbox, Input, InputNumber, Select, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { RepeatableTabConfig, RowFieldConfig } from "./types";
import { theme } from "antd";

export function RepeatableTabPanel<T extends FieldValues>({
  tab,
  control,
  dynamicOptions,
  initialDraft,
  readOnly,
}: {
  tab: RepeatableTabConfig<T>;
  control: Control<T>;
  dynamicOptions?: Record<string, string[]>;
  initialDraft?: Record<string, unknown>;
  readOnly?: boolean;
}) {
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: tab.arrayFieldName as ArrayPath<T>,
  });
  type DraftRow = Parameters<typeof append>[0];
  type UpdateRow = Parameters<typeof update>[1];
  type Row_ = FieldArrayWithId<T, ArrayPath<T>>;
  const { token } = theme.useToken();

  function buildEmptyDraft(): Record<string, unknown> {
    return Object.fromEntries(tab.rowFields.map((f) => [f.name, f.type === "checkbox" ? false : ""]));
  }

  const [draft, setDraft] = useState<Record<string, unknown>>(() => ({ ...buildEmptyDraft(), ...(initialDraft ?? {}) }));
  const [draftErrors, setDraftErrors] = useState<Record<string, string>>({});

  // one-line: which committed row (if any) is currently loaded into the
  // entry fields for editing. null = normal "adding a new row" mode.
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  function updateDraftField(fieldName: string, value: unknown) {
    setDraft((prev) => ({ ...prev, [fieldName]: value }));
    if (draftErrors[fieldName])
      setDraftErrors((prev) => ({ ...prev, [fieldName]: "" }));
  }

  // one-line: clicking a committed row loads its values back into the entry
  // fields above — Option 1, as agreed. Field-array values already match
  // the row shape (post-validation), so they drop straight into draft.
  function startEdit(index: number) {
    const row = fields[index] as unknown as Record<string, unknown>;
    setDraft({ ...buildEmptyDraft(), ...row });
    setDraftErrors({});
    setEditingIndex(index);
  }

  function cancelEdit() {
    setDraft(buildEmptyDraft());
    setDraftErrors({});
    setEditingIndex(null);
  }

  function handleAdd() {
    const result = tab.rowSchema.safeParse(draft);
    if (!result.success) {
      // one-line: explicitly typed as Record<string, string[]> at the
      // extraction point, rather than trusting flatten()'s inferred type —
      // this is the actual robustness fix, independent of whatever Zod
      // version-specific inference quirk caused the original error.
      const rawFieldErrors = result.error.flatten().fieldErrors as Record<
        string,
        string[] | undefined
      >;
      const fieldErrors: Record<string, string> = {};
      for (const [key, messages] of Object.entries(rawFieldErrors)) {
        if (messages && messages.length > 0) fieldErrors[key] = messages[0];
      }
      setDraftErrors(fieldErrors);
      return;
    }
    if (editingIndex !== null) {
      // one-line: committing an edit — replace the row in place rather than
      // appending a duplicate. This is the actual fix for "can't edit an
      // already-added row," not just a cosmetic Add→Update label swap.
      update(editingIndex, result.data as unknown as UpdateRow);
    } else {
      append(result.data as unknown as DraftRow);
    }
    setDraft(buildEmptyDraft());
    setDraftErrors({});
    setEditingIndex(null);
  }

  function handleRemove(index: number) {
    remove(index);
    // one-line: if the row being removed is the one currently loaded for
    // editing, drop back to normal add-mode instead of leaving the entry
    // fields pointed at a row that no longer exists.
    if (editingIndex === index) cancelEdit();
    else if (editingIndex !== null && index < editingIndex) setEditingIndex(editingIndex - 1);
  }

  function renderDraftField(field: RowFieldConfig) {
    const value = draft[field.name];
    const errorMsg = draftErrors[field.name];
    const errorStyle = errorMsg ? { borderColor: token.colorError } : undefined;
    const resolvedOptions: string[] = field.optionsSource
      ? (dynamicOptions?.[field.optionsSource] ?? [])
      : (field.options ?? []);

    let control_: React.ReactNode;
    if (field.type === "checkbox") {
      control_ = (
        <Checkbox
          checked={!!value}
          onChange={(e) => updateDraftField(field.name, e.target.checked)}
        />
      );
    } else if (field.type === "number") {
      control_ = (
        <InputNumber
          style={{ width: "100%", ...errorStyle }}
          value={value as number | undefined}
          onChange={(v) => updateDraftField(field.name, v)}
        />
      );
    } else if (field.type === "select" || field.type === "creatable-select") {
      control_ = (
        <Select
          style={{ width: "100%" }}
          status={errorMsg ? "error" : undefined}
          value={value || undefined}
          options={resolvedOptions.map((o) => ({ value: o }))}
          onChange={(v) => updateDraftField(field.name, v)}
        />
      );
      return (
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              marginBottom: 5,
              color: token.colorTextSecondary,
            }}
          >
            {field.label}
            {field.required && (
              <span style={{ color: token.colorError, marginLeft: 2 }}>*</span>
            )}
          </div>
          {control_}
          {field.onAddNew && (
            <a
              onClick={field.onAddNew}
              style={{ fontSize: 11.5, display: "block", marginTop: 4 }}
            >
              + Add new {field.label.toLowerCase()}
            </a>
          )}
          <div
            style={{
              height: 17,
              fontSize: 11,
              color: token.colorError,
              marginTop: 3,
            }}
          >
            {errorMsg || ""}
          </div>
        </div>
      );
    } else {
      control_ = (
        <Input
          style={errorStyle}
          value={value as string | undefined}
          onChange={(e) => updateDraftField(field.name, e.target.value)}
        />
      );
    }

    return (
      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            marginBottom: 5,
            color: token.colorTextSecondary,
          }}
        >
          {field.label}
          {field.required && (
            <span style={{ color: token.colorError, marginLeft: 2 }}>*</span>
          )}
        </div>
        {control_}
        <div
          style={{
            height: 17,
            fontSize: 11,
            color: token.colorError,
            marginTop: 3,
          }}
        >
          {errorMsg || ""}
        </div>
      </div>
    );
  }

  // one-line: READ-ONLY MODE — summary table only, no entry row, no Add/
  // Update/Remove, no click-to-edit. Per your call: a pure view has nothing
  // to edit into, so none of the entry-row machinery below even renders.
  if (readOnly) {
    const readOnlyColumns: ColumnsType<Row_> = tab.summaryColumns.map(({ label, fieldName }) => ({
      title: label,
      dataIndex: fieldName,
      render: (value: unknown) => (value != null && value !== "" ? String(value) : "-"),
    }));
    return <Table<Row_> dataSource={fields} rowKey="id" pagination={false} columns={readOnlyColumns} />;
  }

  const columns: ColumnsType<Row_> = [
    ...tab.summaryColumns.map(({ label, fieldName }) => ({
      title: label,
      dataIndex: fieldName,
      render: (value: unknown) =>
        value != null && value !== "" ? String(value) : "-",
    })),
    {
      title: "",
      render: (_: unknown, __: Row_, index: number) => (
        <div style={{ display: "flex", gap: 12 }}>
          <a
            onClick={(e) => {
              e.stopPropagation(); // one-line: row itself is still clickable too; this just makes the action discoverable instead of relying on that alone
              startEdit(index);
            }}
          >
            Edit
          </a>
          <a
            onClick={(e) => {
              e.stopPropagation(); // one-line: keeps Remove from also triggering the row's onClick (which would re-open it for editing right after removing it)
              handleRemove(index);
            }}
          >
            Remove
          </a>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: `repeat(${tab.columns}, 1fr)`,
            gap: 12,
          }}
        >
          {tab.rowFields.map((field) => (
            <div key={field.name}>{renderDraftField(field)}</div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0, marginTop: 22 }}>
          <Button type="dashed" onClick={handleAdd}>
            {editingIndex !== null ? "Update" : "+ Add"}
          </Button>
          {editingIndex !== null && (
            <Button size="small" onClick={cancelEdit}>
              Cancel
            </Button>
          )}
        </div>
      </div>
      {editingIndex !== null && (
        <div style={{ fontSize: 12, color: token.colorPrimary, marginBottom: 8 }}>
          Editing row {editingIndex + 1} — update the fields above and click Update.
        </div>
      )}
      <Table<Row_>
        dataSource={fields}
        rowKey="id"
        pagination={false}
        columns={columns}
        onRow={(_, index) => ({
          onClick: () => {
            if (index !== undefined) startEdit(index);
          },
          style: { cursor: "pointer" },
        })}
        rowClassName={(_, index) => (index === editingIndex ? "party-repeatable-row-editing" : "")}
      />
    </div>
  );
}
