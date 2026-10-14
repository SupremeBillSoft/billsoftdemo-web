// src/config/navigation.tsx

import type { ReactNode } from "react";
import {
  DashboardOutlined, TeamOutlined, TagsOutlined,
  ShoppingOutlined, AccountBookOutlined, InboxOutlined, BarChartOutlined,
  SettingOutlined, LogoutOutlined,
} from "@ant-design/icons";

export interface NavItem {
  key: string;
  label: string;
  icon?: ReactNode;
  path?: string;
  action?: "logout"; 
  children?: NavItem[];
}

export const navigationConfig: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: <DashboardOutlined />, path: "/" },
  {
    key: "master", label: "Master", icon: <TeamOutlined />,
    children: [
      { key: "party-master", label: "Party Master", path: "/parties" },
      { key: "item-master", label: "Item Master", path: "/items" },
      { key: "unit-master", label: "Unit Master", path:"/uom" },
      { key: "tax-master", label: "Tax Master", path: "/tax" },
      { key: "bank-master", label: "Bank Master", path: "/bank" },
      { key: "currency-master", label: "Currency Master", path: "/currency" },
      { key: "hsn-master", label: "HSN Master", path: "/hsn" },
      { key: "branch-master", label: "Branch Master", path: "/branch" }
    ],
  },
  {
    key: "sales", label: "Sales & Marketing", icon: <TagsOutlined />,
    children: [
      { key: "enquiry", label: "Enquiry", path: "/enquiry" },
      { key: "quotation", label: "Quotation / Estimate", path: "/sales/quotation" },
      { key: "sale-order", label: "Sale Order", path: "/sales/sale-order" },
      { key: "delivery-challan", label: "Delivery Challan", path: "/sales/delivery-challan" },
      { key: "invoice", label: "Invoice", path: "/sales/invoice" },
      { key: "e-invoice", label: "E-Invoice", path: "/sales/e-invoice" },
      { key: "eway-bill", label: "E-Way Bill", path: "/sales/eway-bill" },
      { key: "sales-return", label: "Sales Return", path: "/sales/return" },
      { key: "credit-note", label: "Credit Note", path: "/sales/credit-note" },
    ],
  },
  {
    key: "purchase", label: "Purchase", icon: <ShoppingOutlined />,
    children: [
      { key: "pr", label: "Purchase Requisition", path: "/purchase/requisition" },
      { key: "pr-approval", label: "PR Approval", path: "/purchase/requisition-approval" },
      { key: "po", label: "Purchase Order", path: "/purchase/order" },
      { key: "po-approval", label: "PO Approval", path: "/purchase/order-approval" },
      { key: "purchase-invoice", label: "Purchase Invoice", path: "/purchase/invoice" },
      { key: "purchase-return", label: "Purchase Return", path: "/purchase/return" },
      { key: "debit-note", label: "Debit Note", path: "/purchase/debit-note" },
    ],
  },
  {
    key: "accounting", label: "Accounting Process", icon: <AccountBookOutlined />,
    children: [
      { key: "opening-balance", label: "Opening Balance", path: "/accounting/opening-balance" },
      { key: "payment-collection", label: "Payment Collection", path: "/accounting/payment-collection" },
      { key: "payment-advice", label: "Payment Advice", path: "/accounting/payment-advice" },
      { key: "voucher-entry", label: "Voucher Entry", path: "/accounting/voucher-entry" },
      { key: "advance-amount", label: "Advance Amount", path: "/accounting/advance-amount" },
      { key: "general-ledger", label: "General Ledger", path: "/accounting/ledger" },
      { key: "assets", label: "Assets", path: "/accounting/assets" },
      { key: "journal-entry", label: "Journal Entry", path: "/accounting/journal" },
    ],
  },
  {
    key: "inventory", label: "Inventory", icon: <InboxOutlined />,
    children: [
      { key: "godown", label: "Godowns & Stock", path: "/inventory/godown" },
      { key: "stock-transfer", label: "Stock Transfer", path: "/inventory/stock-transfer" },
    ],
  },
  {
    key: "reports", label: "Reports", icon: <BarChartOutlined />,
    children: [
      { key: "sales-turnover", label: "Sales Turnover", path: "/reports/sales-turnover" },
      { key: "purchase-turnover", label: "Purchase Turnover", path: "/reports/purchase-turnover" },
      { key: "despatch-register", label: "Despatch Register", path: "/reports/despatch-register" },
      { key: "master-reports", label: "Master Reports", path: "/master-reports" },
    ],
  },
  { key: "settings", label: "Settings", icon: <SettingOutlined />, path: "/settings" },
  { key: "logout", label: "Logout", icon: <LogoutOutlined />, action: "logout" }, // one-line: no path — AppLayout intercepts this key instead of navigating
];

export function flattenRoutes(items: NavItem[]): { path: string; label: string }[] {
  const out: { path: string; label: string }[] = [];
  for (const item of items) {
    if (item.children) {
      out.push(...flattenRoutes(item.children));
    } else if (item.path) {
      out.push({ path: item.path, label: item.label });
    }
  }
  return out;
}