import type { BusinessHeader, CellValue, ExportJob, ReportRow, ReportTemplate, RunResponse } from "./types";

/**
 * The report API speaks snake_case ("party_code", "page_size"). Many React apps add an
 * axios interceptor that turns every response key into camelCase ("partyCode", "pageSize").
 * Then a column such as party_code is looked up under the wrong name and shows blank, while
 * one-word columns (city, state, status) still work. These helpers accept either spelling,
 * so the report screen works with or without such an interceptor.
 */
type Raw = Record<string, unknown>;

const toCamel = (s: string) => s.replace(/_([a-z0-9])/g, (_m, c: string) => c.toUpperCase());

/** Read a snake_case key, falling back to its camelCase spelling. */
export function pick(obj: Raw, snake: string): unknown {
  return snake in obj ? obj[snake] : obj[toCamel(snake)];
}

export function normalizeRunResponse(raw: Raw): RunResponse {
  // column keys are VALUES inside the response, so they are never renamed by a key-converting interceptor
  const columns = (raw.columns ?? []) as RunResponse["columns"];
  const rawRows = (raw.results ?? []) as Raw[];
  const results: ReportRow[] = rawRows.map((rawRow) => {
    const row: ReportRow = {};
    for (const col of columns) row[col.key] = (pick(rawRow, col.key) ?? null) as CellValue;
    return row;
  });

  return {
    master: raw.master as string,
    label: raw.label as string,
    columns,
    business: (raw.business ?? null) as BusinessHeader | null,
    count: raw.count as number,
    page: raw.page as number,
    page_size: pick(raw, "page_size") as number,
    sync_export_limit: (pick(raw, "sync_export_limit") as number | undefined) ?? 20000,
    results,
  };
}

export function normalizeTemplate(raw: Raw): ReportTemplate {
  return {
    
    id: raw.id as number,
    master_key: pick(raw, "master_key") as string,
    name: raw.name as string,
    columns: (raw.columns ?? []) as string[],
    conditions: (raw.conditions ?? []) as ReportTemplate["conditions"],
    logic: raw.logic as ReportTemplate["logic"],
    show_business_header: pick(raw, "show_business_header") !== false,
    show_serial_no: pick(raw, "show_serial_no") !== false,
    show_parent_once: pick(raw, "show_parent_once") !== false,
    is_shared: pick(raw, "is_shared") === true,
    owner: (raw.owner ?? "") as string,
    created_at: (pick(raw, "created_at") ?? "") as string,
    updated_at: (pick(raw, "updated_at") ?? "") as string,
  };
}

export function normalizeJob(raw: Raw): ExportJob {
  return {
    id: raw.id as number,
    master_key: pick(raw, "master_key") as string,
    status: raw.status as ExportJob["status"],
    row_count: (pick(raw, "row_count") ?? null) as number | null,
    file_name: (pick(raw, "file_name") ?? "") as string,
    error: (raw.error ?? "") as string,
    created_at: (pick(raw, "created_at") ?? "") as string,
    started_at: (pick(raw, "started_at") ?? null) as string | null,
    finished_at: (pick(raw, "finished_at") ?? null) as string | null,
  };
}
