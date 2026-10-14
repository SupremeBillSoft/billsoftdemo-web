import { theme } from "antd";

export function LedgerDivider() {
  const { token } = theme.useToken();
  return (
    <div
      style={{
        height: 1,
        margin: "18px 0 22px",
        backgroundImage: `repeating-linear-gradient(90deg, ${token.colorBorderSecondary} 0 6px, transparent 6px 12px)`,
      }}
    />
  );
}