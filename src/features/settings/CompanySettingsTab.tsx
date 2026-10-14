import { useEffect, useState } from "react";
import { Input, InputNumber, Button, Typography, Space, message, Form, Switch, Divider, Select, Spin, DatePicker } from "antd";
import dayjs from "dayjs";
import { useCompanySettingsStore } from "./companySettingsStore";
import { USER_ROLES, useCompanySettingsQuery, useUpdateCompanySettingsMutation, type CompanySettings } from "./api";
import { showApiErrorPopup } from "../../lib/apiError";
import { INDIAN_STATES } from "../../lib/states";

const { Title, Text } = Typography;
const PREFIX_LENGTH = 6;


const MONTH_OPTIONS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
].map((label, i) => ({ value: i + 1, label }));
const ROLE_OPTIONS = USER_ROLES.map((role) => ({ value: role, label: role }));

const TEXT_FIELDS: { name: keyof CompanySettings; label: string }[] = [
  { name: "businessName", label: "Business Name" },
  { name: "phone", label: "Company Phone Number" },
  { name: "email", label: "Company Email Address" },
  { name: "address1", label: "Address 1" },
  { name: "address2", label: "Address 2" },
  { name: "city", label: "City" },
  { name: "pincode", label: "Pincode" },
  { name: "country", label: "Country" },
];

function PartyCodePrefixSection() {
  const partyCodePrefix = useCompanySettingsStore((s) => s.partyCodePrefix);
  const setPartyCodePrefix = useCompanySettingsStore((s) => s.setPartyCodePrefix);
  const [draft, setDraft] = useState(partyCodePrefix);
  const [error, setError] = useState("");

  function handleSave() {
    if (draft && !/^[A-Za-z0-9]{1,6}$/.test(draft)) {
      setError("Prefix must be alphanumeric, up to 6 characters");
      return;
    }
    setError("");
    setPartyCodePrefix(draft);
    message.success("Party Code Prefix saved");
  }

  return (
    <div>
      <Title level={5}>Party Code Prefix</Title>
      <Text type="secondary" style={{ display: "block", marginBottom: 8, fontSize: 12.5 }}>
        A 6-character prefix used on every new Party Code. The remaining 4 digits are assigned automatically when a party is saved.
      </Text>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value.toUpperCase())}
        maxLength={PREFIX_LENGTH}
        status={error ? "error" : undefined}
        placeholder="e.g. ABC123"
        style={{ width: 200 }}
      />
      {error && <div style={{ color: "#ff4d4f", fontSize: 12, marginTop: 4 }}>{error}</div>}
      <div style={{ marginTop: 12 }}>
        <Button type="primary" onClick={handleSave}>Save</Button>
      </div>
    </div>
  );
}

// BRD 6.7.1 business information, GST registration and the purchase
// auto-approval switches - saved to the backend (GET/PATCH /company-settings/).
function BusinessInformationSection() {
  const { data, isLoading } = useCompanySettingsQuery();
  const updateMutation = useUpdateCompanySettingsMutation();
  const [draft, setDraft] = useState<CompanySettings | null>(null);

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  if (isLoading || !draft) return <Spin />;

  const set = <K extends keyof CompanySettings>(key: K, value: CompanySettings[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  async function handleSave() {
    if (!draft) return;
    try {
      // A state-limit row whose State was never picked is dropped.
      const { "": _blank, ...thresholds } = draft.ewayBillIntraStateThresholds ?? {};
      await updateMutation.mutateAsync({ ...draft, ewayBillIntraStateThresholds: thresholds });
      message.success("Company settings saved");
    } catch (error) {
      showApiErrorPopup("Could not save Company Settings", error);
    }
  }

  return (
    <Form layout="vertical" style={{ maxWidth: 820 }}>
      <Title level={5}>Business Information</Title>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", columnGap: 24 }}>
        {TEXT_FIELDS.map(({ name, label }) => (
          <Form.Item key={name} label={label}>
            <Input value={String(draft[name] ?? "")} onChange={(e) => set(name, e.target.value as never)} />
          </Form.Item>
        ))}
        <Form.Item
          label="State"
          required
          extra="The company's own State - purchases from a supplier in the same State get CGST + SGST, others IGST."
        >
          <Select
            showSearch
            allowClear
            value={draft.state || undefined}
            options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
            onChange={(v) => set("state", v ?? "")}
          />
        </Form.Item>
      </div>

      <Divider />
      <Title level={5}>GST Registration</Title>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", columnGap: 24 }}>
        <Form.Item label="GST Registered">
          <Switch checked={draft.gstRegistered} onChange={(v) => set("gstRegistered", v)} />
        </Form.Item>
        {draft.gstRegistered && (
          <Form.Item label="GSTIN" required>
            <Input maxLength={15} value={draft.gstin} onChange={(e) => set("gstin", e.target.value.toUpperCase())} />
          </Form.Item>
        )}
        <Form.Item label="PAN No.">
          <Input maxLength={10} value={draft.panNo} onChange={(e) => set("panNo", e.target.value.toUpperCase())} />
        </Form.Item>
      </div>

      <Divider />
      <Title level={5}>Financial Year</Title>
      <Form.Item
        label="Financial year starts in"
        extra="Used for the year in document numbers (e.g. 24-25)."
        style={{ maxWidth: 260 }}
      >
        <Select
          value={draft.financialYearStartMonth}
          options={MONTH_OPTIONS}
          onChange={(v) => set("financialYearStartMonth", v)}
        />
      </Form.Item>

      <Divider />
      <Title level={5}>Purchase Settings</Title>
      <Form.Item
        label="Allow Purchase Orders without a Purchase Requisition"
        extra="Off: every PO line must come from an Approved PR."
      >
        <Switch checked={draft.allowPoWithoutPr} onChange={(v) => set("allowPoWithoutPr", v)} />
      </Form.Item>
      <Text type="secondary" style={{ display: "block", marginBottom: 12, fontSize: 12.5 }}>
        Auto approval is by the role of the user who creates the document (e.g. a PR created by a Manager is approved
        straight away). It takes effect once user login is available.
      </Text>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", columnGap: 24 }}>
        <Form.Item label="Auto-approve Purchase Requisitions created by">
          <Select
            mode="multiple"
            allowClear
            placeholder="No role (always needs approval)"
            value={draft.autoApprovePrRoles}
            options={ROLE_OPTIONS}
            onChange={(v) => set("autoApprovePrRoles", v)}
          />
        </Form.Item>
        <Form.Item label="Auto-approve Purchase Orders created by">
          <Select
            mode="multiple"
            allowClear
            placeholder="No role (always needs approval)"
            value={draft.autoApprovePoRoles}
            options={ROLE_OPTIONS}
            onChange={(v) => set("autoApprovePoRoles", v)}
          />
        </Form.Item>
      </div>

      <Divider />
      <SalesSettingsSection draft={draft} set={set} />

      <Button type="primary" onClick={handleSave} loading={updateMutation.isPending}>
        Save Company Settings
      </Button>
    </Form>
  );
}

// BRD 6.4 Sales: stock, e-invoice, e-way bill and export (LUT) settings.
function SalesSettingsSection({
  draft,
  set,
}: {
  draft: CompanySettings;
  set: <K extends keyof CompanySettings>(key: K, value: CompanySettings[K]) => void;
}) {
  const overrides = Object.entries(draft.ewayBillIntraStateThresholds ?? {});
  const setOverrides = (rows: [string, number | string][]) =>
    set("ewayBillIntraStateThresholds", Object.fromEntries(rows));
  const lutExpired = !!draft.lutValidTill && dayjs(draft.lutValidTill).isBefore(dayjs(), "day");

  return (
    <>
      <Title level={5}>Sales Settings</Title>
      <Form.Item
        label="Allow sales invoices when stock is short"
        extra="On: the invoice saves with a warning and stock goes negative. Off: the invoice is blocked."
      >
        <Switch checked={draft.allowNegativeStockOnSales} onChange={(v) => set("allowNegativeStockOnSales", v)} />
      </Form.Item>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", columnGap: 24 }}>
        <Form.Item
          label="E-invoicing enabled"
          extra="Mandatory once aggregate turnover exceeds Rs 5 crore. B2B invoices and credit notes then need an IRN."
        >
          <Switch checked={draft.einvoiceEnabled} onChange={(v) => set("einvoiceEnabled", v)} />
        </Form.Item>
        <Form.Item
          label="Turnover Rs 10 crore or more"
          extra="Each document must be reported to the IRP within 30 days of its date."
        >
          <Switch
            disabled={!draft.einvoiceEnabled}
            checked={draft.aato10crOrMore}
            onChange={(v) => set("aato10crOrMore", v)}
          />
        </Form.Item>
      </div>

      <Form.Item
        label="E-way bill threshold (consignment value, Rs)"
        extra="Above this value goods need an e-way bill. Inter-state job work always needs one."
        style={{ maxWidth: 320 }}
      >
        <InputNumber
          style={{ width: "100%" }}
          min={0}
          value={Number(draft.ewayBillThreshold ?? 50000)}
          onChange={(v) => set("ewayBillThreshold", v ?? 0)}
        />
      </Form.Item>
      <div style={{ marginBottom: 6 }}>Higher intra-state limits (some states set their own)</div>
      {overrides.map(([state, amount], i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
          <Select
            showSearch
            style={{ width: 260 }}
            placeholder="State"
            value={state || undefined}
            options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
            onChange={(v) => setOverrides(overrides.map((row, j) => (j === i ? [v, row[1]] : row)))}
          />
          <InputNumber
            style={{ width: 160 }}
            min={0}
            value={Number(amount)}
            onChange={(v) => setOverrides(overrides.map((row, j) => (j === i ? [row[0], v ?? 0] : row)))}
          />
          <a onClick={() => setOverrides(overrides.filter((_, j) => j !== i))}>Remove</a>
        </div>
      ))}
      <Button
        size="small"
        type="dashed"
        style={{ marginBottom: 16 }}
        onClick={() => set("ewayBillIntraStateThresholds", { ...draft.ewayBillIntraStateThresholds, "": 100000 })}
      >
        + Add State Limit
      </Button>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", columnGap: 24 }}>
        <Form.Item label="LUT Number" extra="Letter of Undertaking - lets exports go out without paying IGST.">
          <Input value={draft.lutNumber} onChange={(e) => set("lutNumber", e.target.value)} />
        </Form.Item>
        <Form.Item
          label="LUT Valid Till"
          validateStatus={lutExpired ? "warning" : undefined}
          help={lutExpired ? "This LUT has expired - renew it before billing exports without IGST." : undefined}
        >
          <DatePicker
            style={{ width: "100%" }}
            value={draft.lutValidTill ? dayjs(draft.lutValidTill) : null}
            onChange={(d) => set("lutValidTill", d ? d.format("YYYY-MM-DD") : null)}
          />
        </Form.Item>
      </div>
    </>
  );
}

export function CompanySettingsTab() {
  return (
    <Space orientation="vertical" size={32} style={{ width: "100%" }}>
      <BusinessInformationSection />
      <Divider style={{ margin: 0 }} />
      <PartyCodePrefixSection />
    </Space>
  );
}
