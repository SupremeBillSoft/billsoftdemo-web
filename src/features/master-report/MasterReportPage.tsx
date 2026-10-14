import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Flex,
  Row,
  Select,
  Spin,
  Typography,
  message,
} from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  EXPORT_MAX_POLLS,
  EXPORT_POLL_MS,
  downloadBlob,
  downloadExportJob,
  errorMessage,
  exportReport,
  fetchExportJob,
  fetchMasters,
  runReport,
  startAsyncExport,
  exportReportPdf,
  printBlob,
} from "./api";
import { ColumnOrder } from "./ColumnOrder";
import { ColumnPicker } from "./ColumnPicker";
import { ConditionBuilder } from "./ConditionBuilder";
import { ReportPreview } from "./ReportPreview";
import { buildRequest } from "./schemas";
import { useMasterReportStore } from "./store";
import { TemplateBar } from "./TemplateBar";
import type {
  ExportJob,
  MasterMeta,
  ReportRequest,
  RunResponse,
} from "./types";
import { ParentOnceOption } from "./ParentOnceOption";

const EXPORT_MESSAGE_KEY = "report-export";
const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export default function MasterReportPage() {
  const [messageApi, contextHolder] = message.useMessage();

  const [masters, setMasters] = useState<MasterMeta[]>([]);
  const [loadingMasters, setLoadingMasters] = useState(true);
  const [result, setResult] = useState<RunResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const mounted = useRef(true);

  const masterKey = useMasterReportStore((s) => s.masterKey);
  const columns = useMasterReportStore((s) => s.columns);
  const conditions = useMasterReportStore((s) => s.conditions);
  const logic = useMasterReportStore((s) => s.logic);
  const page = useMasterReportStore((s) => s.page);
  const pageSize = useMasterReportStore((s) => s.pageSize);
  const showBusinessHeader = useMasterReportStore((s) => s.showBusinessHeader);
  const showSerialNo = useMasterReportStore((s) => s.showSerialNo);
  const selectMaster = useMasterReportStore((s) => s.selectMaster);
  const setPage = useMasterReportStore((s) => s.setPage);
  const setPageSize = useMasterReportStore((s) => s.setPageSize);
  const setShowBusinessHeader = useMasterReportStore(
    (s) => s.setShowBusinessHeader,
  );
  const setShowSerialNo = useMasterReportStore((s) => s.setShowSerialNo);
  const parentOnce = useMasterReportStore((s) => s.parentOnce);
  const master = useMemo(
    () => masters.find((m) => m.key === masterKey) ?? null,
    [masters, masterKey],
  );
  const [busy, setBusy] = useState<"pdf" | "print" | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // The list of masters and their columns comes from the backend, so a new master needs no change here.
  useEffect(() => {
    let cancelled = false;
    fetchMasters()
      .then((list) => {
        if (!cancelled) setMasters(list);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setLoadingMasters(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const built = useMemo(
    () =>
      master
        ? buildRequest({ master, columns, conditions, logic, page, pageSize })
        : null,
    [master, columns, conditions, logic, page, pageSize],
  );
  const canRun = built !== null && built.request.columns.length > 0;

  const request = useMemo<ReportRequest | null>(
    () => (built ? { ...built.request, parent_once: parentOnce } : null),
    [built, parentOnce],
  );

  // Live preview: re-run shortly after any change; stale responses are ignored.
  useEffect(() => {
    if (!master || !built || built.request.columns.length === 0) {
      requestId.current += 1;
      setResult(null);
      setRunning(false);
      return;
    }
    const id = (requestId.current += 1);
    const timer = setTimeout(() => {
      setRunning(true);
      setError(null);
      runReport(master.key, built.request)
        .then((res) => {
          if (id === requestId.current) setResult(res);
        })
        .catch((e: unknown) => {
          if (id === requestId.current) setError(errorMessage(e));
        })
        .finally(() => {
          if (id === requestId.current) setRunning(false);
        });
    }, 350);
    return () => clearTimeout(timer);
  }, [master, built]);

  // Large reports are built by a background job; the server tells us where the limit is.
  const rowCount = result?.count ?? 0;
  const useBackgroundExport =
    result !== null && rowCount > result.sync_export_limit;

  const notifySuccess = useCallback(
    (text: string) => void messageApi.success(text),
    [messageApi],
  );
  const notifyError = useCallback(
    (text: string) => void messageApi.error(text),
    [messageApi],
  );

  const runBackgroundExport = async (
    key: string,
    payload: ReportRequest,
    count: number,
  ) => {
    messageApi.open({
      key: EXPORT_MESSAGE_KEY,
      type: "loading",
      content: `Preparing ${count.toLocaleString("en-IN")} rows in the background. You can keep working.`,
      duration: 0,
    });
    try {
      let job: ExportJob = await startAsyncExport(key, payload);
      for (
        let i = 0;
        i < EXPORT_MAX_POLLS &&
        job.status !== "done" &&
        job.status !== "failed";
        i += 1
      ) {
        await sleep(EXPORT_POLL_MS);
        if (!mounted.current) return;
        job = await fetchExportJob(job.id);
      }
      if (job.status === "failed")
        throw new Error(job.error || "The export failed");
      if (job.status !== "done")
        throw new Error(
          "The export is taking longer than expected. Please try again later.",
        );

      const { blob, filename } = await downloadExportJob(job.id);
      downloadBlob(blob, filename);
      messageApi.open({
        key: EXPORT_MESSAGE_KEY,
        type: "success",
        content: "Excel file downloaded",
        duration: 3,
      });
    } catch (e) {
      messageApi.open({
        key: EXPORT_MESSAGE_KEY,
        type: "error",
        content: errorMessage(e),
        duration: 6,
      });
    }
  };

  const handleExport = async () => {
    if (!master || !built || !canRun) return;
    setExporting(true);
    const payload: ReportRequest = {
      ...built.request,
      include_business_header: showBusinessHeader,
      include_serial_no: showSerialNo,
    };
    try {
      if (useBackgroundExport) {
        await runBackgroundExport(master.key, payload, rowCount);
      } else {
        const { blob, filename } = await exportReport(master.key, payload);
        downloadBlob(blob, filename);
        messageApi.success("Excel file downloaded");
      }
    } catch (e) {
      messageApi.error(errorMessage(e));
    } finally {
      if (mounted.current) setExporting(false);
    }
  };

  const handlePdf = async (mode: "pdf" | "print") => {
    if (!master || !request || !canRun) return;
    setBusy(mode);
    try {
      const { blob, filename } = await exportReportPdf(master.key, {
        ...request,
        include_business_header: showBusinessHeader,
        include_serial_no: showSerialNo,
      });
      if (mode === "print") printBlob(blob);
      else downloadBlob(blob, filename);
    } catch (e) {
      messageApi.error(errorMessage(e));
    } finally {
      if (mounted.current) setBusy(null);
    }
  };
  return (
    <Flex vertical gap={16} style={{ padding: 16 }}>
      {contextHolder}

      <Flex justify="space-between" align="center" wrap gap={8}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Master Report Builder
        </Typography.Title>
        <Flex align="center" gap={12} wrap>
          {useBackgroundExport && (
            <Typography.Text type="secondary">
              Large report: the file is prepared in the background and downloads
              when ready
            </Typography.Text>
          )}
          <Button
            type="primary"
            onClick={() => void handleExport()}
            loading={exporting}
            disabled={!canRun}
          >
            Export to Excel
          </Button>
          <Button
            onClick={() => void handlePdf("print")}
            loading={busy === "print"}
            disabled={!canRun}
          >
            Print
          </Button>
          <Button
            onClick={() => void handlePdf("pdf")}
            loading={busy === "pdf"}
            disabled={!canRun}
          >
            PDF
          </Button>
        </Flex>
      </Flex>

      {error && (
        <Alert
          type="error"
          showIcon
          closable
          message={error}
          onClose={() => setError(null)}
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8} xl={7}>
          <Flex vertical gap={16}>
            <Card size="small" title="1 · Master">
              <Select
                style={{ width: "100%" }}
                showSearch
                optionFilterProp="label"
                placeholder="Select a master"
                loading={loadingMasters}
                value={masterKey ?? undefined}
                options={masters.map((m) => ({ value: m.key, label: m.label }))}
                onChange={(key: string) => {
                  setResult(null);
                  selectMaster(masters.find((m) => m.key === key) ?? null);
                }}
              />
            </Card>

            {master && (
              <>
                <Card size="small" title="Saved templates">
                  <TemplateBar
                    master={master}
                    request={canRun && built ? built.request : null}
                    onSuccess={notifySuccess}
                    onError={notifyError}
                  />
                </Card>
                <Card size="small" title="2 · Columns">
                  <ColumnPicker master={master} />
                </Card>
                <Card size="small" title="3 · Order">
                  <ColumnOrder master={master} />
                </Card>
                <Card size="small" title="Report options">
                  <Flex vertical gap={8}>
                    <Checkbox
                      checked={showBusinessHeader}
                      onChange={(e) => setShowBusinessHeader(e.target.checked)}
                    >
                      Business header
                    </Checkbox>
                    <Checkbox
                      checked={showSerialNo}
                      onChange={(e) => setShowSerialNo(e.target.checked)}
                    >
                      Serial number column
                    </Checkbox>
                  </Flex>
                </Card>
              </>
            )}
          </Flex>
        </Col>

        <Col xs={24} lg={16} xl={17}>
          <Flex vertical gap={16}>
            {master && built && (
              <Card size="small" title="Filters">
                <ConditionBuilder master={master} ignored={built.ignored} />
              </Card>
            )}
            <Card
              size="small"
              title={master ? `Preview · ${master.label}` : "Preview"}
            >
              <Spin spinning={running}>
                <ReportPreview
                  result={result}
                  showBusinessHeader={showBusinessHeader}
                  showSerialNo={showSerialNo}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={(p, size) =>
                    size !== pageSize ? setPageSize(size) : setPage(p)
                  }
                />
              </Spin>
            </Card>
          </Flex>
        </Col>
      </Row>
    </Flex>
  );
}
