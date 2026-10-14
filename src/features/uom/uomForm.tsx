// src/features/uom/UomForm.tsx

import type {
  FieldPath,
  ControllerRenderProps,
} from "react-hook-form";

import {
  Controller,
  useForm,
  get,
} from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import {
  Button,
  Col,
  Divider,
  Form,
  Input,
  Row,
  Select,
} from "antd";

import {
  uomSchema,
  type UomFormInput,
  type UomFormValues,
} from "./schema";

interface UomFormProps {
  initialValues?: UomFormValues;
  onSubmit: (values: UomFormValues) => void;
  onCancel: () => void;
}

export function UomForm({
  initialValues,
  onSubmit,
  onCancel,
}: UomFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UomFormInput, unknown, UomFormValues>({
    resolver: zodResolver(uomSchema),

    defaultValues:
      initialValues ?? {
        unitCode: "",
        einvoiceUom: "OTH", //always default to OTH for now, as per requirement
        unitName: "",
        unitDescription: "",
        unitStatus: "Active",
        remarks: "",
      },
  });

  function field<UName extends FieldPath<UomFormInput>>(
    name: UName,
    label: string,
    required: boolean,
    node: (
      field: ControllerRenderProps<UomFormInput, UName>
    ) => React.ReactElement
  ) {
    const error = get(errors, name);

    return (
      <Form.Item
        label={label}
        required={required}
        validateStatus={error ? "error" : ""}
        help={error?.message as string}
      >
        <Controller
          name={name}
          control={control}
          render={({ field: controllerField }) =>
            node(controllerField)
          }
        />
      </Form.Item>
    );
  }

  return (
    <Form
      layout="vertical"
      onFinish={handleSubmit(onSubmit)}
      requiredMark={false}
    >
      <div style={{ marginBottom: 20 }}>
        <h3
          style={{
            marginBottom: 8,
            fontWeight: 500,
          }}
        >
          UOM Details
        </h3>

        <Divider style={{ margin: 0 }} />
      </div>

      <Row gutter={[24, 8]}>

        {/* Unit Code */}
        <Col span={6}>
          {field(
            "unitCode",
            "Unit Code",
            true,
            (f) => (
              <Input
                {...f}
                maxLength={30}
              />
            )
          )}
        </Col>

        {/* E-Invoice UOM */}
        <Col span={6}>
          {field(
            "einvoiceUom",
            "E-Invoice UOM",
            true,
            (f) => (
              <Input
                {...f}
                value="OTH"
                disabled
                maxLength={30}
              />
            )
          )}
        </Col>

        {/* Unit Name */}
        <Col span={6}>
          {field(
            "unitName",
            "Unit Name",
            true,
            (f) => (
              <Input
                {...f}
                maxLength={50}
              />
            )
          )}
        </Col>

        {/* Unit Description */}
        <Col span={6}>
          {field(
            "unitDescription",
            "Unit Description",
            true,
            (f) => (
              <Input
                {...f}
                maxLength={50}
              />
            )
          )}
        </Col>

        {/* Status */}
        <Col span={6}>
          {field(
            "unitStatus",
            "Status",
            false,
            (f) => (
              <Select
                {...f}
                style={{ width: "100%" }}
                options={[
                  {
                    value: "Active",
                    label: "Active",
                  },
                  {
                    value: "Inactive",
                    label: "Inactive",
                  },
                ]}
              />
            )
          )}
        </Col>

        {/* Remarks */}
        <Col span={6}>
          {field(
            "remarks",
            "Remarks",
            false,
            (f) => (
              <Input
                {...f}
                maxLength={50}
              />
            )
          )}
        </Col>

      </Row>

      <Divider />

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
        }}
      >
        <Button onClick={onCancel}>
          Cancel
        </Button>

        <Button
          type="primary"
          htmlType="submit"
        >
          Save Changes
        </Button>
      </div>
    </Form>
  );
}