import { create } from "zustand";
import type { Employee } from "./types";
import type { EmployeeFormValues } from "./schema";

interface EmployeeStoreState {
  employees: Employee[];
  nextSequence: number;
  addEmployee: (values: EmployeeFormValues) => void;
  updateEmployee: (id: string, values: EmployeeFormValues) => void;
}

const seedEmployees: Employee[] = [
  {
    id: "1",
    EmployeeCode: "E001",
    EmployeeName: "Raju",
    Department: "IT",
    Designation: "Software Engineer",
    Address: "123 Main St, Chennai",
    MobileNumber: "1234567890",
    Qualification: "B.Tech",
    DateOfJoining: "2020-01-15",
    DateOfBirth: "1995-05-20",
    BloodGroup: "O+",
    Status: "Active",
  },
  {
    id: "2",
    EmployeeCode: "E002",
    EmployeeName: "Anbu",
    Department: "HR",
    Designation: "HR Manager",
    Address: "456 East St, Chennai",
    MobileNumber: "0987654321",
    Qualification: "MBA",
    DateOfJoining: "2019-03-10",
    DateOfBirth: "1990-08-15",
    BloodGroup: "A-",
    Status: "Active",
  }
];

export const useEmployeeStore = create<EmployeeStoreState>((set) => ({
  employees: seedEmployees,
  nextSequence: 3,
  addEmployee: (values) =>
    set((state) => ({
      employees: [...state.employees, { ...values, id: crypto.randomUUID() }],
      nextSequence: state.nextSequence + 1,
    })),
  updateEmployee: (id, values) =>
    set((state) => ({
      employees: state.employees.map((e) => (e.id === id ? { ...values, id } : e)),
    })),
}));

export function peekNextEmployeeCodeSuffix(): string {
  return String(useEmployeeStore.getState().nextSequence).padStart(4, "0");
}