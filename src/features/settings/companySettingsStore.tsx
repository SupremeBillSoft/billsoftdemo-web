// src/features/settings/companySettingsStore.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CompanySettingsState {
  partyCodePrefix: string; // 6-char alphanumeric, or "" if not configured  
  setPartyCodePrefix: (prefix: string) => void;  
}

export const useCompanySettingsStore = create<CompanySettingsState>()(
  persist(
    (set) => ({
      partyCodePrefix: "",
      setPartyCodePrefix: (prefix) => set({ partyCodePrefix: prefix }),
    }),  
    { name: "billsoft-company-settings" }
  )
);