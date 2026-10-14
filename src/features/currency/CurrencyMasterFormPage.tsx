import { useEffect } from "react";
import { Form, Button, Divider } from "antd";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import { DynamicTabForm } from "../../components/DynamicTabForm/DynamicTabForm";
import { currencyTabsConfig } from "./currencyTabsConfig";
import { currencySchema, type CurrencyFormInput, type CurrencyFormValues } from "./schema";
import { useCurrencyQuery, useCreateCurrencyMutation, useUpdateCurrencyMutation } from "./api";

export function CurrencyMasterFormPage() {
  const { currencyCode } = useParams();
  const isCreate = !currencyCode;
  const navigate = useNavigate();
  const { data: existing } = useCurrencyQuery(currencyCode);
  const createCurrency = useCreateCurrencyMutation();
  const updateCurrency = useUpdateCurrencyMutation();

  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm<CurrencyFormInput, unknown, CurrencyFormValues>({
    resolver: zodResolver(currencySchema),
    defaultValues: { symbolPosition: "Prefix", status: "Active" },
  });

  useEffect(() => { if (existing) reset(existing); }, [existing, reset]);

  const onSubmit = async (values: CurrencyFormValues) => {
    if (isCreate) await createCurrency.mutateAsync(values);
    else await updateCurrency.mutateAsync({ currencyCode: currencyCode!, values });
    navigate("/currency");
  };

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      <DynamicTabForm tabs={currencyTabsConfig} control={control} errors={errors} setValue={setValue} />
      <Divider />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Button onClick={() => navigate("/currency")}>Cancel</Button>
        <Button type="primary" htmlType="submit" loading={createCurrency.isPending || updateCurrency.isPending}>Save Changes</Button>
      </div>
    </Form>
  );
}