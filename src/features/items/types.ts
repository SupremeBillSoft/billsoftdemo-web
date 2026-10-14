import type { ItemFormValues } from "./schema";

export interface Item extends ItemFormValues {
  id: string;
}

export interface PaginatedResponse<T> {
  results: T[];
  total: number;
}