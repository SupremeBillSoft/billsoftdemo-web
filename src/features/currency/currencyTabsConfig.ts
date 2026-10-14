import type { TabConfig } from "../../components/DynamicTabForm/types";
import type { CurrencyFormInput } from "./schema";
import { CURRENCY_OPTIONS } from "./CurrencyOptions";

export const currencyTabsConfig: TabConfig<CurrencyFormInput>[] = [
  {
    key: "general", label: "Currency Details",
    fields: [
      {
        name: "currencyCode", label: "Currency", type: "select", required: true,
        options: CURRENCY_OPTIONS.map((c) => c.currencyCode),
        onSelect: (value, setValue) => {
          const opt = CURRENCY_OPTIONS.find((c) => c.currencyCode === value);
          if (!opt) return;
          setValue("currencyName", opt.currencyName);
          setValue("symbol", opt.symbol);
          setValue("majorUnitName", opt.majorUnitName);
          setValue("majorUnitNamePlural", opt.majorUnitNamePlural);
          setValue("minorUnitName", opt.minorUnitName);
          setValue("minorUnitNamePlural", opt.minorUnitNamePlural);
          setValue("decimalPlaces", opt.decimalPlaces);
        },
      },
      { name: "currencyName", label: "Currency Name", type: "text", required: true, disabled: true },
      { name: "symbol", label: "Symbol", type: "text", required: true, disabled: true },
      { name: "majorUnitName", label: "Major Unit (e.g. Rupees)", type: "text", required: true, disabled: true },
      { name: "minorUnitName", label: "Minor Unit (e.g. Paise)", type: "text", disabled: true },
      { name: "decimalPlaces", label: "Decimal Places", type: "number", required: true, disabled: true },
      { name: "symbolPosition", label: "Symbol Position", type: "select", required: true, options: ["Prefix", "Suffix"] },
      { name: "status", label: "Status", type: "select", required: true, options: ["Active", "Inactive"] },
    ],
  },
];