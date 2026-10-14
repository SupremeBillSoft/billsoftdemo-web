import axios from "axios";

// KEEP YOUR OWN VERSION OF THESE TWO LINES (the apiClient import path and ROOT)
// when you copy this file over your existing api.ts.
import { apiClient } from "../../lib/api-client";

import { normalizeJob, normalizeRunResponse, normalizeTemplate } from "./normalize";
import type {
  ExportJob,
  MasterMeta,
  ReportRequest,
  ReportTemplate,
  ReportTemplateInput,
  RunResponse,
} from "./types";

// If your client's baseURL does not already end with "/api", use "/api/reports" here.
const ROOT = "/reports";
const BASE = `${ROOT}/masters`;
const TEMPLATES = `${ROOT}/templates`;
const EXPORTS = `${ROOT}/exports`;

export const EXPORT_POLL_MS = 2000;
export const EXPORT_MAX_POLLS = 450; // 450 x 2s = 15 minutes

export async function fetchMasters(): Promise<MasterMeta[]> {
  const res = await apiClient.get<MasterMeta[]>(`${BASE}/`);
  return res.data;
}

export async function runReport(masterKey: string, request: ReportRequest): Promise<RunResponse> {
  const res = await apiClient.post<Record<string, unknown>>(`${BASE}/${masterKey}/run/`, request);
  return normalizeRunResponse(res.data);
}

/** With responseType "blob" an error body arrives as a Blob too; read the message out of it. */
async function blobAwareError(err: unknown): Promise<unknown> {
  if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
    const text = await err.response.data.text();
    let message = text;
    try {
      const parsed = JSON.parse(text) as { detail?: unknown };
      if (typeof parsed.detail === "string") message = parsed.detail;
    } catch {
      /* keep the raw text */
    }
    return new Error(message);
  }
  return err;
}

function filenameFrom(disposition: unknown, fallback: string): string {
  const match = /filename="?([^";]+)"?/i.exec(String(disposition ?? ""));
  return match?.[1] ?? fallback;
}

/** Direct download, for reports up to the server's sync_export_limit rows. */
export async function exportReport(
  masterKey: string,
  request: ReportRequest,
): Promise<{ blob: Blob; filename: string }> {
  try {
    const res = await apiClient.post<Blob>(`${BASE}/${masterKey}/export/`, request, { responseType: "blob" });
    return { blob: res.data, filename: filenameFrom(res.headers["content-disposition"], `${masterKey}_report.xlsx`) };
  } catch (err) {
    throw await blobAwareError(err);
  }
}

/** PDF of the same report. Also what Print uses, so a printout always matches the file. */
export async function exportReportPdf(
  masterKey: string,
  request: ReportRequest,
): Promise<{ blob: Blob; filename: string }> {
  try {
    const res = await apiClient.post<Blob>(`${BASE}/${masterKey}/export-pdf/`, request, { responseType: "blob" });
    return { blob: res.data, filename: filenameFrom(res.headers["content-disposition"], `${masterKey}_report.pdf`) };
  } catch (err) {
    throw await blobAwareError(err);
  }
}

/** Background export, for larger reports: start the job, poll it, then download the file. */
export async function startAsyncExport(masterKey: string, request: ReportRequest): Promise<ExportJob> {
  const res = await apiClient.post<Record<string, unknown>>(`${BASE}/${masterKey}/export-async/`, request);
  return normalizeJob(res.data);
}

export async function fetchExportJob(jobId: number): Promise<ExportJob> {
  const res = await apiClient.get<Record<string, unknown>>(`${EXPORTS}/${jobId}/`);
  return normalizeJob(res.data);
}

export async function downloadExportJob(jobId: number): Promise<{ blob: Blob; filename: string }> {
  try {
    const res = await apiClient.get<Blob>(`${EXPORTS}/${jobId}/download/`, { responseType: "blob" });
    return { blob: res.data, filename: filenameFrom(res.headers["content-disposition"], "report.xlsx") };
  } catch (err) {
    throw await blobAwareError(err);
  }
}

// ---- saved templates ----------------------------------------------------
export async function fetchTemplates(masterKey: string): Promise<ReportTemplate[]> {
  const res = await apiClient.get<Record<string, unknown>[]>(`${TEMPLATES}/`, { params: { master: masterKey } });
  return res.data.map(normalizeTemplate);
}

export async function createTemplate(input: ReportTemplateInput): Promise<ReportTemplate> {
  const res = await apiClient.post<Record<string, unknown>>(`${TEMPLATES}/`, input);
  return normalizeTemplate(res.data);
}

export async function updateTemplate(id: number, input: ReportTemplateInput): Promise<ReportTemplate> {
  const res = await apiClient.put<Record<string, unknown>>(`${TEMPLATES}/${id}/`, input);
  return normalizeTemplate(res.data);
}

export async function deleteTemplate(id: number): Promise<void> {
  await apiClient.delete(`${TEMPLATES}/${id}/`);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Opens the browser's print dialog for a PDF blob. Falls back to a new tab if the dialog cannot be opened. */
export function printBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  const cleanup = () => {
    frame.remove();
    URL.revokeObjectURL(url);
  };
  frame.onload = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(cleanup, 60_000); // keep it alive while the dialog is open
    } catch {
      window.open(url, "_blank");
      setTimeout(cleanup, 60_000);
    }
  };
  frame.src = url;
  document.body.appendChild(frame);
}

/** Turns DRF error bodies ({detail} or {field: [messages]}) into one readable string. */
export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data: unknown = err.response?.data;
    if (data && typeof data === "object") {
      const body = data as Record<string, unknown>;
      if (typeof body.detail === "string") return body.detail;
      const parts = Object.values(body)
        .flat()
        .map((v) => (typeof v === "string" ? v : JSON.stringify(v)));
      if (parts.length > 0) return parts.join(" ");
    }
    return err.message;
  }
  return err instanceof Error ? err.message : "Something went wrong";
}
