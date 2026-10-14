// src/features/parties/PartyExcelUpload.tsx

import { Button, Upload, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";

const MAX_SIZE_BYTES = 100 * 1024; // one-line: exact limit from the requirement — 100KB, not 100KB-ish

export function PartyExcelUpload() {
  const props: UploadProps = {
    accept: ".xlsx,.xls",
    showUploadList: false,
    beforeUpload: (file) => {
      if (file.size > MAX_SIZE_BYTES) {
        message.error("File size exceeds the maximum limit of 100 KB."); // one-line: exact copy from the requirement
        return Upload.LIST_IGNORE; // one-line: rejects the file — antd never attempts the "upload"
      }
      // STUB: real parse/import call goes here once the backend exists
      message.success(`${file.name} accepted — import wiring pending backend.`);
      return false; // prevents antd's default auto-upload POST, which has nowhere to go yet
    },
  };

  return (
    <Upload {...props}>
      <Button icon={<UploadOutlined />}>Upload</Button>
    </Upload>
  );
}