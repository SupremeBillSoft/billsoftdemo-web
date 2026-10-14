// src/lib/partyEligibility.ts
//
// BRD 6.2.2 Party Screen Approval: inactive / suspended parties can't be
// picked on a new transaction. Mirrors BLOCKED_PARTY_STATUSES in
// purchase/serializers.py (the backend enforces it too).
// TODO: also hide parties whose approval is pending/rejected once the Party
// approval screen exists.

const BLOCKED_PARTY_STATUSES = new Set(["Inactive", "Suspend/Hold"]);

export function isUsableSupplier(party: { isVendor?: boolean; status?: string }): boolean {
  return !!party.isVendor && !BLOCKED_PARTY_STATUSES.has(party.status ?? "");
}
