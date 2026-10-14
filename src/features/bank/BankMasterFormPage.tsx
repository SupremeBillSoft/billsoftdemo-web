import { useEffect } from "react";
import { Form, Button, Divider, message } from "antd";
import { showApiErrorPopup } from "../../lib/apiError";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import { DynamicTabForm } from "../../components/DynamicTabForm/DynamicTabForm";
import { bankTabsConfig } from "./bankTabsConfig";
import { bankSchema, type BankFormInput, type BankFormValues } from "./schema";
import { useBankQuery, useCreateBankMutation, useUpdateBankMutation } from "./api";

export function BankMasterFormPage() {
  const { bankCode } = useParams();
  const isCreate = !bankCode;
  const navigate = useNavigate();
  const { data: existing } = useBankQuery(bankCode);
  const createBank = useCreateBankMutation();
  const updateBank = useUpdateBankMutation();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<BankFormInput, unknown, BankFormValues>({
    resolver: zodResolver(bankSchema),
    defaultValues: { status: "Active" },
  });

  useEffect(() => { if (existing) reset(existing); }, [existing, reset]);

  const onSubmit = async (values: BankFormValues) => {
    try {
      if (isCreate) await createBank.mutateAsync(values);
      else await updateBank.mutateAsync({ bankCode: bankCode!, values });
    } catch (error) {
      showApiErrorPopup(isCreate ? "Failed to create bank" : "Failed to update bank", error);
      return;
    }
    message.success("Saved Successfully");
    navigate("/bank");
  };

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      <DynamicTabForm tabs={bankTabsConfig} control={control} errors={errors} />
      <Divider />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Button onClick={() => navigate("/bank")}>Cancel</Button>
        <Button type="primary" htmlType="submit" loading={createBank.isPending || updateBank.isPending}>Save Changes</Button>
      </div>
    </Form>
  );
}