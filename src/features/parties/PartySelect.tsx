// src/features/parties/PartySelect.tsx
import { Select } from "antd";
import { usePartyLookupQuery, type PartyKind, type PartyLookup } from "./api";

interface Props {
  kind: PartyKind;
  by: "code" | "name";
  value?: number | null;
  onChange: (id: number | undefined, party?: PartyLookup) => void;
  onBlur?: () => void;
  autoFocus?: boolean;
  disabled?: boolean;
  /** edit pages: label to show if the saved party is no longer in the list (e.g. made inactive) */
  fallbackLabel?: string;
}

export function PartySelect({ kind, by, value, onChange, onBlur, autoFocus, disabled, fallbackLabel }: Props) {
  const { data: parties = [], isLoading } = usePartyLookupQuery(kind);

  const options = parties.map((p) => ({
    value: p.id,
    label: by === "code" ? p.partyCode : p.partyName,
    search: `${p.partyCode} ${p.partyName}`,
  }));
  if (value != null && fallbackLabel && !parties.some((p) => p.id === value)) {
    options.unshift({ value, label: fallbackLabel, search: fallbackLabel });
  }

  return (
    <Select
      autoFocus={autoFocus}
      disabled={disabled}
      showSearch
      allowClear
      loading={isLoading}
      placeholder={by === "code" ? "Select code" : "Select name"}
      style={{ width: "100%" }}
      value={value ?? undefined}
      onChange={(v) => onChange(v ?? undefined, parties.find((p) => p.id === v))}
      onBlur={onBlur}
      options={options}
      filterOption={(input, opt) => String(opt?.search ?? "").toLowerCase().includes(input.toLowerCase())}
    />
  );
}

type FixedKind = Omit<React.ComponentProps<typeof PartySelect>, "kind">;
export const CustomerSelect = (p: FixedKind) => <PartySelect kind="customer" {...p} />;
export const VendorSelect = (p: FixedKind) => <PartySelect kind="vendor" {...p} />;