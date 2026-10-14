// src/features/settings/ProfileSettingsTab.tsx

import { Radio, Select, Typography, Space } from "antd";
import { useThemeStore } from "../../store/themeStore";

const { Title, Text } = Typography;

export function ProfileSettingsTab() {
  const mode = useThemeStore((s) => s.mode);
  const palette = useThemeStore((s) => s.palette);
  const setMode = useThemeStore((s) => s.setMode);
  const setPalette = useThemeStore((s) => s.setPalette);

  return (
    <Space direction="vertical" size={24} style={{ width: "100%", maxWidth: 420 }}>
      <div>
        <Title level={5}>Theme Mode</Title>
        <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)}>
          <Radio.Button value="light">Light</Radio.Button>
          <Radio.Button value="medium">Medium</Radio.Button>
          <Radio.Button value="dark">Dark</Radio.Button>
        </Radio.Group>
      </div>

      <div>
        <Title level={5}>Color Palette</Title>
        <Select
          value={palette}
          onChange={setPalette}
          style={{ width: 240 }}
          options={[
            { value: "indigo-coral", label: "Indigo & Coral" },
            { value: "charcoal-blue", label: "Charcoal & Blue" },
          ]}
        />
        <div><Text type="secondary" style={{ fontSize: 12 }}>Applies immediately across the app.</Text></div>
      </div>
    </Space>
  );
}