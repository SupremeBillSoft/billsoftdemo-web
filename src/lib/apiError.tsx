// src/lib/apiError.tsx

import axios from "axios";
import { Modal } from "antd";

// one-line: turns whatever the backend sent back (DRF-style `detail`, a
// field -> [messages] map, a plain list or string) into readable text, so
// every master shows the server's actual reason instead of a generic one.
export function getApiErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (!axios.isAxiosError(error)) return error instanceof Error ? error.message : fallback;
  if (!error.response) return error.code === "ECONNABORTED" ? "The server took too long to respond." : "Unable to reach the server. Check your connection.";

  const data = error.response.data as unknown;
  if (typeof data === "string" && data.trim() && !data.trim().startsWith("<")) return data;
  if (Array.isArray(data)) return data.map(String).join("\n");
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (typeof obj.detail === "string") return obj.detail;
    const lines = Object.entries(obj).map(([field, msgs]) => {
      const text = Array.isArray(msgs) ? msgs.join(" ") : String(msgs);
      return field === "non_field_errors" ? text : `${field}: ${text}`;
    });
    if (lines.length) return lines.join("\n");
  }
  return `${fallback} (HTTP ${error.response.status})`;
}

export function showApiErrorPopup(title: string, error: unknown, onOk?: () => void) {
  Modal.error({
    title,
    content: <div style={{ whiteSpace: "pre-line" }}>{getApiErrorMessage(error)}</div>,
    centered: true,
    onOk,
  });
}
