// src/features/items/api.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";
import type { Item } from "./types";
import type { CustomFieldRow, ItemFormValues } from "./schema";

// The server stores each custom field as field_type / field_name plus one
// typed value column (text / date / float); the form works with
// { type, name, value }. Convert at the API boundary in both directions.
interface ServerCustomField {
  id?: number;
  fieldType: "Text" | "Date" | "Float";
  fieldName: string;
  textValue?: string | null;
  dateValue?: string | null;
  floatValue?: number | null;
}

function toServerCustomField(row: CustomFieldRow): ServerCustomField {
  if (row.type === "Date") return { fieldType: "Date", fieldName: row.name, dateValue: row.value || null };
  if (row.type === "Float") return { fieldType: "Float", fieldName: row.name, floatValue: row.value ?? null };
  return { fieldType: "Text", fieldName: row.name, textValue: row.value || null };
}

function fromServerCustomField(field: ServerCustomField): CustomFieldRow {
  if (field.fieldType === "Date") return { type: "Date", name: field.fieldName, value: field.dateValue ?? undefined };
  if (field.fieldType === "Float") return { type: "Float", name: field.fieldName, value: field.floatValue ?? undefined };
  return { type: "Text", name: field.fieldName, value: field.textValue ?? undefined };
}

function toServerItem(values: ItemFormValues) {
  return { ...values, customFields: (values.customFields ?? []).map(toServerCustomField) };
}

function fromServerItem(item: Item & { customFields?: ServerCustomField[] }): Item {
  return { ...item, customFields: (item.customFields ?? []).map(fromServerCustomField) } as Item;
}

interface Unit {
  id: number;
  unitCode: string;
  unitName: string;
}

const itemKeys = {
  all: ["items"] as const,
  detail: (itemCode: string) => [...itemKeys.all, "detail", itemCode] as const,
};

// one-line: SEPARATE query key namespace ("units") from item queries — this
// is deliberately cross-feature (items reading units/ API), same pattern as
// Party Master reading Item Master's API for its Item Code dropdown.
export function useUnitsQuery() {
  return useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      const { data } = await apiClient.get<Unit[]>("/units/");
      return data;
    },
  });
}

export function useItemsQuery() {
  return useQuery({
    queryKey: itemKeys.all,
    queryFn: async () => {
      const { data } = await apiClient.get<Item[]>("/items/");
      return data;
    },
  });
}

export function useItemQuery(itemCode: string | undefined) {
  return useQuery({
    queryKey: itemKeys.detail(itemCode ?? "__new__"),
    queryFn: async () => {
      const { data } = await apiClient.get<Item>(`/items/${itemCode}/`);
      return fromServerItem(data as Item & { customFields?: ServerCustomField[] });
    },
    enabled: !!itemCode,
  });
}

export function useCreateItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: ItemFormValues) => {
      const { data } = await apiClient.post<Item>("/items/", toServerItem(values));
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: itemKeys.all }),
  });
}

export function useUpdateItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemCode, values }: { itemCode: string; values: ItemFormValues }) => {
      const { data } = await apiClient.put<Item>(`/items/${itemCode}/`, toServerItem(values));
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: itemKeys.all }),
  });
}
export function useDeleteItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (itemCode: string) => {
      await apiClient.delete(`/items/${itemCode}/`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: itemKeys.all }),
  });
}
