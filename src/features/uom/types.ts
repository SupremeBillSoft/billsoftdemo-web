import type { UomFormValues } from "./schema";

export interface Unit extends UomFormValues {
  id: string;
}

export interface PaginatedResponse<T> {
  results: T[];
  total: number;
}