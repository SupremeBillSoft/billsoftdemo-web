// src/features/docNumberFormats/DocNumberFormatFormPage.tsx
//
// "Document Number Formatting" entry screen. Every part of the number comes
// from the values entered here (see preview.ts for the rule); Final Doc
// Format shows the next number live as the fields change.
//
// Not built on DynamicTabForm - this screen's fields don't fit the generic
// tab/flat-field shape (Doc -> DocType -> DocSubType suggestions, a live
// computed preview, paired field+separator layout).

import { useEffect, useMemo } from "react";
import { AutoComplete, Button, Checkbox, Col, DatePicker, Divider, Form, Input, InputNumber, Row, Select, message } from "antd";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";
import {
  useCreateDocumentNumberFormatMutation,
  useDocumentNumberFormatsQuery,
  useUpdateDocumentNumberFormatMutation,
} from "./api";
import { docNumberFormatSchema, type DocNumberFormatFormInput, type DocNumberFormatFormValues } from "./schema";
import { computePreview } from "./preview";
import { useCompanySettingsQuery } from "../settings/api";
import { showApiErrorPopup } from "../../lib/apiError";

const LIST_PATH = "/settings/document-number-formats";
const SEPARATOR_OPTIONS = ["", "-", "/", "_", "."].map((v) => ({ value: v, label: v || "(none)" }));
const DIGIT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8].map((v) => ({ value: v, label: String(v) }));
const FY_DIGIT_OPTIONS = [
  { value: 2, label: "2 digits (e.g. 24)" },
  { value: 4, label: "4 digits (e.g. 2024)" },
];
const DISPLAY_ORDER_OPTIONS = [
  { value: "number-first", label: "Doc No, then Year (e.g. P/1/24-25)" },
  { value: "year-first", label: "Year, then Doc No (e.g. P242500001)" },
];
// Document codes the system issues numbers for today (others can be typed).
const BUILT_IN_DOCS = ["PR", "PO", "PI", "PRET", "DN"];

const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

export function DocNumberFormatFormPage({ readOnly = false }: { readOnly?: boolean }) {
  const { id } = useParams();
  const isCreate = !id;
  const navigate = useNavigate();

  // Reuses the list query rather than a separate detail endpoint - the
  // dataset is small (one row per format version).
  const { data: allFormats = [] } = useDocumentNumberFormatsQuery();
  const existing = allFormats.find((f) => String(f.id) === id);
  const { data: companySettings } = useCompanySettingsQuery();
  const fyStartMonth = companySettings?.financialYearStartMonth ?? 4;

  const createMutation = useCreateDocumentNumberFormatMutation();
  const updateMutation = useUpdateDocumentNumberFormatMutation();

  // Once a version has issued a number its format is history - changes go
  // through Start New Version on the list screen.
  const locked = readOnly || (!!existing && existing.issuedCount > 0);

  const { control, handleSubmit, reset } = useForm<DocNumberFormatFormInput, unknown, DocNumberFormatFormValues>({
    resolver: zodResolver(docNumberFormatSchema),
    defaultValues: {
      doc: "",
      docType: "",
      docSubType: "",
      prefix: "",
      prefixSeparator: "",
      docNo: 1,
      formatDigit: 4,
      docSeparator: "",
      midText: "",
      midTextSeparator: "",
      finYear1: null,
      finYear2: null,
      yearSeparator: "",
      suffix: "",
      suffixSeparator: "",
      isYearFirst: false,
      isActive: true,
      fromDate: dayjs().format("YYYY-MM-DD"),
    },
  });

  useEffect(() => {
    if (existing) {
      const { id: _id, entryNo: _e, issuedCount: _i, toDate: _t, finalDocFormat: _f, isCurrentVersion: _c, ...values } = existing;
      reset(values);
    }
  }, [existing, reset]);

  const watched = useWatch({ control });

  // Suggestions for the free-text Document / Doc Type / Doc Sub Type
  // (legacy values aren't a fixed list, so new ones can be typed).
  const docOptions = useMemo(
    () => unique([...BUILT_IN_DOCS, ...allFormats.map((f) => f.doc)]).map((v) => ({ value: v })),
    [allFormats]
  );
  const docTypeOptions = unique(allFormats.filter((f) => f.doc === watched.doc).map((f) => f.docType)).map((v) => ({ value: v }));
  const docSubTypeOptions = unique(
    allFormats.filter((f) => f.doc === watched.doc && f.docType === watched.docType).map((f) => f.docSubType)
  ).map((v) => ({ value: v }));

  const livePreview = computePreview(
    {
      prefix: watched.prefix ?? "",
      prefixSeparator: watched.prefixSeparator ?? "",
      formatDigit: Number(watched.formatDigit ?? 4),
      docSeparator: watched.docSeparator ?? "",
      midText: watched.midText ?? "",
      midTextSeparator: watched.midTextSeparator ?? "",
      finYear1: watched.finYear1 ?? null,
      finYear2: watched.finYear2 ?? null,
      yearSeparator: watched.yearSeparator ?? "",
      suffix: watched.suffix ?? "",
      suffixSeparator: watched.suffixSeparator ?? "",
      isYearFirst: watched.isYearFirst ?? false,
      fromDate: watched.fromDate ?? dayjs().format("YYYY-MM-DD"),
    },
    Number(watched.docNo ?? 1),
    fyStartMonth
  );

  const onSubmit = async (values: DocNumberFormatFormValues) => {
    try {
      if (isCreate) {
        await createMutation.mutateAsync(values);
      } else {
        await updateMutation.mutateAsync({ id: Number(id), values });
      }
    } catch (error) {
      showApiErrorPopup("Could not save the document number format", error);
      return;
    }
    message.success("Saved Successfully");
    navigate(LIST_PATH);
  };

  const textInput = (name: "prefix" | "midText" | "suffix") => (
    <Controller name={name} control={control} render={({ field }) => <Input {...field} maxLength={10} disabled={locked} />} />
  );
  const separatorSelect = (
    name: "prefixSeparator" | "docSeparator" | "midTextSeparator" | "yearSeparator" | "suffixSeparator"
  ) => (
    <Controller
      name={name}
      control={control}
      render={({ field }) => <Select {...field} disabled={locked} options={SEPARATOR_OPTIONS} />}
    />
  );
  const classificationInput = (name: "doc" | "docType" | "docSubType", options: { value: string }[], disabled: boolean) => (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <AutoComplete
          value={field.value}
          onChange={field.onChange}
          options={options}
          disabled={disabled}
          filterOption={(input, option) => String(option?.value ?? "").toLowerCase().includes(input.toLowerCase())}
        />
      )}
    />
  );

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      <h2>Document Number Formatting</h2>
      {existing && existing.issuedCount > 0 && !readOnly && (
        <div style={{ marginBottom: 16, color: "#ad6800" }}>
          This format has already issued {existing.issuedCount} number(s), so it can't be changed here. Use "Start New
          Version" on the list to change it going forward.
        </div>
      )}

      <Row gutter={24}>
        <Col span={6}>
          <Form.Item label="Entry No">
            <Input value={existing?.entryNo ?? "(new)"} disabled />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="From Date" required>
            <Controller
              name="fromDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  style={{ width: "100%" }}
                  disabled={locked || !isCreate}
                  value={field.value ? dayjs(field.value) : null}
                  onChange={(d) => field.onChange(d ? d.format("YYYY-MM-DD") : "")}
                />
              )}
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="To Date">
            <Input value={existing?.toDate ?? "Open (current version)"} disabled />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Active">
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} disabled={locked}>
                  Used for new documents
                </Checkbox>
              )}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col span={8}>
          <Form.Item label="Document" required>{classificationInput("doc", docOptions, locked || !isCreate)}</Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Doc Type (optional)">{classificationInput("docType", docTypeOptions, locked || !isCreate)}</Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Doc Sub Type (optional)">
            {classificationInput("docSubType", docSubTypeOptions, locked || !isCreate)}
          </Form.Item>
        </Col>
      </Row>

      <Divider />

      <Row gutter={24}>
        <Col span={6}>
          <Form.Item label="Prefix">{textInput("prefix")}</Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Prefix Separator">{separatorSelect("prefixSeparator")}</Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Doc No" tooltip="The next number to issue - set the starting number here">
            <Controller
              name="docNo"
              control={control}
              render={({ field }) => (
                <InputNumber
                  style={{ width: "100%" }}
                  min={1}
                  disabled={locked}
                  value={Number(field.value ?? 1)}
                  onChange={(v) => field.onChange(v ?? 1)}
                />
              )}
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Format Digit">
            <Controller
              name="formatDigit"
              control={control}
              render={({ field }) => (
                <Select value={Number(field.value ?? 4)} onChange={field.onChange} disabled={locked} options={DIGIT_OPTIONS} />
              )}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col span={6}>
          <Form.Item label="Doc No Separator">{separatorSelect("docSeparator")}</Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="MID Text">{textInput("midText")}</Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="MID Text Separator">{separatorSelect("midTextSeparator")}</Form.Item>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col span={6}>
          <Form.Item label="Fin Year 1">
            <Controller
              name="finYear1"
              control={control}
              render={({ field }) => <Select {...field} allowClear disabled={locked} options={FY_DIGIT_OPTIONS} />}
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Fin Year 2">
            <Controller
              name="finYear2"
              control={control}
              render={({ field }) => <Select {...field} allowClear disabled={locked} options={FY_DIGIT_OPTIONS} />}
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Year Separator">{separatorSelect("yearSeparator")}</Form.Item>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col span={6}>
          <Form.Item label="Suffix">{textInput("suffix")}</Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Suffix Separator">{separatorSelect("suffixSeparator")}</Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Doc No. Display Order">
            <Controller
              name="isYearFirst"
              control={control}
              render={({ field }) => (
                <Select
                  disabled={locked}
                  value={field.value ? "year-first" : "number-first"}
                  onChange={(v) => field.onChange(v === "year-first")}
                  options={DISPLAY_ORDER_OPTIONS}
                />
              )}
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item label="Final Doc Format (next number)">
        <Input value={livePreview} disabled readOnly style={{ fontWeight: 600 }} />
      </Form.Item>

      <Divider />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Button onClick={() => navigate(LIST_PATH)}>{locked ? "Close" : "Cancel"}</Button>
        {!locked && (
          <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
            Save
          </Button>
        )}
      </div>
    </Form>
  );
}
