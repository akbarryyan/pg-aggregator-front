"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { CopyIcon, RefreshCwIcon } from "lucide-react";
import {
  Card,
  EmptyState,
  LoadingBlock,
  PageHeader,
  TableShell,
  formatDateTime,
  formatIDR,
} from "@/app/components/admin/ui";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  createMerchantPayment,
  fetchMerchantPayment,
  fetchMerchantPayments,
  type MerchantPayment,
} from "@/lib/merchant-api";
import { useMerchantEnvironment } from "@/lib/use-merchant-environment";

const TEST_CUSTOMER = "TEST PAYMENT"; // history marker (customer_name is searchable)
const DEFAULT_AMOUNT = "2000";
const DEFAULT_DESCRIPTION = "Test payment";
const MAX_AMOUNT = 1_000_000_000_000; // server limit (fee.MaxNominal)
const POLL_MS = 3000;
const FINAL_STATUSES = new Set(["paid", "expired", "failed", "cancelled", "refunded"]);

function statusStyle(status: string) {
  switch (status) {
    case "paid":
      return "bg-[#e8f8ee] text-[#2f9e5a]";
    case "pending":
      return "bg-[#fff7e6] text-[#c27a00]";
    case "expired":
    case "failed":
      return "bg-[#fff1ed] text-[#e85d3b]";
    default:
      return "bg-[#eef2f6] text-[#6b7c93]";
  }
}

// Digits only, 1..MAX_AMOUNT; null when not a valid integer rupiah amount.
function parseAmount(text: string): number | null {
  if (!/^[0-9]{1,13}$/.test(text)) return null;
  const n = Number(text);
  return n >= 1 && n <= MAX_AMOUNT ? n : null;
}

export default function TestPaymentPage() {
  const { environment } = useMerchantEnvironment();
  const isProduction = environment === "production";

  const [amountText, setAmountText] = useState(DEFAULT_AMOUNT);
  const [description, setDescription] = useState(DEFAULT_DESCRIPTION);
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false); // double-click guard (state alone is not synchronous)
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Close the production confirmation when the environment changes (state
  // adjusted during render, not in an effect).
  const [seenEnv, setSeenEnv] = useState(environment);
  if (seenEnv !== environment) {
    setSeenEnv(environment);
    setConfirmOpen(false);
  }
  const showQrReqRef = useRef(0); // only the latest showQr/create result applies
  const [error, setError] = useState<string | null>(null);

  const [payment, setPayment] = useState<MerchantPayment | null>(null);
  const [now, setNow] = useState(0); // ms; 0 = not started (set from handlers/timer only)

  const [history, setHistory] = useState<MerchantPayment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyEnv, setHistoryEnv] = useState<string | null>(null); // env the rows belong to
  const [historyError, setHistoryError] = useState<string | null>(null);

  const amount = parseAmount(amountText);
  // A payment from the other environment is hidden (not deleted) after a switch.
  const visible =
    payment && (!payment.environment || payment.environment === environment)
      ? payment
      : null;

  const [historyKey, setHistoryKey] = useState(0);
  const loadHistory = useCallback(() => setHistoryKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetchMerchantPayments({
          search: TEST_CUSTOMER,
          environment,
          limit: 10,
          offset: 0,
        });
        if (cancelled) return;
        setHistory(res.items ?? []);
        setHistoryEnv(environment);
        setHistoryError(null);
      } catch (err) {
        if (cancelled) return;
        setHistoryEnv(environment);
        setHistoryError(err instanceof Error ? err.message : "Failed to load test payments.");
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [environment, historyKey]);

  // Live status: one interval while the shown payment is pending.
  const paymentId = payment?.id;
  const pending = payment?.status === "pending";
  useEffect(() => {
    if (!paymentId || !pending) return;
    let cancelled = false;
    const poll = window.setInterval(() => {
      void (async () => {
        try {
          const p = await fetchMerchantPayment(paymentId);
          if (cancelled) return;
          if (FINAL_STATUSES.has(p.status)) loadHistory(); // refresh history on a final status
          // Keep the QR if a poll response omits it; ignore a late reply for another payment.
          setPayment((cur) =>
            cur && cur.id === p.id
              ? { ...cur, ...p, qris_data: p.qris_data ?? cur.qris_data }
              : cur,
          );
        } catch {
          // transient error: keep polling
        }
      })();
    }, POLL_MS);
    const first = window.setTimeout(() => setNow(Date.now()), 0);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.clearTimeout(first);
      window.clearInterval(clock);
    };
  }, [paymentId, pending, loadHistory]);

  async function create() {
    if (creatingRef.current || amount === null) return;
    creatingRef.current = true;
    setCreating(true);
    setError(null);
    try {
      const p = await createMerchantPayment({
        amount,
        description: description.trim() || DEFAULT_DESCRIPTION,
        payment_method: "qris",
        customer_name: TEST_CUSTOMER,
        environment,
      });
      showQrReqRef.current += 1; // supersede any in-flight showQr
      setPayment(p);
      setNow(Date.now());
      loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create payment.");
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  }

  function onCreateClick() {
    if (amount === null) return;
    if (isProduction) setConfirmOpen(true);
    else void create();
  }

  async function showQr(row: MerchantPayment) {
    const reqId = ++showQrReqRef.current;
    try {
      const full = await fetchMerchantPayment(row.id); // list rows may omit qris_data
      if (reqId !== showQrReqRef.current) return; // a newer click/create won
      if (FINAL_STATUSES.has(full.status)) loadHistory();
      setPayment(full);
      setNow(0); // the timer effect sets the clock again for the shown payment
      setError(null);
    } catch (err) {
      if (reqId !== showQrReqRef.current) return;
      toast.error(err instanceof Error ? err.message : "Failed to load payment.");
    }
  }

  async function copyReference(ref: string) {
    try {
      await navigator.clipboard.writeText(ref);
      toast.success("Reference copied.");
    } catch {
      toast.error("Could not copy.");
    }
  }

  const remaining = (() => {
    if (!visible || visible.status !== "pending" || now === 0) return null;
    const ms = new Date(visible.expires_at).getTime() - now;
    if (ms <= 0) return "Expired";
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}:${String(s).padStart(2, "0")}`;
  })();
  const isImageQr =
    visible?.qris_data?.startsWith("data:image") || visible?.qris_data?.startsWith("http");
  const hasFee = (visible?.fee_amount ?? 0) > 0;

  return (
    <div>
      <PageHeader
        title="Test Payment"
        description="Create a QRIS payment from the dashboard and watch it get paid."
      />

      {isProduction ? (
        <div
          role="alert"
          className="mb-5 w-full rounded-xl border border-[#e85d3b] bg-[#fff1ed] px-4 py-3 text-[13px] font-semibold text-[#e85d3b]"
        >
          PRODUCTION: real money. A payment created here must be paid with a real
          QRIS scan and will credit your balance.
        </div>
      ) : (
        <p className="mb-5 text-[12.5px] text-[#8a97a8]">Sandbox: no real money.</p>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="min-w-0 p-5">
          <div className="space-y-4">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[#8a97a8]">
                Amount (IDR)
              </span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={amountText}
                onChange={(e) =>
                  setAmountText(
                    e.target.value
                      .replace(/\D/g, "")
                      .replace(/^0+(?=\d)/, "")
                      .slice(0, 13),
                  )
                }
                className="mt-1 h-10 w-full rounded-lg border border-[#e8eef4] px-3 text-[13px] text-[#1f2a37] outline-none focus:border-[#3b9eff]"
              />
              {amount === null && amountText !== "" && (
                <span className="mt-1 block text-[12px] text-[#e85d3b]">
                  Enter a whole amount between 1 and 1,000,000,000,000.
                </span>
              )}
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[#8a97a8]">
                Description
              </span>
              <input
                type="text"
                maxLength={255}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-[#e8eef4] px-3 text-[13px] text-[#1f2a37] outline-none focus:border-[#3b9eff]"
              />
            </label>
            <Button
              type="button"
              disabled={creating || amount === null}
              onClick={onCreateClick}
              className="h-10 w-full sm:w-auto"
            >
              {creating ? "Creating..." : "Create payment"}
            </Button>
            {error && (
              <p role="alert" className="text-[12.5px] break-words text-[#e85d3b]">
                {error}
              </p>
            )}
          </div>
        </Card>

        <Card className="min-w-0 p-5">
          {!visible ? (
            <EmptyState message="No payment yet. Create one to see its QR here." />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[22px] font-semibold text-[#1f2a37]">
                  {formatIDR(
                    hasFee ? visible.total_amount : visible.amount,
                    visible.currency,
                  )}
                </p>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${statusStyle(visible.status)}`}
                >
                  {visible.status}
                </span>
              </div>

              <div className="flex min-w-0 items-center gap-1 text-[12.5px] text-[#6b7c93]">
                <span className="min-w-0 flex-1 truncate">
                  Ref · <span className="font-mono">{visible.reference}</span>
                </span>
                <button
                  type="button"
                  aria-label="Copy reference"
                  onClick={() => void copyReference(visible.reference)}
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[#6b7c93] hover:bg-[#f4f7fb]"
                >
                  <CopyIcon className="size-4" />
                </button>
              </div>

              {hasFee && (
                <dl className="space-y-1.5 rounded-xl border border-[#eef2f6] bg-[#fafbfc] px-4 py-3 text-[13px] text-[#3d4b5c]">
                  <div className="flex justify-between gap-3">
                    <dt>Amount</dt>
                    <dd>{formatIDR(visible.amount, visible.currency)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Service fee</dt>
                    <dd>{formatIDR(visible.fee_amount, visible.currency)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 font-semibold text-[#1f2a37]">
                    <dt>Total to pay</dt>
                    <dd>{formatIDR(visible.total_amount, visible.currency)}</dd>
                  </div>
                </dl>
              )}

              {visible.status === "pending" && visible.qris_data && (
                <div className="rounded-xl border border-[#eef2f6] bg-white p-3">
                  {isImageQr ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={visible.qris_data}
                      alt="QRIS"
                      className="mx-auto max-h-56 max-w-full rounded-lg"
                    />
                  ) : (
                    <pre className="max-h-40 overflow-auto break-all rounded-lg bg-[#f8fafc] p-3 text-[11px] whitespace-pre-wrap text-[#3d4b5c]">
                      {visible.qris_data}
                    </pre>
                  )}
                  {remaining && (
                    <p className="mt-2 text-center text-[12.5px] text-[#8a97a8]">
                      {remaining === "Expired" ? remaining : `Expires in ${remaining}`}
                    </p>
                  )}
                </div>
              )}

              {visible.status === "paid" && (
                <div className="rounded-xl border border-[#bfe8cf] bg-[#e8f8ee] px-4 py-3 text-[13px] text-[#2f9e5a]">
                  <p className="font-semibold">Payment received</p>
                  <p className="mt-0.5">{formatDateTime(visible.paid_at)}</p>
                  <p className="mt-0.5">
                    Amount {formatIDR(visible.amount, visible.currency)}
                    {visible.environment === "production"
                      ? " credited to your balance."
                      : ""}
                  </p>
                </div>
              )}

              {(visible.status === "expired" ||
                visible.status === "failed" ||
                visible.status === "cancelled") && (
                <div className="rounded-xl border border-[#ffd5c9] bg-[#fff1ed] px-4 py-3 text-[13px] font-semibold text-[#e85d3b]">
                  This payment is {visible.status}.
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full sm:w-auto"
                  onClick={() => {
                    showQrReqRef.current += 1;
                    setPayment(null);
                    setError(null);
                  }}
                >
                  New test payment
                </Button>
                <Link
                  href={`/pay/${visible.reference}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 text-center text-[13px] font-medium text-[#ff5e16] hover:underline sm:text-left"
                >
                  Open checkout page
                </Link>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-5 min-w-0">
        <div className="flex items-center justify-between gap-3 border-b border-[#eef2f6] px-5 py-4">
          <h2 className="text-[15px] font-semibold text-[#1f2a37]">
            Recent test payments
          </h2>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Refresh history"
            className="size-9 shrink-0 rounded-full"
            onClick={loadHistory}
          >
            <RefreshCwIcon />
          </Button>
        </div>
        {historyLoading || historyEnv !== environment ? (
          <LoadingBlock />
        ) : historyError ? (
          <p role="alert" className="px-5 py-4 text-[12.5px] text-[#e85d3b]">
            {historyError}
          </p>
        ) : history.length === 0 ? (
          <EmptyState message="No test payments yet." />
        ) : (
          <TableShell>
            <table className="w-full min-w-130 text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-[#eef2f6] text-[11px] font-semibold uppercase tracking-wide text-[#8a97a8]">
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#f3f6f9] text-[#3d4b5c] last:border-0"
                  >
                    <td className="px-5 py-3.5 text-[#6b7c93]">
                      {formatDateTime(row.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      {formatIDR(row.total_amount, row.currency)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${statusStyle(row.status)}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="max-w-40 px-5 py-3.5">
                      <span className="block truncate font-mono">{row.reference}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      {row.status === "pending" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="max-lg:h-9"
                          onClick={() => void showQr(row)}
                        >
                          Show QR
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        )}
      </Card>

      <AlertDialog open={confirmOpen && isProduction} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create a real payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This creates a PRODUCTION payment of {formatIDR(amount ?? 0)}. The
              exact fee and total are calculated by the server and shown after it
              is created. It is paid with a real QRIS scan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                setConfirmOpen(false);
                void create();
              }}
            >
              Create real payment
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
