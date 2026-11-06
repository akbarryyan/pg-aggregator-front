import {
  merchantAuthFetch,
  merchantAuthHeaders,
  MERCHANT_API_URL as API_URL,
} from "./merchant-auth";

type ApiErrorBody = { error?: string; message?: string };

export type PayoutAccount = {
  bank_name: string;
  account_number: string;
  account_holder: string;
};

// GET /api/v1/merchant/balance. `can_request` and `min_payout_amount` are
// computed by the server; the UI only reflects them.
export type BalanceOverview = {
  balance: number;
  total_credited: number;
  total_paid_out: number;
  total_refunded: number;
  min_payout_amount: number;
  payout_account: PayoutAccount | null;
  can_request: boolean;
};

export type LedgerEntryType =
  | "payment_credit"
  | "refund_debit"
  | "payout_debit"
  | "payout_reversal"
  | "adjustment";

export type MerchantLedgerEntry = {
  id: string;
  entry_type: LedgerEntryType | string;
  // Signed rupiah: positive credits, negative debits.
  amount: number;
  payment_id?: string;
  payout_id?: string;
  refund_id?: string;
  note: string;
  created_at: string;
};

export type PayoutStatus = "requested" | "paid" | "rejected";

export type MerchantPayout = {
  id: string;
  amount: number;
  status: PayoutStatus | string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  requested_at: string;
  processed_at?: string | null;
  reference?: string | null;
  reject_reason?: string | null;
};

export type Paged<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

// Fixed fallbacks per status for responses without a usable message body.
const STATUS_FALLBACK: Record<number, string> = {
  400: "The request was not accepted. Check the amount and try again.",
  409: "A payout request is already waiting to be processed.",
  422: "The payout cannot be requested right now.",
};

async function parse<T>(res: Response, fallback: string): Promise<T> {
  const body = (await res.json().catch(() => null)) as T | ApiErrorBody | null;
  if (!res.ok) {
    throw new Error(
      (body as ApiErrorBody | null)?.message ??
        STATUS_FALLBACK[res.status] ??
        fallback,
    );
  }
  return body as T;
}

function pageQuery(limit: number, offset: number) {
  return `?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`;
}

async function get<T>(path: string, fallback: string): Promise<T> {
  const res = await merchantAuthFetch(`${API_URL}${path}`, {
    method: "GET",
    headers: merchantAuthHeaders(),
    cache: "no-store",
  });
  return parse<T>(res, fallback);
}

export function fetchBalance() {
  return get<BalanceOverview>(
    "/api/v1/merchant/balance",
    "Failed to load balance.",
  );
}

export function fetchLedger(limit = 20, offset = 0) {
  return get<Paged<MerchantLedgerEntry>>(
    `/api/v1/merchant/ledger${pageQuery(limit, offset)}`,
    "Failed to load balance history.",
  );
}

export function fetchPayouts(limit = 20, offset = 0) {
  return get<Paged<MerchantPayout>>(
    `/api/v1/merchant/payouts${pageQuery(limit, offset)}`,
    "Failed to load payouts.",
  );
}

// `amount` is whole rupiah (integer). The server re-validates everything.
export async function requestPayout(amount: number): Promise<MerchantPayout> {
  const res = await merchantAuthFetch(`${API_URL}/api/v1/merchant/payouts`, {
    method: "POST",
    headers: merchantAuthHeaders(),
    body: JSON.stringify({ amount }),
  });
  return parse<MerchantPayout>(res, "Failed to request payout.");
}

// Re-authenticates with the account password. A wrong password is a 401
// "Invalid password", which merchantAuthFetch deliberately does not treat as
// an expired session. The password is only sent, never stored.
export async function savePayoutAccount(
  account: PayoutAccount & { password: string },
): Promise<PayoutAccount> {
  const res = await merchantAuthFetch(
    `${API_URL}/api/v1/merchant/payout-account`,
    {
      method: "PUT",
      headers: merchantAuthHeaders(),
      body: JSON.stringify(account),
    },
  );
  return parse<PayoutAccount>(res, "Failed to update payout account.");
}
