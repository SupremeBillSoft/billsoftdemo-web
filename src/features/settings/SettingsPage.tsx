// src/features/settings/SettingsPage.tsx

import { Tabs, Typography } from "antd";
import { LedgerDivider } from "../../components/LedgerDivider";
import { ProfileSettingsTab } from "./ProfileSettingsTab";
import { CompanySettingsTab } from "./CompanySettingsTab";
import { PlaceholderPage } from "../../components/PlaceholderPage";
import { DocNumberFormatListPage } from "../docNumberFormats/DocNumberFormatListPage";

const { Title } = Typography;

export function SettingsPage() {
  return (
    <div>
      <Title level={3} style={{ marginBottom: 0 }}>Settings</Title>
      <LedgerDivider />
      <Tabs
        items={[
          { key: "profile", label: "Profile", children: <ProfileSettingsTab /> },
          { key: "company", label: "Company Settings", children: <CompanySettingsTab /> },
          { key: "doc-numbering", label: "Document Numbering", children: <DocNumberFormatListPage /> },
          { key: "invoice", label: "Invoice Settings", children: <PlaceholderPage title="Invoice Settings" /> },
          { key: "print", label: "Print Settings", children: <PlaceholderPage title="Print Settings" /> },
        ]}
      />
    </div>
  );
}