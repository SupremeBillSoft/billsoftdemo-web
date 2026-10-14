// src/features/parties/PartySearchListPage.tsx

import { useMemo, useState } from "react";
import { Table, Button, Input, Select, Tag, Modal, message, Dropdown } from "antd";
import type { MenuProps } from "antd";
import { DownOutlined, UpOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import type { ColumnsType } from "antd/es/table";
import { usePartiesQuery, useDeletePartyMutation } from "./api";
import type { Party } from "./types";

const STATUS_COLORS: Record<string, string> = {
  Active: "green",
  "Suspend/Hold": "gold",
  Inactive: "default",
};

const PARTY_TYPE_OPTIONS = [
  { value: "Customer", label: "Customer" },
  { value: "Customer Export", label: "Customer Export" },
  { value: "Vendor", label: "Vendor" },
];

const STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "Suspend/Hold", label: "Suspend/Hold" },
  { value: "Inactive", label: "Inactive" },
];

// one-line: derives the Party Type tags straight from the three independent
// checkboxes — NOT from the old free-text partyType field, which is disabled.
function getPartyTypes(party: Party): string[] {
  const types: string[] = [];
  if (party.isCustomer) types.push("Customer");
  if (party.isExportCustomer) types.push("Customer Export");
  if (party.isVendor) types.push("Vendor");
  return types;
}
interface FilterState {
  partyName: string;
  partyCode: string;
  gstNo: string;
  mobileNo: string;
  city: string;
  partyType?: string;
  status?: string;
}

const EMPTY_FILTERS: FilterState = {
  partyName: "",
  partyCode: "",
  gstNo: "",
  mobileNo: "",
  city: "",
  partyType: undefined,
  status: undefined,
};

export function PartySearchListPage() {
  const { data: parties = [] } = usePartiesQuery();
  const deleteParty = useDeletePartyMutation();
  const navigate = useNavigate();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");

  // one-line: draft holds what's typed in the panel; appliedFilters is what
  // actually filters the table — kept separate so typing doesn't filter
  // live, only clicking Search does (same "click to act" spirit as sorting).
  const [draftFilters, setDraftFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(EMPTY_FILTERS);

  // one-line: most-recently-created first, by default, with no active sort
  // indicator — Table's own `sorter` below only kicks in once the person
  // actually clicks a sortable column header.
  const recentFirst = useMemo(() => [...parties].sort((a, b) => b.id - a.id), [parties]);

  const filtered = useMemo(() => {
    return recentFirst.filter((p) => {
      if (quickSearch && !p.partyName.toLowerCase().includes(quickSearch.toLowerCase()) && !p.partyCode.toLowerCase().includes(quickSearch.toLowerCase())) {
        return false;
      }
      if (appliedFilters.partyName && !p.partyName.toLowerCase().includes(appliedFilters.partyName.toLowerCase())) return false;
      if (appliedFilters.partyCode && !p.partyCode.toLowerCase().includes(appliedFilters.partyCode.toLowerCase())) return false;
      if (appliedFilters.gstNo && !(p.gstNo ?? "").toLowerCase().includes(appliedFilters.gstNo.toLowerCase())) return false;
      if (appliedFilters.mobileNo && !(p.mobileNo ?? "").includes(appliedFilters.mobileNo)) return false;
      if (appliedFilters.city && !(p.city ?? "").toLowerCase().includes(appliedFilters.city.toLowerCase())) return false;
      if (appliedFilters.partyType && !getPartyTypes(p).includes(appliedFilters.partyType)) return false;
      if (appliedFilters.status && p.status !== appliedFilters.status) return false;
      return true;
    });
  }, [recentFirst, quickSearch, appliedFilters]);

  function handleSearch() {
    setAppliedFilters(draftFilters);
  }

  function handleShowAll() {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setQuickSearch("");
  }
  
  function getRowMenu(record: Party): MenuProps["items"] {
    return [
      {
        key: "view",
        label: "View",
        onClick: () => navigate(`/parties/${record.partyCode}/view`),
      },
      {
        key: "edit",
        label: "Edit",
        onClick: () => navigate(`/parties/${record.partyCode}`),
      },
      { type: "divider" },
      {
        key: "delete",
        label: "Delete",
        danger: true,
        onClick: () => handleDelete(record),
      },
    ];
  }

  function handleDelete(record: Party) {
    Modal.confirm({
      title: `Delete "${record.partyName}"?`,
      content: "This action cannot be undone.",
      okText: "Delete",
      okButtonProps: { danger: true },
      centered: true,
      onOk: async () => {
        await deleteParty.mutateAsync(record.partyCode);
        message.success("Deleted successfully");
      },
    });
  }

  const columns: ColumnsType<Party> = [
    {
      title: "Party Name",
      dataIndex: "partyName",
      sorter: (a, b) => a.partyName.localeCompare(b.partyName),
    },
    {
      title: "Party Code",
      dataIndex: "partyCode",
      sorter: (a, b) => a.partyCode.localeCompare(b.partyCode),
    },
    {
      title: "GSTIN No.",
      dataIndex: "gstNo",
      sorter: (a, b) => (a.gstNo ?? "").localeCompare(b.gstNo ?? ""),
      render: (v) => v || "—",
    },
    { title: "Mobile Number", dataIndex: "mobileNo", render: (v) => v || "—" },
    { title: "Address (City)", dataIndex: "city", render: (v) => v || "—" },
    {
      title: "Party Type",
      key: "partyType",
      render: (_, record) => {
        const types = getPartyTypes(record);
        return types.length ? types.map((t) => <Tag key={t}>{t}</Tag>) : "—";
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status]}>{status}</Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Dropdown menu={{ items: getRowMenu(record) }}>
          <a onClick={(e) => e.preventDefault()}>⋮</a>
        </Dropdown>
      ),
    },
  ];

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Parties</h2>

      <div style={{ border: "1px solid #E4E1DA", borderRadius: 8, padding: 16, marginBottom: 18 }}>
        <div
          style={{ cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
          onClick={() => setFiltersOpen((o) => !o)}
        >
          {filtersOpen ? <UpOutlined /> : <DownOutlined />} Search & Filter
        </div>
        {filtersOpen && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 14 }}>
              <div>
                <div style={{ fontSize: 11.5, marginBottom: 5 }}>Party Name</div>
                <Input value={draftFilters.partyName} onChange={(e) => setDraftFilters((f) => ({ ...f, partyName: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 11.5, marginBottom: 5 }}>Party Code</div>
                <Input value={draftFilters.partyCode} onChange={(e) => setDraftFilters((f) => ({ ...f, partyCode: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 11.5, marginBottom: 5 }}>GSTIN No.</div>
                <Input value={draftFilters.gstNo} onChange={(e) => setDraftFilters((f) => ({ ...f, gstNo: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 11.5, marginBottom: 5 }}>Mobile Number</div>
                <Input value={draftFilters.mobileNo} onChange={(e) => setDraftFilters((f) => ({ ...f, mobileNo: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 11.5, marginBottom: 5 }}>City</div>
                <Input value={draftFilters.city} onChange={(e) => setDraftFilters((f) => ({ ...f, city: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 11.5, marginBottom: 5 }}>Party Type</div>
                <Select
                  allowClear
                  style={{ width: "100%" }}
                  placeholder="All"
                  options={PARTY_TYPE_OPTIONS}
                  value={draftFilters.partyType}
                  onChange={(v) => setDraftFilters((f) => ({ ...f, partyType: v }))}
                />
              </div>
              <div>
                <div style={{ fontSize: 11.5, marginBottom: 5 }}>Status</div>
                <Select
                  allowClear
                  style={{ width: "100%" }}
                  placeholder="All"
                  options={STATUS_OPTIONS}
                  value={draftFilters.status}
                  onChange={(v) => setDraftFilters((f) => ({ ...f, status: v }))}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <Button type="primary" onClick={handleSearch}>Search</Button>
              <Button onClick={handleShowAll}>Show All</Button>
            </div>
          </>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <Input.Search placeholder="Quick search..." value={quickSearch} onChange={(e) => setQuickSearch(e.target.value)} style={{ maxWidth: 280 }} />
        <Button type="primary" onClick={() => navigate("/parties/new")}>+ Create Party</Button>
      </div>

      <Table<Party>
        dataSource={filtered}
        rowKey="id"
        columns={columns}
      />
    </div>
  );
}
