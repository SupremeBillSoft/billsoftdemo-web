// src/features/tax/TaxMasterFormPage.tsx

import { useEffect } from "react";
import { Form, Button, Divider, message } from "antd";
import { showApiErrorPopup } from "../../lib/apiError";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { DynamicTabForm } from "../../components/DynamicTabForm/DynamicTabForm";
import { taxTabsConfig } from "./taxTabsConfig";
import { taxSchema, type TaxFormInput, type TaxFormValues } from "./schema";
import { useTaxQuery, useCreateTaxMutation, useUpdateTaxMutation } from "./api";

export function TaxMasterFormPage() {
  const { id } = useParams();
  const isCreate = !id;
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: string; returnFieldName?: string } | null)?.returnTo;
  const returnFieldName = (location.state as { returnFieldName?: string } | null)?.returnFieldName;
  const { data: existing } = useTaxQuery(id);
  const createTax = useCreateTaxMutation();
  const updateTax = useUpdateTaxMutation();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaxFormInput, unknown, TaxFormValues>({
    resolver: zodResolver(taxSchema),
    defaultValues: { taxType: "GST", status: "Active" },
  });

  useEffect(() => {
    if (existing) reset(existing);
  }, [existing, reset]);

  const onSubmit = async (values: TaxFormValues) => {
    let saved;
    try {
      if (isCreate) saved = await createTax.mutateAsync(values);
      else saved = await updateTax.mutateAsync({ id: Number(id), values });
    } catch (error) {
      showApiErrorPopup(isCreate ? "Failed to create tax" : "Failed to update tax", error);
      return;
    }
    message.success("Saved Successfully");

    if (returnTo && returnFieldName) {
      // Same label the Item / HSN Tax Type dropdowns use: "{taxName}% {taxType}".
      navigate(returnTo, {
        state: { returnFieldName, newValue: `${saved.taxName}% ${saved.taxType}` },
      });
    } else {
      navigate("/tax");
    }
  };

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      <DynamicTabForm tabs={taxTabsConfig} control={control} errors={errors} />
      <Divider />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Button onClick={() => navigate("/tax")}>Cancel</Button>
        <Button
          type="primary"
          htmlType="submit"
          loading={createTax.isPending || updateTax.isPending}
        >
          Save Changes
        </Button>
      </div>
    </Form>
  );
}
