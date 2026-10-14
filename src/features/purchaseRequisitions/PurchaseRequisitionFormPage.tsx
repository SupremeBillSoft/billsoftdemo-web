// src/features/purchaseRequisitions/PurchaseRequisitionFormPage.tsx

import { useEffect, useMemo, useState } from "react";
import { Button, DatePicker, Divider, Form, Input, Select, message } from "antd";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";
import {
  useCreatePurchaseRequisitionMutation,
  usePurchaseRequisitionQuery,
  useUpdatePurchaseRequisitionMutation,
} from "./api";
import {
  purchaseRequisitionSchema,
  type PurchaseRequisitionFormInput,
  type PurchaseRequisitionFormValues,
  type PRItemRow,
} from "./schema";
import { PRItemEntryGrid, type ItemOption } from "./PRItemEntryGrid";
import { usePartiesQuery } from "../parties/api"; // adjust to actual export name
import { useItemsQuery } from "../items/api"; // adjust to actual export name
import { showApiErrorPopup } from "../../lib/apiError";
import { isUsableSupplier } from "../../lib/partyEligibility";

const PR_TYPE_OPTIONS = [
  { value: "Item", label: "Item based" },
  { value: "General", label: "General" },
];

export function PurchaseRequisitionFormPage({ readOnly = false }: { readOnly?: boolean }) {
  const { prNo } = useParams();
  const isCreate = !prNo;
  const navigate = useNavigate();

  const { data: existing } = usePurchaseRequisitionQuery(prNo);
  const { data: parties = [] } = usePartiesQuery();
  const { data: items = [] } = useItemsQuery();
  const createMutation = useCreatePurchaseRequisitionMutation();
  const updateMutation = useUpdatePurchaseRequisitionMutation();

  // Supplier-eligibility: only vendors, and never a Suspend/Hold party -
  // architecture doc section 10.4. Backend also enforces this (belt and
  // braces - the frontend filter is for a clean picker, not the only guard).
  const eligibleSuppliers = useMemo(
    () => parties.filter((p: any) => isUsableSupplier(p)),
    [parties]
  );

  const itemOptions: ItemOption[] = useMemo(
    () =>
      items.map((i: any) => ({
        id: i.id,
        itemCode: i.itemCode,
        description: i.itemDescription || i.itemName,
        uom: i.billingUom,
        hsnSac: i.hsnCode,
      })),
    [items]
  );

  const { control, handleSubmit, setValue, watch, reset } = useForm<
    PurchaseRequisitionFormInput,
    unknown,
    PurchaseRequisitionFormValues
  >({
    resolver: zodResolver(purchaseRequisitionSchema),
    defaultValues: {
      prType: "Item",
      supplier: null,
      raisedBy: "",
      prDate: dayjs().format("YYYY-MM-DD"),
      remarks: "",
      items: [],
    },
  });

  useEffect(() => {
    if (existing) reset(existing);
  }, [existing, reset]);

  const supplierId = watch("supplier");
  const [lastAutoLoadedSupplier, setLastAutoLoadedSupplier] = useState<number | null>(null);

  useEffect(() => {
    // Auto-load the selected supplier's associated items into the grid -
    // architecture doc section 9.1. Only fires once per supplier change
    // (not on every render), and only for a brand-new PR - never overwrites
    // items the user is actively editing on an existing PR.
    if (!isCreate || !supplierId || supplierId === lastAutoLoadedSupplier) return;
    const party = eligibleSuppliers.find((p: any) => p.id === supplierId);
    // Assumes Party's payload includes its own repeatable "items" tab data
    // (itemCode, quantity, etc.) - adjust field names below to match your
    // actual Party item row shape if it differs.
    const partyItems = (party as any)?.items ?? [];
    if (partyItems.length) {
      const mapped = partyItems.map((pi: any) => {
        const match = itemOptions.find((o) => o.itemCode === pi.itemCode);
        return {
          item: match?.id,
          itemCode: pi.itemCode,
          description: match?.description ?? "",
          uom: match?.uom ?? "",
          hsnSac: match?.hsnSac ?? "",
          quantity: 1,
          deliveryDate: null,
        };
      });
      setValue("items", mapped);
    }
    setLastAutoLoadedSupplier(supplierId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId, isCreate]);

  const onSubmit = async (values: PurchaseRequisitionFormValues) => {
    try {
      if (isCreate) {
        await createMutation.mutateAsync(values);
      } else {
        await updateMutation.mutateAsync({ id: Number(prNo), values });
      }
    } catch (error) {
      showApiErrorPopup("Could not save the Purchase Requisition", error);
      return;
    }
    message.success("Saved Successfully");
    navigate("/purchase/requisition");
  };

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      {!isCreate && existing && (
        <Form.Item label="PR No.">
          <Input value={existing.prNumber} disabled />
        </Form.Item>
      )}

      <div style={{ display: "flex", gap: 24 }}>
        <Form.Item label="PR Type" style={{ flex: 1 }}>
          <Controller
            name="prType"
            control={control}
            render={({ field }) => <Select {...field} disabled={readOnly} options={PR_TYPE_OPTIONS} />}
          />
        </Form.Item>
        <Form.Item label="Supplier (optional)" style={{ flex: 2 }}>
          <Controller
            name="supplier"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                value={field.value ?? undefined}
                onChange={(v) => field.onChange(v ?? null)}
                allowClear
                placeholder="No supplier - choose one on the PO"
                disabled={readOnly || !isCreate}
                showSearch
                optionFilterProp="label"
                options={eligibleSuppliers.map((p: any) => ({ value: p.id, label: `${p.partyCode} - ${p.partyName}` }))}
              />
            )}
          />
        </Form.Item>
        <Form.Item label="Raised By" style={{ flex: 1 }}>
          <Controller name="raisedBy" control={control} render={({ field }) => <Input {...field} disabled={readOnly} />} />
        </Form.Item>
        <Form.Item label="PR Date" style={{ flex: 1 }}>
          <Controller
            name="prDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                style={{ width: "100%" }}
                disabled={readOnly}
                value={field.value ? dayjs(field.value) : null}
                onChange={(d) => field.onChange(d ? d.format("YYYY-MM-DD") : "")}
              />
            )}
          />
        </Form.Item>
      </div>

      <Divider>Items</Divider>
      <Controller
        name="items"
        control={control}
        render={({ field }) => (
          <PRItemEntryGrid value={field.value as PRItemRow[]} onChange={field.onChange} itemOptions={itemOptions} readOnly={readOnly} />
        )}
      />

      <Divider />
      <Form.Item label="Remarks">
        <Controller name="remarks" control={control} render={({ field }) => <Input.TextArea {...field} disabled={readOnly} />} />
      </Form.Item>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Button onClick={() => navigate("/purchase/requisition")}>{readOnly ? "Close" : "Cancel"}</Button>
        {!readOnly && (
          <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
            Save Changes
          </Button>
        )}
      </div>
    </Form>
  );
}
