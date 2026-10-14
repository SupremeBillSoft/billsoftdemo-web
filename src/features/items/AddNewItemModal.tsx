// src/features/items/AddNewItemModal.tsx

import { Modal, Form, Input, message } from "antd";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { quickAddItemSchema, type QuickAddItemValues, type ItemFormValues } from "./schema";
import { useCreateItemMutation } from "./api";
import { showApiErrorPopup } from "../../lib/apiError";

export function AddNewItemModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createItem = useCreateItemMutation();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuickAddItemValues>({ resolver: zodResolver(quickAddItemSchema) });

  const onSubmit = async (values: QuickAddItemValues) => {
    // one-line: fills in the fields itemSchema's .default() would normally
    // supply — itemType/itemStatus/customFields are REQUIRED in
    // ItemFormValues (Zod's z.output type makes a defaulted field
    // non-optional), so a partial quick-add form needs them supplied by
    // hand here, not cast away with `any`.
    const fullValues: ItemFormValues = {
      ...values,
      itemType: "Product",
      itemStatus: "Active",
      customFields: [],
    };

    try {
      await createItem.mutateAsync(fullValues);
      message.success(`Item "${values.itemCode}" created`);
      reset();
      onClose();
    } catch (error) {
      showApiErrorPopup("Failed to create item", error);
    }
  };

  return (
    <Modal title="Add New Item" open={open} onCancel={onClose} onOk={handleSubmit(onSubmit)} confirmLoading={createItem.isPending} okText="Create Item">
      <Form layout="vertical">
        <Controller name="itemCode" control={control} render={({ field }) => (
          <Form.Item label="Item Code" required validateStatus={errors.itemCode ? "error" : ""} help={errors.itemCode?.message}>
            <Input {...field} />
          </Form.Item>
        )} />
        <Controller name="itemName" control={control} render={({ field }) => (
          <Form.Item label="Item Name" required validateStatus={errors.itemName ? "error" : ""} help={errors.itemName?.message}>
            <Input {...field} />
          </Form.Item>
        )} />
        <Controller name="billingUom" control={control} render={({ field }) => (
          <Form.Item label="Billing UOM" required validateStatus={errors.billingUom ? "error" : ""} help={errors.billingUom?.message}>
            <Input {...field} />
          </Form.Item>
        )} />
      </Form>
      <div style={{ fontSize: 11.5, color: "rgba(0,0,0,0.45)", marginTop: 4 }}>
        Creates a real Item Master record — edit the rest of its details from Item Master later.
      </div>
    </Modal>
  );
}