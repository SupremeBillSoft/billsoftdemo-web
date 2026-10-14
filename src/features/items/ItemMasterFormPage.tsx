// src/features/items/ItemMasterFormPage.tsx

import { useEffect, useMemo, useState } from "react";
import { Form, Button, Divider, message } from "antd";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import type { FieldPath } from "react-hook-form";
import { DynamicTabForm } from "../../components/DynamicTabForm/DynamicTabForm";
import { itemTabsConfig } from "./itemTabsConfig";
import { itemSchema, type ItemFormInput, type ItemFormValues } from "./schema";
import { useItemQuery, useCreateItemMutation, useUpdateItemMutation } from "./api";
import { useUnitsQuery } from "../uom/api";
import { useTaxesQuery } from "../tax/api";
import { useHSNsQuery } from "../hsn/api";
import { saveFormDraft, loadFormDraft, clearFormDraft } from "../../lib/formDraft";
import { showApiErrorPopup } from "../../lib/apiError";

// one-line: ONE generic shape for "came back from a quick-add-to-another-master"
// — reused for Unit Master, Tax Master, and any future master this pattern
// gets applied to, instead of a differently-named field pair per master.
interface ItemFormNavState {
  returnFieldName?: string;
  newValue?: string;
}

export function ItemMasterFormPage({ readOnly = false }: { readOnly?: boolean }) {
  const { itemCode } = useParams();
  const isCreate = !itemCode;
  const navigate = useNavigate();
  const location = useLocation();
  const { data: existing, error: itemError } = useItemQuery(itemCode);
  const createItem = useCreateItemMutation();
  const updateItem = useUpdateItemMutation();
  const { data: unitsData = [], error: unitsError } = useUnitsQuery();
  const { data: taxesData = [], error: taxesError } = useTaxesQuery();
  const { data: hsnsData = [], error: hsnsError } = useHSNsQuery();

  const draftKey = `item:${itemCode ?? "new"}`;

  const [returnedValue] = useState<{ fieldName: FieldPath<ItemFormInput>; value: string } | undefined>(() => {
    const state = location.state as ItemFormNavState | null;
    if (!state?.returnFieldName || !state.newValue) return undefined;
    return { fieldName: state.returnFieldName as FieldPath<ItemFormInput>, value: state.newValue };
  });

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ItemFormInput, unknown, ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: { itemType: "Product", itemStatus: "Active", customFields: [] },
  });

  const taxOptions = taxesData.map((t) => `${t.taxName}% ${t.taxType}`);

  useEffect(() => {
    if (existing) reset(existing);
  }, [existing, reset]);

  // one-line: an item that can't be loaded can't be edited, so OK on the
  // popup returns to the list instead of leaving an empty "edit" form.
  useEffect(() => {
    if (itemError) showApiErrorPopup(`Failed to load item "${itemCode}"`, itemError, () => navigate("/items"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemError]);

  useEffect(() => {
    if (unitsError) showApiErrorPopup("Failed to load Units", unitsError);
  }, [unitsError]);
  useEffect(() => {
    if (taxesError) showApiErrorPopup("Failed to load Taxes", taxesError);
  }, [taxesError]);
  useEffect(() => {
    if (hsnsError) showApiErrorPopup("Failed to load HSN/SAC Codes", hsnsError);
  }, [hsnsError]);

  useEffect(() => {
    const draft = loadFormDraft<ItemFormInput>(draftKey);
    if (draft) {
      reset(draft);
      clearFormDraft(draftKey);
    }
    if (returnedValue) {
      setValue(returnedValue.fieldName, returnedValue.value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // one-line: ONE generic navigate-away function, parameterized by target
  // route and field name — Unit and Tax both call this now instead of two
  // separate, near-identical handlers.
  function handleAddNewMasterValue(fieldName: string, targetRoute: string) {
    saveFormDraft(draftKey, getValues());
    navigate(targetRoute, { state: { returnTo: location.pathname, returnFieldName: fieldName } });
  }

  const hydratedTabsConfig = useMemo(
    () =>
      itemTabsConfig.map((tab) => {
        if (tab.repeatable) return tab;
        return {
          ...tab,
          fields: tab.fields.map((f) => {
            if (f.name === "purchaseUom" || f.name === "billingUom") {
              return { ...f, onAddNew: () => handleAddNewMasterValue(f.name as string, "/uom/new") };
            }
            if (f.name === "taxType") {
              return { ...f, onAddNew: () => handleAddNewMasterValue(f.name as string, "/tax/new") };
            }
            if (f.name === "hsnCode") return { ...f, onAddNew: () => handleAddNewMasterValue(f.name as string, "/hsn/new") };

            return f;
          }),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const onSubmit = async (values: ItemFormValues) => {
    try {
      if (isCreate) await createItem.mutateAsync(values);
      else await updateItem.mutateAsync({ itemCode: itemCode!, values });
      message.success("Saved Successfully");
      navigate("/items");
    } catch (error) {
      // one-line: stay on the form so the user's input isn't lost.
      showApiErrorPopup(isCreate ? "Failed to create item" : "Failed to update item", error);
    }
  };

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      <DynamicTabForm
        tabs={hydratedTabsConfig}
        control={control}
        errors={errors}
        readOnly={readOnly}
        dynamicOptions={{
          units: unitsData.map((u) => u.unitName),
          taxes: taxOptions,
          hsnCodes: hsnsData.map((h) => h.hsnCode)
        }}
      />
      <Divider />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Button onClick={() => navigate("/items")}>{readOnly ? "Close" : "Cancel"}</Button>
        {!readOnly && (
          <Button type="primary" htmlType="submit" loading={createItem.isPending || updateItem.isPending}>Save Changes</Button>
        )}
      </div>
    </Form>
  );
}