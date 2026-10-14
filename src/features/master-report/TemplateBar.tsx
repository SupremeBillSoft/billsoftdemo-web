import { Button, Checkbox, Flex, Input, Modal, Popconfirm, Select, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";

import { createTemplate, deleteTemplate, errorMessage, fetchTemplates, updateTemplate } from "./api";
import { useMasterReportStore } from "./store";
import type { MasterMeta, ReportRequest, ReportTemplate, ReportTemplateInput } from "./types";

interface Props {
  master: MasterMeta;
  /** The report as currently configured (valid filters only), or null when nothing can be saved yet. */
  request: ReportRequest | null;
  onSuccess: (text: string) => void;
  onError: (text: string) => void;
}

export function TemplateBar({ master, request, onSuccess, onError }: Props) {
  const templateId = useMasterReportStore((s) => s.templateId);
  const setTemplateId = useMasterReportStore((s) => s.setTemplateId);
  const applyTemplate = useMasterReportStore((s) => s.applyTemplate);
  const showBusinessHeader = useMasterReportStore((s) => s.showBusinessHeader);
  const showSerialNo = useMasterReportStore((s) => s.showSerialNo);
  const parentOnce = useMasterReportStore((s) => s.parentOnce);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [shared, setShared] = useState(false);
  const [saving, setSaving] = useState(false);

  const masterKey = master.key;
  const canSave = request !== null && request.columns.length > 0;
  const current = templates.find((t) => t.id === templateId) ?? null;

  

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setTemplates(await fetchTemplates(masterKey));
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [masterKey, onError]);

  useEffect(() => {
    void reload();
    // reload only when the master changes; onError identity changes are not a reason to refetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterKey]);

  const openModal = () => {
    setName("");
    setShared(false);
    setModalOpen(true);
  };

  const toInput = (templateName: string, isShared: boolean): ReportTemplateInput | null => {
    if (!request) return null;
    return {
      master_key: masterKey,
      name: templateName,
      columns: request.columns,
      conditions: request.conditions,
      logic: request.logic,
      show_business_header: showBusinessHeader,
      show_serial_no: showSerialNo,      
      show_parent_once: parentOnce,
      is_shared: isShared,
    };
  };

  const saveNew = async () => {
    const input = toInput(name.trim(), shared);
    if (!input || input.name === "") {
      onError("Enter a name for the template");
      return;
    }
    setSaving(true);
    try {
      const created = await createTemplate(input);
      setModalOpen(false);
      setName("");
      setShared(false);
      await reload();
      setTemplateId(created.id);
      onSuccess(`Template "${created.name}" saved`);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const updateCurrent = async () => {
    if (!current) return;
    const input = toInput(current.name, current.is_shared);
    if (!input) return;
    setSaving(true);
    try {
      await updateTemplate(current.id, input);
      await reload();
      onSuccess(`Template "${current.name}" updated`);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const removeCurrent = async () => {
    if (!current) return;
    try {
      await deleteTemplate(current.id);
      setTemplateId(null);
      await reload();
      onSuccess(`Template "${current.name}" deleted`);
    } catch (e) {
      onError(errorMessage(e));
    }
  };

  return (
    <Flex vertical gap={8}>
      <Select
        allowClear
        showSearch
        optionFilterProp="label"
        placeholder={templates.length === 0 && !loading ? "No saved templates yet" : "Load a saved template"}
        loading={loading}
        value={templateId ?? undefined}
        options={templates.map((t) => ({ value: t.id, label: t.is_shared ? `${t.name} (shared)` : t.name }))}
        onChange={(id: number) => {
          const t = templates.find((x) => x.id === id);
          if (t) applyTemplate(master, t);
        }}
        onClear={() => setTemplateId(null)}
      />
      <Flex gap={8} wrap>
        <Button size="small" disabled={!canSave || !current} loading={saving} onClick={() => void updateCurrent()}>
          Update
        </Button>
        <Button size="small" disabled={!canSave} onClick={openModal}>
          Save as new…
        </Button>
        <Popconfirm title="Delete this template?" okText="Delete" onConfirm={() => void removeCurrent()} disabled={!current}>
          <Button size="small" danger disabled={!current}>
            Delete
          </Button>
        </Popconfirm>
      </Flex>

      <Modal
        title="Save report template"
        open={modalOpen}
        okText="Save"
        confirmLoading={saving}
        onOk={() => void saveNew()}
        onCancel={() => setModalOpen(false)}
      >
        <Flex vertical gap={12}>
          <Typography.Text type="secondary">
            Saves the current master, columns (in this order), filters and options.
          </Typography.Text>
          <Input placeholder="Template name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
          <Checkbox checked={shared} onChange={(e) => setShared(e.target.checked)}>
            Share with everyone in my organisation
          </Checkbox>
        </Flex>
      </Modal>
    </Flex>
  );
}
