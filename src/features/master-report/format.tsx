import { Tag } from "antd";
import type { ReactNode } from "react";

import type { CellValue, ColType, Operator } from "./types";

export function formatCell(value: CellValue, type: ColType): ReactNode {
  if (value === null || value === undefined || value === "") return "";
  switch (type) {
    case "bool":
      return <Tag color={value ? "green" : "default"}>{value ? "Yes" : "No"}</Tag>;
    case "number":
      return typeof value === "number" ? value.toLocaleString("en-IN", { maximumFractionDigits: 4 }) : String(value);
    case "date":
      return new Date(`${String(value)}T00:00:00`).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    case "datetime":
      return new Date(String(value)).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    default:
      return String(value);
  }
}

const OP_LABELS: Record<Operator, string> = {
  eq: "equals",
  ne: "does not equal",
  gt: "greater than",
  gte: "greater than or equal",
  lt: "less than",
  lte: "less than or equal",
  contains: "contains",
  startswith: "starts with",
};

const DATE_OP_LABELS: Partial<Record<Operator, string>> = {
  eq: "on",
  ne: "not on",
  gt: "after",
  gte: "on or after",
  lt: "before",
  lte: "on or before",
};

export function operatorLabel(type: ColType, op: Operator): string {
  if (type === "date" || type === "datetime") return DATE_OP_LABELS[op] ?? OP_LABELS[op];
  return OP_LABELS[op];
}
