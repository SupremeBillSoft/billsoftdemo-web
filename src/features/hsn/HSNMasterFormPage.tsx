import { useEffect, useMemo } from "react";
import { Form, Button, Divider, message } from "antd";
import { showApiErrorPopup } from "../../lib/apiError";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { DynamicTabForm } from "../../components/DynamicTabForm/DynamicTabForm";
import type { TabConfig, FieldConfig } from "../../components/DynamicTabForm/types";

import { hsnSchema, type HSNFormInput, type HSNFormValues } from "./schema";
import {
  useHSNQuery, useCreateHSNMutation, useUpdateHSNMutation,
  useHSNItemTypesQuery, useCreateHSNItemTypeMutation,
  useHSNProductCategoriesQuery, useCreateHSNProductCategoryMutation,
} from "./api";
import { useTaxesQuery } from "../tax/api";
import { hsnTabsConfig } from "./HSNTabsConfig";

export function HSNMasterFormPage() {
  const { hsnCode } = useParams();
  const isCreate = !hsnCode;
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;
  const returnFieldName = (location.state as { returnFieldName?: string } | null)?.returnFieldName;

  const { data: existing } = useHSNQuery(hsnCode);
  const createHSN = useCreateHSNMutation();
  const updateHSN = useUpdateHSNMutation();

  const { data: itemTypesData = [] } = useHSNItemTypesQuery();
  const createItemType = useCreateHSNItemTypeMutation();
  const { data: categoriesData = [] } = useHSNProductCategoriesQuery();
  const createCategory = useCreateHSNProductCategoryMutation();
  const { data: taxesData = [] } = useTaxesQuery();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<HSNFormInput, unknown, HSNFormValues>({
    resolver: zodResolver(hsnSchema),
    defaultValues: { status: "Active" },
  });

  useEffect(() => { if (existing) reset(existing); }, [existing, reset]);

  const hydratedTabsConfig = useMemo<TabConfig<HSNFormInput>[]>(
    () =>
      hsnTabsConfig.map((tab): TabConfig<HSNFormInput> =>
        !tab.repeatable
          ? {
              ...tab,
              fields: tab.fields.map((f): FieldConfig<HSNFormInput> => {
                if (f.name === "itemType") return { ...f, onCreateOption: async (name: string) => { await createItemType.mutateAsync(name); } };
                if (f.name === "productCategory") return { ...f, onCreateOption: async (name: string) => { await createCategory.mutateAsync(name); } };
                return f;
              }),
            }
          : tab
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const onSubmit = async (values: HSNFormValues) => {
    let saved;
    try {
      if (isCreate) saved = await createHSN.mutateAsync(values);
      else saved = await updateHSN.mutateAsync({ hsnCode: hsnCode!, values });
    } catch (error) {
      showApiErrorPopup(isCreate ? "Failed to create HSN" : "Failed to update HSN", error);
      return;
    }
    message.success("Saved Successfully");

    if (returnTo && returnFieldName) {
      // one-line: the same generic handoff Unit/Tax already use — Item
      // Master's return-effect reads this exact shape.
      navigate(returnTo, { state: { returnFieldName, newValue: saved.hsnCode } });
    } else {
      navigate("/hsn");
    }
  };

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      <DynamicTabForm
        tabs={hydratedTabsConfig}
        control={control}
        errors={errors}
        dynamicOptions={{
          hsnItemTypes: itemTypesData.map((t) => t.name),
          hsnProductCategories: categoriesData.map((c) => c.name),
          taxes: taxesData.map((t) => `${t.taxName}% ${t.taxType}`),
        }}
      />
      <Divider />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Button onClick={() => navigate(returnTo ?? "/hsn")}>Cancel</Button>
        <Button type="primary" htmlType="submit" loading={createHSN.isPending || updateHSN.isPending}>Save Changes</Button>
      </div>
    </Form>
  );
}