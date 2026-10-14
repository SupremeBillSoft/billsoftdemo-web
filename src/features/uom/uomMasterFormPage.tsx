// src/features/units/UnitMasterFormPage.tsx

import { useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, Button, Divider, message } from "antd";
import { showApiErrorPopup } from "../../lib/apiError";
import { DynamicTabForm } from "../../components/DynamicTabForm/DynamicTabForm";
import { uomSchema, type UomFormValues, type UomFormInput } from "./schema";
import { uomTabConfig } from "./uomTabConfig";
import { useUnitQuery, useCreateUnitMutation, useUpdateUnitMutation } from "./api";

export function UnitMasterFormPage() {
  const { unitCode } = useParams();
  const isCreate = !unitCode;
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: string; returnFieldName?: string } | null)?.returnTo;
  const returnFieldName = (location.state as { returnFieldName?: string } | null)?.returnFieldName;

  const { data: existing } = useUnitQuery(unitCode);
  const createUnit = useCreateUnitMutation();
  const updateUnit = useUpdateUnitMutation();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UomFormInput, unknown, UomFormValues>({
    resolver: zodResolver(uomSchema),
    defaultValues: { unitStatus: "Active", einvoiceUom: "OTH", unitCode: "" },
  });

  useEffect(() => {
    if (existing) reset(existing);
  }, [existing, reset]);

  const onSubmit = async (values: UomFormValues) => {
    let saved;
    try {
      if (isCreate) saved = await createUnit.mutateAsync(values);
      else saved = await updateUnit.mutateAsync({ unitCode: unitCode!, values });
    } catch (error) {
      showApiErrorPopup(isCreate ? "Failed to create unit" : "Failed to update unit", error);
      return;
    }
    message.success("Saved Successfully");

    if (returnTo && returnFieldName) {
      // THE handoff back - Item Master's return-effect reads { returnFieldName, newValue }.
      navigate(returnTo, { state: { returnFieldName, newValue: saved.unitName } });
    } else {
      navigate("/uom");
    }
  };

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      <DynamicTabForm tabs={uomTabConfig} control={control} errors={errors} />
      <Divider />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Button onClick={() => navigate(returnTo ?? "/uom")}>Cancel</Button>
        <Button type="primary" htmlType="submit" loading={createUnit.isPending || updateUnit.isPending}>Save Changes</Button>
      </div>
    </Form>
  );
}