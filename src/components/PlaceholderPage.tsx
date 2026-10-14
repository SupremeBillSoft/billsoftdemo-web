// src/components/PlaceholderPage.tsx

import { Typography } from "antd";
const { Title, Text } = Typography;

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <Title level={4}>{title}</Title>
      <Text type="secondary">This screen isn't built yet.</Text>
    </div>
  );
}