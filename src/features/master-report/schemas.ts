import { z } from "zod";

import type { ColType, Condition, ConditionPayload, Logic, MasterMeta, ReportRequest } from "./types";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");

/** Zod schema for the value of a condition, chosen by the column's type. */
function valueSchema(type: ColType) {
  switch (type) {
    case "number":
      return z
        .string()
        .trim()
        .min(1, "Enter a number")
        .refine((v) => Number.isFinite(Number(v)), "Enter a valid number");
    case "bool":
      return z.boolean();
    case "date":
    case "datetime":
      return dateString;
    default:
      return z.string().trim().min(1, "Enter a value");
  }
}

export interface BuiltRequest {
  request: ReportRequest;
  /** Incomplete or invalid filter rows that were left out of the request. */
  ignored: number;
}

interface BuildArgs {
  master: MasterMeta;
  columns: string[];
  conditions: Condition[];
  logic: Logic;
  page?: number;
  pageSize?: number;
}

/**
 * Turns the UI selection into the API request. A half-filled filter row (no
 * value yet) is skipped instead of blocking the preview; `ignored` says how many.
 */
export function buildRequest({ master, columns, conditions, logic, page, pageSize }: BuildArgs): BuiltRequest {
  const validColumns = columns.filter((key) => master.columns.some((c) => c.key === key));

  const payload: ConditionPayload[] = [];
  let ignored = 0;
  for (const cond of conditions) {
    const col = master.columns.find((c) => c.key === cond.column);
    if (!col || !col.filterable || !col.operators.includes(cond.op)) {
      ignored += 1;
      continue;
    }
    const parsed = valueSchema(col.type).safeParse(cond.value);
    if (!parsed.success) {
      ignored += 1;
      continue;
    }
    const raw = parsed.data as string | boolean;
    const value = col.type === "number" ? Number(raw) : raw;
    payload.push({ column: col.key, op: cond.op, value });
  }

  return {
    request: { columns: validColumns, conditions: payload, logic, page, page_size: pageSize },
    ignored,
  };
}
