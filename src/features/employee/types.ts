import type { EmployeeFormValues } from "./schema";

export interface Employee extends EmployeeFormValues {
  id: string;  
}


export interface PaginatedResponse<T> {
  results: T[];
  total: number;
}