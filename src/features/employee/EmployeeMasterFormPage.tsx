// // src/features/employee/EmployeeMasterFormPage.tsx
// import { useState } from "react";
// import { useNavigate, useParams } from "react-router-dom";
// import { type EmployeeFormValues } from "./schema";
// import { useEmployeeStore, peekNextEmployeeCodeSuffix } from "./store";
// import { DynamicTabForm } from "../../components/DynamicTabForm/DynamicTabForm";


// export function EmployeeMasterFormPage() {
//   const { id } = useParams();
//   const isCreate = !id;
//   const navigate = useNavigate();
//   const employees = useEmployeeStore((s) => s.employees);
//   const addEmployee = useEmployeeStore((s) => s.addEmployee);
//   const updateEmployee = useEmployeeStore((s) => s.updateEmployee);
//   const existing = employees.find((e) => e.id === id);

 



//   // Capture the suggested code once at mount, not on every render/submit.
//   const [suggestedCode] = useState(() =>
//     isCreate ? peekNextEmployeeCodeSuffix() : undefined,
//   );

//   const initialValues: EmployeeFormValues =
//     existing ?? ({ Status: "Active", EmployeeCode: suggestedCode } as EmployeeFormValues);

//   const onSubmit = (values: EmployeeFormValues) => {
//     let EmployeeCode = values.EmployeeCode;

//     // Only on CREATE, and only if the user left the code exactly as
//     // pre-filled: re-peek in case another employee was created meanwhile.
//     if (isCreate && EmployeeCode === suggestedCode) {
//       EmployeeCode = peekNextEmployeeCodeSuffix();
//     }    
//     const finalValues = { ...values, EmployeeCode };
//     if (id) updateEmployee(id, finalValues);
//     else addEmployee(finalValues);
//     navigate("/employee");
//   };

//   return (   
//        <DynamicTabForm
//             tabs={employeeTabsConfig}
//             control={control}
//             errors={errors}
//           />

//   );
// }

// src/features/parties/PartyMasterFormPage.tsx

import { Form, Button, Divider } from "antd";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import { DynamicTabForm } from "../../components/DynamicTabForm/DynamicTabForm";
import { employeeTabsConfig } from "./EmployeeTabsConfig";
import {
  EmployeeSchema,
  type EmployeeFormInput,
  type EmployeeFormValues,
} from "./schema";
import { useEmployeeStore, peekNextEmployeeCodeSuffix } from "./store";

export function EmployeeMasterFormPage() {
  const { id } = useParams();
  const isCreate = !id;
  const navigate = useNavigate();
  const employees = useEmployeeStore((s) => s.employees);
  const addEmployee = useEmployeeStore((s) => s.addEmployee);
  const updateEmployee = useEmployeeStore((s) => s.updateEmployee);
  const existing = employees.find((e) => e.id === id);


  const {
    control,   
    handleSubmit,
    formState: { errors },
  } = useForm<EmployeeFormInput, unknown, EmployeeFormValues>({
    resolver: zodResolver(EmployeeSchema),
    defaultValues: existing ?? {
      Status: "Active",
      EmployeeCode:  "",    
    },
  });


  const onSubmit = (values: EmployeeFormValues) => {
    let employeeCode = values.EmployeeCode;

    // one-line: THE auto-complete rule — only on CREATE, and only if the
    // user left the code exactly as pre-filled (didn't customize it).
    // Editing an existing employee NEVER regenerates its code, and a user who
    // typed their own value has that respected as-is, per "editable."
    if (isCreate && employeeCode) {
      employeeCode =  peekNextEmployeeCodeSuffix();
    }

    const finalValues = { ...values, employeeCode };
    if (id) updateEmployee(id, finalValues);
    else addEmployee(finalValues);
    navigate("/employee");
  };

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      <DynamicTabForm
        tabs={employeeTabsConfig}
        control={control}
        errors={errors}
      />
      <Divider />     
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Button onClick={() => navigate("/employee")}>Cancel</Button>
        <Button type="primary" htmlType="submit">
          Save Changes
        </Button>
      </div>
    </Form>
  );
}
