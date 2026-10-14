// src/features/parties/PartyMasterFormPage.tsx

import { useEffect, useMemo, useState } from "react";
import { Form, Button, Divider, message, Modal, Input } from "antd";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { DynamicTabForm } from "../../components/DynamicTabForm/DynamicTabForm";
import { partyTabsConfig } from "./partyTabsConfig";
import { partySchema, type PartyFormInput, type PartyFormValues } from "./schema";
import {
  usePartyQuery,
  useCreatePartyMutation,
  useUpdatePartyMutation,
  usePartySubTypesQuery,
  useCreatePartySubTypeMutation,
  type PartyApiPayload,
} from "./api";
import { useCompanySettingsStore } from "../settings/companySettingsStore";
import { PartyAttachmentUpload } from "./PartyAttachmentUpload";
import { useItemsQuery } from "../items/api";
import { saveFormDraft, loadFormDraft, clearFormDraft } from "../../lib/formDraft";

export function PartyMasterFormPage({ readOnly = false }: { readOnly?: boolean }) {
  const { partyCode } = useParams();
  const isCreate = !partyCode;
  const navigate = useNavigate();
  const location = useLocation();
  const { data: existing } = usePartyQuery(partyCode);
  const createParty = useCreatePartyMutation();
  const updateParty = useUpdatePartyMutation();
  const partyCodePrefix = useCompanySettingsStore((s) => s.partyCodePrefix);
  const { data: itemsData = [] } = useItemsQuery();
  const { data: subTypesData = [] } = usePartySubTypesQuery();
  const createSubType = useCreatePartySubTypeMutation();

  // one-line: the inline "+ Add new party type" modal — self-contained here
  // rather than a navigate-away flow, since PartySubTypeMaster is a
  // lightweight master (name + remarks) with a real POST endpoint already.
  const [subTypeModalOpen, setSubTypeModalOpen] = useState(false);
  const [newSubTypeName, setNewSubTypeName] = useState("");

  const draftKey = `party:${partyCode ?? "new"}`;

  // one-line: captured ONCE at mount via lazy initializer — immune to
  // re-renders, so it doesn't re-trigger the prefill logic on every keystroke.
  const [returnedItemCode] = useState<string | undefined>(() => (location.state as { newItemCode?: string } | null)?.newItemCode);

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm<PartyFormInput, unknown, PartyFormValues>({
    resolver: zodResolver(partySchema),
    defaultValues: existing ?? { status: "Active", partyCode: partyCodePrefix || "", items: [], contacts: [], shippingAddresses: [], bankAccounts: [] },
  });

  useEffect(() => {
    if (existing) reset(existing);
  }, [existing, reset]);

  // one-line: translates the loaded party's subTypeIds (numeric PK from the
  // API) back into the display name the Sub Type select actually binds to —
  // runs once both the party and the sub-types list are available.
  useEffect(() => {
    if (existing?.subTypeIds?.length && subTypesData.length) {
      const match = subTypesData.find((s) => s.id === existing.subTypeIds![0]);
      if (match) setValue("partySubType", match.subTypeName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing, subTypesData]);

  // one-line: restores whatever was in-progress BEFORE navigating away to
  // Item Master — runs once on mount, then clears the stored draft so a
  // later, unrelated visit to this same URL doesn't accidentally restore stale data.
  useEffect(() => {
    const draft = loadFormDraft<PartyFormInput>(draftKey);
    if (draft) {
      reset(draft);
      clearFormDraft(draftKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isCreate && partyCodePrefix && getValues("partyCode") === "") {
      setValue("partyCode", partyCodePrefix);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyCodePrefix]);

  function handleAddNewItem() {
    // one-line: save the CURRENT in-progress form before leaving the page —
    // this is the actual fix for "navigating away would lose your work."
    saveFormDraft(draftKey, getValues());
    navigate("/items/new", { state: { returnTo: location.pathname } });
  }

  async function confirmAddSubType() {
    if (!newSubTypeName.trim()) return;
    const created = await createSubType.mutateAsync({ subTypeName: newSubTypeName.trim() });
    setValue("partySubType", created.subTypeName);
    setSubTypeModalOpen(false);
    setNewSubTypeName("");
  }

  const hydratedTabsConfig = useMemo(
    () =>
      partyTabsConfig.map((tab) => {
        if (tab.repeatable && tab.arrayFieldName === "items") {
          return { ...tab, rowFields: tab.rowFields.map((f) => (f.name === "itemCode" ? { ...f, onAddNew: handleAddNewItem } : f)) };
        }
        if (!tab.repeatable && tab.key === "other") {
          return { ...tab, fields: tab.fields.map((f) => (f.name === "partySubType" ? { ...f, onAddNew: () => setSubTypeModalOpen(true) } : f)) };
        }
        return tab;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const onSubmit = async (values: PartyFormValues) => {
    // one-line: partySubType is a display-only field (the name) — it's never
    // sent to the API as-is. Translated to subTypeIds (the real FK array,
    // capped at one per the single-select decision) right here.
    const { partySubType, ...rest } = values;
    const matchedSubType = subTypesData.find((s) => s.subTypeName === partySubType);
    const payload: PartyApiPayload = { ...rest, subTypeIds: matchedSubType ? [matchedSubType.id] : [] };

    if (isCreate) await createParty.mutateAsync(payload);
    else await updateParty.mutateAsync({ partyCode: partyCode!, values: payload });
    message.success("Saved Successfully");
    navigate("/parties");
  };

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit,(formErrors) => {
    console.error("Form validation failed:", formErrors);
  })}>
      <DynamicTabForm
        tabs={hydratedTabsConfig}
        control={control}
        errors={errors}
        setValue={setValue}
        dynamicOptions={{ items: itemsData.map((i) => i.itemCode), partySubTypes: subTypesData.map((s) => s.subTypeName) }}
        initialDraftByArrayField={returnedItemCode ? { items: { itemCode: returnedItemCode } } : undefined}
        defaultActiveTabKey={returnedItemCode ? "item" : undefined}
        readOnly={readOnly}
      />
      <Divider />
      {!readOnly && <PartyAttachmentUpload control={control} />}
      <Divider />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Button onClick={() => navigate("/parties")}>{readOnly ? "Close" : "Cancel"}</Button>
        {!readOnly && (
          <Button type="primary" htmlType="submit">Save Changes</Button>
        )}
      </div>

      {!readOnly && (
        <Modal
          title="Add New Party Sub Type"
          open={subTypeModalOpen}
          onCancel={() => { setSubTypeModalOpen(false); setNewSubTypeName(""); }}
          onOk={confirmAddSubType}
          okText="Add"
          confirmLoading={createSubType.isPending}
        >
          <Input
            value={newSubTypeName}
            onChange={(e) => setNewSubTypeName(e.target.value)}
            placeholder="Sub type name"
            onPressEnter={confirmAddSubType}
          />
        </Modal>
      )}
    </Form>
  );
}
