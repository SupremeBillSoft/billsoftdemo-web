import { Controller } from "react-hook-form";
import type { Control } from "react-hook-form";
import { Upload, Button, Typography } from "antd";
import {
  UploadOutlined,
  PaperClipOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import type { UploadProps } from "antd";
import type { PartyFormInput } from "./schema";
import { theme } from "antd";

const { Text } = Typography;

export function PartyAttachmentUpload({
  control,
}: {
  control: Control<PartyFormInput>;
}) {
  const { token } = theme.useToken();
  return (
    <Controller
      name="attachmentFileName"
      control={control}
      render={({ field }) => {
        const props: UploadProps = {
          showUploadList: false,
          beforeUpload: (file) => {
            field.onChange(file.name);
            return false;
          },
        };

        return (
          <div>
            <Upload {...props}>
              <Button icon={<UploadOutlined />}>Attach File</Button>
            </Upload>
            {field.value && (
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <PaperClipOutlined style={{ color: token.colorTextSecondary }} />
                <Text>{field.value}</Text>
                <CloseCircleOutlined
                  style={{
                    color: token.colorTextSecondary,
                    cursor: "pointer",
                    marginLeft: 4,
                  }}
                  onClick={() => field.onChange(undefined)}
                />
              </div>
            )}
          </div>
        );
      }}
    />
  );
}
