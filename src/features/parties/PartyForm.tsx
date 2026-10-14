// src/features/parties/PartyForm.tsx

import { Controller, useForm, get } from "react-hook-form";
import type { FieldPath, ControllerRenderProps } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Checkbox,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Typography,
} from "antd";
import {
  partySchema,
  type PartyFormInput,
  type PartyFormValues,
} from "./schema";

const { Title} = Typography;

interface PartyFormProps {
  initialValues?: PartyFormValues;
  onSubmit: (values: PartyFormValues) => void;
  onCancel: () => void;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Title
      level={5}
      style={{
        marginTop: 20,
        marginBottom: 12,
        textTransform: "uppercase",
        fontSize: 13,
        letterSpacing: 0.4,
      }}
    >
      {children}
    </Title>
  );
}

export function PartyForm({
  initialValues,
  onSubmit,
  onCancel,
}: PartyFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PartyFormInput, unknown, PartyFormValues>({
    resolver: zodResolver(partySchema),
    defaultValues: initialValues ?? { eInvoiceEnabled: true, status: "Active" },
  });

  function field<TName extends FieldPath<PartyFormInput>>(
    name: TName,
    label: string,
    required: boolean,
    node: (
      f: ControllerRenderProps<PartyFormInput, TName>,
    ) => React.ReactElement,
  ) {
    const error = get(errors, name); // one-line: get() reads a nested/generic path safely — sidesteps the indexing limitation TS has with FieldErrors<T>[TName] directly
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
          render={({ field: f }) => node(f)}
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
      <SectionTitle>Identity</SectionTitle>
      <Row gutter={16}>
        <Col span={8}>
          {field("partyCode", "Party Code", true, (f) => (
            <Input {...f} maxLength={10} placeholder="e.g. C001" />
          ))}
        </Col>
        <Col span={8}>
          {field("partyName", "Party Name", true, (f) => (
            <Input {...f} maxLength={150} />
          ))}
        </Col>
        <Col span={8}>
          {field("category", "Category", false, (f) => (
            <Input {...f} maxLength={50} />
          ))}
        </Col>
        <Col span={8}>
          {field("status", "Status", true, (f) => (
            <Select
              {...f}
              options={[{ value: "Active" }, { value: "Inactive" }]}
            />
          ))}
        </Col>
      </Row>

      <SectionTitle>Party Type</SectionTitle>
      <Row gutter={16}>
        <Col span={6}>
          {field("isVendor", "", false, (f) => (
            <Checkbox
              checked={f.value}
              onChange={(e) => f.onChange(e.target.checked)}
            >
              Is Sales Vendor
            </Checkbox>
          ))}
        </Col>
        <Col span={6}>
          {field("isCustomer", "", false, (f) => (
            <Checkbox
              checked={f.value}
              onChange={(e) => f.onChange(e.target.checked)}
            >
              Is Customer
            </Checkbox>
          ))}
        </Col>
        <Col span={6}>
          {field("isExportCustomer", "", false, (f) => (
            <Checkbox
              checked={f.value}
              onChange={(e) => f.onChange(e.target.checked)}
            >
              Is Export Customer
            </Checkbox>
          ))}
        </Col>
        <Col span={6}>
          {field("isRcmApplicable", "", false, (f) => (
            <Checkbox
              checked={f.value}
              onChange={(e) => f.onChange(e.target.checked)}
            >
              Is RCM Applicable
            </Checkbox>
          ))}
        </Col>
      </Row>

      <SectionTitle>Contact</SectionTitle>
      <Row gutter={16}>
        <Col span={8}>
          {field("mobileNo", "Mobile No", false, (f) => (
            <Input {...f} maxLength={20} />
          ))}
        </Col>
        <Col span={8}>
          {field("email", "Email", false, (f) => (
            <Input {...f} maxLength={50} />
          ))}
        </Col>
        <Col span={8}>
          {field("officePhone", "Office Phone", false, (f) => (
            <Input {...f} maxLength={50} />
          ))}
        </Col>
        <Col span={8}>
          {field("website", "Website", false, (f) => (
            <Input {...f} maxLength={50} />
          ))}
        </Col>
        <Col span={8}>
          {field("contactPerson", "Party Contact Person", false, (f) => (
            <Input {...f} maxLength={50} />
          ))}
        </Col>
      </Row>

      <SectionTitle>Address</SectionTitle>
      <Row gutter={16}>
        <Col span={16}>
          {field("address1", "Address 1", false, (f) => (
            <Input {...f} maxLength={100} />
          ))}
        </Col>
        <Col span={8}>
          {field("address2", "Address 2", false, (f) => (
            <Input {...f} maxLength={100} />
          ))}
        </Col>
        <Col span={8}>
          {field("city", "City", false, (f) => (
            <Input {...f} maxLength={50} />
          ))}
        </Col>
        <Col span={8}>
          {field("pincode", "Pincode", false, (f) => (
            <Input {...f} maxLength={20} />
          ))}
        </Col>
        <Col span={8}>
          {field("state", "State", false, (f) => (
            <Input {...f} maxLength={50} />
          ))}
        </Col>
        <Col span={8}>
          {field("country", "Country", false, (f) => (
            <Input {...f} maxLength={50} />
          ))}
        </Col>
        <Col span={8}>
          {field("partyArea", "Party Area", false, (f) => (
            <Input {...f} maxLength={50} />
          ))}
        </Col>
      </Row>

      <SectionTitle>Tax &amp; Compliance</SectionTitle>
      <Row gutter={16}>
        <Col span={8}>
          {field("gstNo", "GST No.", false, (f) => (
            <Input {...f} maxLength={15} />
          ))}
        </Col>
        <Col span={8}>
          {field("panNo", "PAN No.", false, (f) => (
            <Input {...f} maxLength={15} />
          ))}
        </Col>
        <Col span={8}>
          {field("businessType", "Business Type", false, (f) => (
            <Select
              {...f}
              allowClear
              options={[
                { value: "Retailer", label: "Retailer" },
                { value: "Wholesale", label: "Wholesaler" },
                { value: "Manufact", label: "Manufacturer" },
                { value: "Service", label: "Service Provider" },
              ]}
            />
          ))}
        </Col>
        <Col span={8}>
          {field("tcsPercentage", "TCS Percentage", false, (f) => (
            <InputNumber {...f} style={{ width: "100%" }} min={0} max={100} />
          ))}
        </Col>
        <Col span={8}>
          {field("tdsPercentage", "TDS Percentage", false, (f) => (
            <InputNumber {...f} style={{ width: "100%" }} min={0} max={100} />
          ))}
        </Col>
        <Col span={8}>
          {field("commissionRate", "Commission Rate", false, (f) => (
            <InputNumber {...f} style={{ width: "100%" }} min={0} max={100} />
          ))}
        </Col>
      </Row>

      <SectionTitle>Other Details</SectionTitle>
      <Row gutter={16}>
        <Col span={8}>
          {field("vendorCode", "Vendor Code", false, (f) => (
            <Input {...f} maxLength={50} />
          ))}
        </Col>
       {/* <Col span={8}>
          {field("itemCode", "Item Code", true, (f) => (
            <Select
              {...f}
              options={[{ value: "ITM-001" }, { value: "ITM-002" }]}
            />
          ))}
          <Text type="warning" style={{ fontSize: 11 }}>
            ⚠ Confirm with client — unusual on a Party form
          </Text>
        </Col> 
        <Col span={8}>
          {field("description", "Description", false, (f) => (
            <Input {...f} disabled placeholder="Auto-loaded from Item Code" />
          ))}
        </Col>
        <Col span={8}>
          {field("range", "Range", false, (f) => (
            <Input {...f} maxLength={50} />
          ))}
        </Col>
        <Col span={8}>
          {field("division", "Division", false, (f) => (
            <Input {...f} maxLength={50} />
          ))}
        </Col> */}
        <Col span={8}>
          {field("partyDistance", "Party Distance", false, (f) => (
            <InputNumber {...f} style={{ width: "100%" }} min={0} />
          ))}
        </Col>
        <Col span={8}>
          {field("partyBankName", "Party Bank Name", false, (f) => (
            <Input {...f} maxLength={50} />
          ))}
        </Col>
        <Col span={8}>
          {field("assessmentNo", "Assessment No.", false, (f) => (
            <Input {...f} maxLength={50} />
          ))}
        </Col>
        <Col span={8}>
          {field("evaluationNo", "Evaluation No.", false, (f) => (
            <Input {...f} maxLength={50} />
          ))}
        </Col>
        <Col span={16}>
          {field("remarks", "Remarks", false, (f) => (
            <Input {...f} maxLength={100} />
          ))}
        </Col>
      </Row>

      <Divider />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="primary" htmlType="submit">
          Submit
        </Button>
      </div>
    </Form>
  );
}
