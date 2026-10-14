// src/components/DynamicTabForm/types.ts

import type {
  Control,
  FieldPath,
  FieldValues,
  ArrayPath,
  FieldErrors,
  UseFormSetValue,
} from "react-hook-form";
import type { ZodTypeAny } from "zod";
import type { ReactNode } from "react";

type FieldType = "text" | "number" | "select" | "checkbox" | "creatable-select" | "date" | "radio" | "time" ;

export interface FieldConfig<T extends FieldValues> {
  name: FieldPath<T>;
  label: string;
  type: FieldType;
  required?: boolean;
  disabled?: boolean;
  options?: string[];
  optionsSource?: string;
  onAddNew?: () => void;
  showWhen?: { field: FieldPath<T>; equals: string };
  onSelect?: (value: string, setValue: UseFormSetValue<T>) => void;
  onCreateOption?: (value: string) => void | Promise<void>;
}

export interface RowFieldConfig {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  optionsSource?: string;
  onAddNew?: () => void;
  disabled?: boolean;
  onCreateOption?: (value: string) => void | Promise<void>;
}

export interface FlatTabConfig<T extends FieldValues> {
  key: string;
  label: string;
  repeatable?: false;
  fields: FieldConfig<T>[];
  // one-line: optional trailing content rendered after the fields grid —
  // Custom Fields uses this to embed a repeatable SECTION inside an
  // otherwise-flat tab, without forcing the whole tab to be "repeatable."
  // Generic on purpose: any future flat tab can use this for its own reasons.
  renderFooter?: (control: Control<T>) => ReactNode;
  // Extra form fields whose validation errors belong to this tab (e.g. the
  // custom fields rendered by renderFooter), so a failed save can jump here.
  errorFields?: string[];
}

export interface RepeatableTabConfig<T extends FieldValues> {
  key: string;
  label: string;
  repeatable: true;
  arrayFieldName: ArrayPath<T>;
  columns: number;
  rowFields: RowFieldConfig[];
  summaryColumns: { label: string; fieldName: string }[];
  rowSchema: ZodTypeAny;
}

export type TabConfig<T extends FieldValues> =
  | FlatTabConfig<T>
  | RepeatableTabConfig<T>;

export interface DynamicTabFormProps<T extends FieldValues> {
  tabs: TabConfig<T>[];
  control: Control<T>;
  errors: FieldErrors<T>;
  setValue?: UseFormSetValue<T>;
  dynamicOptions?: Record<string, string[]>;
  initialDraftByArrayField?: Record<string, Record<string, unknown>>;
  defaultActiveTabKey?: string; // one-line: opens on a specific tab once, on mount — for "land back on Item Details," not a fully controlled active-tab system
  readOnly?: boolean;
}
