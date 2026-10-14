// src/features/currency/currencyOptions.ts

export interface CurrencyOption {
  currencyCode: string;
  currencyName: string;
  symbol: string;
  majorUnitName: string;
  majorUnitNamePlural: string;
  minorUnitName: string;
  minorUnitNamePlural: string;
  decimalPlaces: number;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { currencyCode: "INR", currencyName: "Indian Rupee", symbol: "₹", majorUnitName: "Rupee", majorUnitNamePlural: "Rupees", minorUnitName: "Paisa", minorUnitNamePlural: "Paise", decimalPlaces: 2 },
  { currencyCode: "USD", currencyName: "US Dollar", symbol: "$", majorUnitName: "Dollar", majorUnitNamePlural: "Dollars", minorUnitName: "Cent", minorUnitNamePlural: "Cents", decimalPlaces: 2 },
  { currencyCode: "EUR", currencyName: "Euro", symbol: "€", majorUnitName: "Euro", majorUnitNamePlural: "Euros", minorUnitName: "Cent", minorUnitNamePlural: "Cents", decimalPlaces: 2 },
  { currencyCode: "GBP", currencyName: "British Pound", symbol: "£", majorUnitName: "Pound", majorUnitNamePlural: "Pounds", minorUnitName: "Pence", minorUnitNamePlural: "Pence", decimalPlaces: 2 },
  { currencyCode: "AED", currencyName: "UAE Dirham", symbol: "AED", majorUnitName: "Dirham", majorUnitNamePlural: "Dirhams", minorUnitName: "Fils", minorUnitNamePlural: "Fils", decimalPlaces: 2 },
  { currencyCode: "KWD", currencyName: "Kuwaiti Dinar", symbol: "KD", majorUnitName: "Dinar", majorUnitNamePlural: "Dinars", minorUnitName: "Fils", minorUnitNamePlural: "Fils", decimalPlaces: 3 },
  { currencyCode: "JPY", currencyName: "Japanese Yen", symbol: "¥", majorUnitName: "Yen", majorUnitNamePlural: "Yen", minorUnitName: "", minorUnitNamePlural: "", decimalPlaces: 0 },
  { currencyCode: "SGD", currencyName: "Singapore Dollar", symbol: "S$", majorUnitName: "Dollar", majorUnitNamePlural: "Dollars", minorUnitName: "Cent", minorUnitNamePlural: "Cents", decimalPlaces: 2 },
];