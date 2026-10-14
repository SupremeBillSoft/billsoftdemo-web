// src/lib/date.ts

export const DISPLAY_DATE_FORMAT = "DD/MM/YYYY";

// one-line: converts a stored ISO string ("2026-08-17") to the display
// format for table cells — DatePicker components handle their OWN display
// via the `format` prop below, this helper is specifically for read-only
// rendering (table columns, the PR items modal, etc.)
export function formatDisplayDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "-";
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}