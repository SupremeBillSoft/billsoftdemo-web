// src/features/branch/BranchMasterFormPage.tsx

import { useEffect, useMemo } from "react";
import { Form, Button, Divider, message } from "antd";
import { showApiErrorPopup } from "../../lib/apiError";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import { DynamicTabForm } from "../../components/DynamicTabForm/DynamicTabForm";
import type { TabConfig, FieldConfig } from "../../components/DynamicTabForm/types";
import { branchTabsConfig } from "./branchTabsConfig";
import { branchSchema, type BranchFormInput, type BranchFormValues } from "./schema";
import { useBranchQuery, useCreateBranchMutation, useUpdateBranchMutation, useBranchTypesQuery, useCreateBranchTypeMutation } from "./api";

export function BranchMasterFormPage() {
  const { branchCode } = useParams();
  const isCreate = !branchCode;
  const navigate = useNavigate();
  const { data: existing } = useBranchQuery(branchCode);
  const createBranch = useCreateBranchMutation();
  const updateBranch = useUpdateBranchMutation();
  const { data: branchTypesData = [] } = useBranchTypesQuery();
  const createBranchType = useCreateBranchTypeMutation();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<BranchFormInput, unknown, BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: { status: "Active" },
  });

  useEffect(() => { if (existing) reset(existing); }, [existing, reset]);

  const hydratedTabsConfig = useMemo<TabConfig<BranchFormInput>[]>(
    () =>
      branchTabsConfig.map((tab): TabConfig<BranchFormInput> =>
        !tab.repeatable
          ? {
              ...tab,
              fields: tab.fields.map(
                (f): FieldConfig<BranchFormInput> =>
                  f.name === "branchType"
                    ? {
                        ...f,
                        onCreateOption: async (name: string) => {
                          await createBranchType.mutateAsync(name);
                        },
                      }
                    : f
              ),
            }
          : tab
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const onSubmit = async (values: BranchFormValues) => {
    try {
      if (isCreate) await createBranch.mutateAsync(values);
      else await updateBranch.mutateAsync({ branchCode: branchCode!, values });
    } catch (error) {
      showApiErrorPopup(isCreate ? "Failed to create branch" : "Failed to update branch", error);
      return;
    }
    message.success("Saved Successfully");
    navigate("/branch");
  };

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      <DynamicTabForm
        tabs={hydratedTabsConfig}
        control={control}
        errors={errors}
        dynamicOptions={{ branchTypes: branchTypesData.map((t) => t.name) }}
      />
      <Divider />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Button onClick={() => navigate("/branch")}>Cancel</Button>
        <Button type="primary" htmlType="submit" loading={createBranch.isPending || updateBranch.isPending}>Save Changes</Button>
      </div>
    </Form>
  );
}