// src/features/sales/shared/DocumentTotals.tsx
//
// Footer of every priced sales document: price-includes-tax, document
// discount (before / after tax), additional charges with their own tax,
// adjustment, round-off and the running totals (from pricing.ts).

import { Button, Checkbox, Input, InputNumber, Radio, Select, Switch } from "antd";
import type { LineTaxContext } from "../../../lib/gst/lineTax";
import type { DocumentTotals as Totals, PricedChargeResult } from "./pricing";
import type { AdditionalCharge, DiscountType } from "./types";

export interface DocumentPricingValues {
  priceIncludesTax: boolean;
  docDiscountType: DiscountType;
  docDiscountValue: number | string;
  docDiscountBeforeTax: boolean;
  roundOffEnabled: boolean;
  adjustmentAmount: number | string;
  charges: AdditionalCharge[];
}

const money = (n?: number) => (n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Row({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontWeight: strong ? 700 : 400, fontSize: strong ? 16 : 13 }}>
      <span>{label}</span>
      <span>{money(value)}</span>
    </div>
  );
}

export function DocumentTotalsPanel({
  value,
  onChange,
  totals,
  pricedCharges,
  taxContext,
  readOnly = false,
}: {
  value: DocumentPricingValues;
  onChange: (changes: Partial<DocumentPricingValues>) => void;
  totals: Totals;
  pricedCharges: PricedChargeResult[];
  taxContext: LineTaxContext;
  readOnly?: boolean;
}) {
  const charges = value.charges ?? [];

  function patchCharge(index: number, changes: Partial<AdditionalCharge>) {
    onChange({ charges: charges.map((c, i) => (i === index ? { ...c, ...changes } : c)) });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 32, marginTop: 16 }}>
      <div>
        <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Switch
              size="small"
              disabled={readOnly}
              checked={value.priceIncludesTax}
              onChange={(v) => onChange({ priceIncludesTax: v })}
            />
            Rates include tax
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Switch
              size="small"
              disabled={readOnly}
              checked={value.roundOffEnabled}
              onChange={(v) => onChange({ roundOffEnabled: v })}
            />
            Round off
          </label>
        </div>

        <div style={{ fontWeight: 600, marginBottom: 6 }}>Document Discount</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
          <Radio.Group
            disabled={readOnly}
            value={value.docDiscountType}
            onChange={(e) => onChange({ docDiscountType: e.target.value })}
            options={[
              { value: "Percent", label: "%" },
              { value: "Amount", label: "₹" },
            ]}
            optionType="button"
            size="small"
          />
          <InputNumber
            disabled={readOnly}
            min={0}
            max={value.docDiscountType === "Percent" ? 100 : undefined}
            value={Number(value.docDiscountValue ?? 0)}
            onChange={(v) => onChange({ docDiscountValue: v ?? 0 })}
          />
          <Checkbox
            disabled={readOnly}
            checked={value.docDiscountBeforeTax}
            onChange={(e) => onChange({ docDiscountBeforeTax: e.target.checked })}
          >
            Apply before tax
          </Checkbox>
        </div>

        <div style={{ fontWeight: 600, marginBottom: 6 }}>Additional Charges</div>
        {charges.map((charge, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <Input
              style={{ width: 200 }}
              disabled={readOnly}
              placeholder="Charge name (e.g. Freight)"
              value={charge.name}
              onChange={(e) => patchCharge(i, { name: e.target.value })}
            />
            <InputNumber
              style={{ width: 120 }}
              disabled={readOnly}
              min={0}
              value={Number(charge.amount ?? 0)}
              onChange={(v) => patchCharge(i, { amount: v ?? 0 })}
            />
            <Select
              style={{ width: 130 }}
              disabled={readOnly}
              allowClear
              placeholder="No tax"
              value={charge.tax ?? undefined}
              options={taxContext.taxOptions}
              onChange={(v) => patchCharge(i, { tax: v ?? null })}
            />
            <span style={{ width: 90, textAlign: "right" }}>{money(pricedCharges[i]?.total)}</span>
            {!readOnly && <a onClick={() => onChange({ charges: charges.filter((_, j) => j !== i) })}>Remove</a>}
          </div>
        ))}
        {!readOnly && (
          <Button size="small" type="dashed" onClick={() => onChange({ charges: [...charges, { name: "", amount: 0, tax: null }] })}>
            + Add Another Charge
          </Button>
        )}

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 16 }}>
          <span style={{ fontWeight: 600 }}>Adjustment (+/-)</span>
          <InputNumber
            disabled={readOnly}
            value={Number(value.adjustmentAmount ?? 0)}
            onChange={(v) => onChange({ adjustmentAmount: v ?? 0 })}
          />
        </div>
      </div>

      <div style={{ border: "1px solid #E4E1DA", borderRadius: 8, padding: 16, alignSelf: "start" }}>
        <Row label="Taxable Value" value={totals.totalTaxable} />
        <Row label="CGST" value={totals.totalCgst} />
        <Row label="SGST" value={totals.totalSgst} />
        <Row label="IGST" value={totals.totalIgst} />
        {totals.totalCess > 0 && <Row label="Cess" value={totals.totalCess} />}
        {totals.totalCharges > 0 && <Row label="Charges (incl. tax)" value={totals.totalCharges} />}
        {totals.docDiscountAmount > 0 && (
          <Row label={`Discount (${value.docDiscountBeforeTax ? "before" : "after"} tax)`} value={-totals.docDiscountAmount} />
        )}
        {Number(value.adjustmentAmount) !== 0 && <Row label="Adjustment" value={Number(value.adjustmentAmount)} />}
        {value.roundOffEnabled && <Row label="Round Off" value={totals.roundOffAmount} />}
        <div style={{ borderTop: "1px solid #E4E1DA", marginTop: 6, paddingTop: 6 }}>
          <Row label="Net Amount" value={totals.netAmount} strong />
        </div>
      </div>
    </div>
  );
}
