// src/components/CompactForm.tsx   (any shared folder is fine - adjust the import path)
//
// Drop-in replacement for antd <Form layout="vertical">:
//   - label sits beside the input (fixed label width) instead of above it
//   - tighter space between fields and around section dividers
//   - labels 13px; colours and font family untouched
// Use FORM_GRID for the field grids (3 columns; use gridColumn: "span 2" for wide fields).

import type { CSSProperties } from "react";
import { ConfigProvider, Form, type FormProps } from "antd";

export const FORM_GRID: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  columnGap: 32,
};

export function CompactForm<T = unknown>({ children, ...rest }: FormProps<T>) {
  return (
    <ConfigProvider
      theme={{
        token: { marginLG: 12 },
        components: {
          Form: {
            itemMarginBottom: 12,
            labelFontSize: 13,
          },
        },
      }}
    >
      <Form<T>
        layout="horizontal"
        labelAlign="left"
        labelWrap
        colon={false}
        labelCol={{ flex: "130px" }}
        wrapperCol={{ flex: "auto", style: { minWidth: 0 } }}
        {...rest}
      >
        {children as never}
      </Form>
    </ConfigProvider>
  );
}
