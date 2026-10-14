// src/features/sales/shared/ShipToFields.tsx
//
// "Ship to" block on challans and invoices. Blank = ship to the billing
// address. Can be filled from one of the customer's shipping addresses
// (Party Master > Shipping). The ship-to state matters: it is the place of
// supply for goods and decides the e-way bill limit.

import { Form, Input, Select } from "antd";
import { STATE_OPTIONS } from "../../../lib/states";
import { FORM_GRID } from "../../../components/CompactForm";
import type { CustomerParty } from "./components";

export interface ShipToValues {
  shipToName: string;
  shipToAddress1: string;
  shipToAddress2: string;
  shipToCity: string;
  shipToState: string;
  shipToPincode: string;
  shipToGstin: string;
}

export const EMPTY_SHIP_TO: ShipToValues = {
  shipToName: "",
  shipToAddress1: "",
  shipToAddress2: "",
  shipToCity: "",
  shipToState: "",
  shipToPincode: "",
  shipToGstin: "",
};

export function pickShipTo(doc: Partial<ShipToValues>): ShipToValues {
  return Object.fromEntries(
    Object.keys(EMPTY_SHIP_TO).map((k) => [k, (doc[k as keyof ShipToValues] as string) ?? ""])
  ) as unknown as ShipToValues;
}

type TextName = Exclude<keyof ShipToValues, "shipToState">;
type TextField = { name: TextName; label: string; span?: number };

// 3-column grid: name + GSTIN share a row, addresses run full width,
// then City / State / Pincode share the last row.
const TOP: TextField[] = [
  { name: "shipToName", label: "Ship To Name", span: 2 },  
  { name: "shipToAddress1", label: "Address 1", span: 2 },
  { name: "shipToAddress2", label: "Address 2", span: 2 },
  { name: "shipToGstin", label: "GSTIN" },
];

export function ShipToFields({
  value,
  onChange,
  customer,
  readOnly = false,
}: {
  value: ShipToValues;
  onChange: (next: ShipToValues) => void;
  customer?: CustomerParty;
  readOnly?: boolean;
}) {
  const addresses = customer?.shippingAddresses ?? [];

  function applyAddress(index: number | undefined) {
    if (index === undefined) {
      onChange(EMPTY_SHIP_TO);
      return;
    }
    const a = addresses[index];
    onChange({
      shipToName: a.shippingPartyName ?? "",
      shipToAddress1: a.shippingAddress1 ?? "",
      shipToAddress2: a.shippingAddress2 ?? "",
      shipToCity: a.shippingCity ?? "",
      shipToState: a.shippingState ?? "",
      shipToPincode: a.shippingPincode ?? "",
      shipToGstin: a.shippingGstNo ?? "",
    });
  }

  const textItem = ({ name, label, span }: TextField) => (
    <Form.Item key={name} label={label} style={span ? { gridColumn: `span ${span}` } : undefined}>
      <Input
        disabled={readOnly}
        value={value[name]}
        onChange={(e) => onChange({ ...value, [name]: name === "shipToGstin" ? e.target.value.toUpperCase() : e.target.value })}
      />
    </Form.Item>
  );

  return (
    <div style={FORM_GRID}>
      {!readOnly && (
        <Form.Item label="Ship To" style={{ gridColumn: "span 2" }}>
          <Select
            allowClear
            disabled={!addresses.length}
            placeholder={addresses.length ? "Same as billing address - or pick a shipping address" : "Same as billing address"}
            options={addresses.map((a, i) => ({
              value: i,
              label: [a.shippingPartyName, a.shippingCity, a.shippingState].filter(Boolean).join(", "),
            }))}
            onChange={applyAddress}
          />
        </Form.Item>
      )}
      {TOP.map(textItem)}

      {textItem({ name: "shipToCity", label: "City" })}
      <Form.Item label="State">
        <Select
          showSearch
          allowClear
          disabled={readOnly}
          value={value.shipToState || undefined}
          options={STATE_OPTIONS}
          onChange={(v) => onChange({ ...value, shipToState: v ?? "" })}
        />
      </Form.Item>
      {textItem({ name: "shipToPincode", label: "Pincode" })}
    </div>
  );
}
