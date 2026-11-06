import { adminAuthFetch, getAdminToken } from "./admin-auth";
import type { Paginated } from "./admin-api";
import { API_URL } from "./config";

type ApiErrorBody = { error?: string; message?: string };

export type AdminPayoutStatus = "requested" | "paid" | "rejected";

// Mirrors ledger.Payout (back/internal/domain/ledger/ledger.go). The bank
// fields are the snapshot taken when the merchant requested the payout.
export type AdminPayout = {
  id: string;
  merchant_id: string;
  merchant_name?: string;
  amount: number;
  status: AdminPayoutStatus | string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  requested_at: string;
  processed_at?: string | null;
  reference?: string | null;
  reject_reason?: string | null;
};

// Mirrors ledger.MerchantBalance.
export type AdminMerchantBalance = {
  merchant_id: string;
  merchant_name: string;
  balance: number;
  open_payout_id?: string | null;
  open_payout_amount: number;
};

// Mirrors ledger.Entry (signed amount: credits positive, debits negative).
export type AdminLedgerEntry = {
  id: string;
  merchant_id: string;
  entry_type: string;
  amount: number;
  payment_id?: string;
  payout_id?: string;
  refund_id?: string;
  note: string;
  created_at: string;
};

// Mirrors ledger.RefundItem / ledger.RefundSummary.
export type AdminRefundItem = {
  id: string;
  amount: number;
  reason: string;
  created_at: string;
};

export type AdminRefundSummary = {
  items: AdminRefundItem[] | null;
  merchant_net_amount: number;
  refunded_amount: number;
  remaining_refundable: number;
  refundable: boolean;
};

export type AdminRefundResult = {
  refund: AdminRefundItem;
  payment_status: string;
  remaining_refundable: number;
};

export const PAYOUT_REFERENCE_MAX = 200;
export const PAYOUT_REASON_MAX = 500;
export const REFUND_REASON_MAX = 500;
export const ADJUSTMENT_REASON_MAX = 500;
// ledger.MaxAdjustment; the server is authoritative, this only bounds input.
export const ADJUSTMENT_MAX_ABS = 1_000_000_000_000;

function authHeaders(): HeadersInit {
  const token = getAdminToken();
  if (!token) throw new Error("Session expired. Please sign in again.");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function parse<T>(res: Response, fallback: string): Promise<T> {
  const body = (await res.json().catch(() => null)) as T | ApiErrorBody | null;
  if (!res.ok) {
    throw new Error((body as ApiErrorBody | null)?.message ?? fallback);
  }
  return body as T;
}

function query(params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === "") return;
    q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

async function get<T>(path: string, fallback: string): Promise<T> {
  const res = await adminAuthFetch(`${API_URL}${path}`, {
    method: "GET",
    headers: authHeaders(),
    cache: "no-store",
  });
  return parse<T>(res, fallback);
}

async function post<T>(
  path: string,
  payload: unknown,
  fallback: string,
): Promise<T> {
  const res = await adminAuthFetch(`${API_URL}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return parse<T>(res, fallback);
}

export function fetchAdminPayouts(params: {
  status?: string;
  limit?: number;
  offset?: number;
}) {
  return get<Paginated<AdminPayout>>(
    `/api/v1/admin/payouts${query(params)}`,
    "Failed to load payouts.",
  );
}

export function markPayoutPaid(id: string, reference: string) {
  return post<AdminPayout>(
    `/api/v1/admin/payouts/${encodeURIComponent(id)}/pay`,
    { reference },
    "Failed to mark payout as paid.",
  );
}

export function rejectPayout(id: string, reason: string) {
  return post<AdminPayout>(
    `/api/v1/admin/payouts/${encodeURIComponent(id)}/reject`,
    { reason },
    "Failed to reject payout.",
  );
}

export function fetchAdminBalances(params: {
  negative?: boolean;
  limit?: number;
  offset?: number;
}) {
  return get<Paginated<AdminMerchantBalance>>(
    `/api/v1/admin/balances${query({
      negative: params.negative ? "true" : undefined,
      limit: params.limit,
      offset: params.offset,
    })}`,
    "Failed to load balances.",
  );
}

// The balances endpoint caps a page at 100 rows; walk every page so the
// merchants list can look a balance up by merchant id.
export async function fetchAllAdminBalances(): Promise<
  Map<string, AdminMerchantBalance>
> {
  const out = new Map<string, AdminMerchantBalance>();
  const pageSize = 100;
  // Costs ceil(N / 100) requests for N merchants (no per-merchant filter on
  // the backend). Hitting the cap means the map would be incomplete, so fail.
  const maxPages = 100;
  for (let i = 0, offset = 0; ; i += 1, offset += pageSize) {
    if (i >= maxPages) throw new Error("Balance unavailable");
    const page = await fetchAdminBalances({ limit: pageSize, offset });
    const items = page.items ?? [];
    items.forEach((b) => out.set(b.merchant_id, b));
    if (items.length < pageSize || offset + pageSize >= (page.total ?? 0)) break;
  }
  return out;
}

export function fetchAdminMerchantLedger(
  merchantId: string,
  limit = 20,
  offset = 0,
) {
  return get<Paginated<AdminLedgerEntry>>(
    `/api/v1/admin/merchants/${encodeURIComponent(merchantId)}/ledger${query({ limit, offset })}`,
    "Failed to load balance history.",
  );
}

// Positive credits the merchant, negative debits. The reason is visible to
// the merchant. Integer rupiah only.
export function adjustMerchantBalance(
  merchantId: string,
  amount: number,
  reason: string,
) {
  return post<AdminLedgerEntry>(
    `/api/v1/admin/merchants/${encodeURIComponent(merchantId)}/adjustments`,
    { amount, reason },
    "Failed to record adjustment.",
  );
}

export function fetchPaymentRefunds(paymentId: string) {
  return get<AdminRefundSummary>(
    `/api/v1/admin/payments/${encodeURIComponent(paymentId)}/refunds`,
    "Failed to load refunds.",
  );
}

export function refundPayment(
  paymentId: string,
  amount: number,
  reason: string,
) {
  return post<AdminRefundResult>(
    `/api/v1/admin/payments/${encodeURIComponent(paymentId)}/refund`,
    { amount, reason },
    "Failed to record refund.",
  );
}
