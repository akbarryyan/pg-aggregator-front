"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import {
  fetchBalance,
  fetchLedger,
  fetchPayouts,
  requestPayout,
  type BalanceOverview,
  type MerchantLedgerEntry,
  type MerchantPayout,
} from "@/lib/merchant-balance";
import { useMerchantEnvironment } from "@/lib/use-merchant-environment";
import { usePagination } from "@/lib/use-pagination";
import { Button } from "@/components/ui/button";
import {
  Card,
  EmptyState,
  formatDateTime,
  formatIDR,
  LoadingBlock,
  PageHeader,
  TableShell,
} from "../../components/admin/ui";

const PAGE_SIZE = 10;

const ENTRY_LABELS: Record<string, string> = {
  payment_credit: "Payment credit",
  refund_debit: "Refund",
  payout_debit: "Payout",
  payout_reversal: "Payout reversal",
  adjustment: "Adjustment",
};

const PAYOUT_STATUS: Record<string, { label: string; className: string }> = {
  requested: { label: "Requested", className: "bg-[#fff7e6] text-[#c27a00]" },
  paid: { label: "Paid", className: "bg-[#e8f8ee] text-[#2f9e5a]" },
  rejected: { label: "Rejected", className: "bg-[#fff1ed] text-[#e85d3b]" },
};

function PayoutStatusBadge({ status }: { status: string }) {
  const s = PAYOUT_STATUS[status] ?? {
    label: status,
    className: "bg-[#eef2f6] text-[#6b7c93]",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${s.className}`}
    >
      {s.label}
    </span>
  );
}

function signedIDR(amount: number) {
  return amount > 0 ? `+${formatIDR(amount)}` : formatIDR(amount);
}

function PagerBar({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (p: number) => void;
}) {
  if (total === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eef2f6] px-5 py-3 text-[12.5px] text-[#6b7c93]">
      <span>
        Page {page} of {totalPages} · {total.toLocaleString("id-ID")} total
      </span>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default function MerchantBalancePage() {
  const { environment } = useMerchantEnvironment();
  const [overview, setOverview] = useState<BalanceOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const [payouts, setPayouts] = useState<MerchantPayout[]>([]);
  const [payoutTotal, setPayoutTotal] = useState(0);
  const [payoutsLoading, setPayoutsLoading] = useState(true);
  const payoutPages = Math.max(1, Math.ceil(payoutTotal / PAGE_SIZE));
  const [payoutPage, setPayoutPage] = usePagination([], payoutPages);

  const [entries, setEntries] = useState<MerchantLedgerEntry[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const ledgerPages = Math.max(1, Math.ceil(ledgerTotal / PAGE_SIZE));
  const [ledgerPage, setLedgerPage] = usePagination([], ledgerPages);

  const [refreshKey, setRefreshKey] = useState(0);
  const [amountInput, setAmountInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setOverviewLoading(true);
      try {
        const data = await fetchBalance();
        if (!cancelled) setOverview(data);
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err instanceof Error ? err.message : "Failed to load balance.",
          );
        }
      } finally {
        if (!cancelled) setOverviewLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setPayoutsLoading(true);
      try {
        const data = await fetchPayouts(PAGE_SIZE, (payoutPage - 1) * PAGE_SIZE);
        if (cancelled) return;
        setPayouts(data.items ?? []);
        setPayoutTotal(data.total ?? 0);
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err instanceof Error ? err.message : "Failed to load payouts.",
          );
        }
      } finally {
        if (!cancelled) setPayoutsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [payoutPage, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLedgerLoading(true);
      try {
        const data = await fetchLedger(PAGE_SIZE, (ledgerPage - 1) * PAGE_SIZE);
        if (cancelled) return;
        setEntries(data.items ?? []);
        setLedgerTotal(data.total ?? 0);
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err instanceof Error
              ? err.message
              : "Failed to load balance history.",
          );
        }
      } finally {
        if (!cancelled) setLedgerLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [ledgerPage, refreshKey]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    const amount = Number(amountInput);
    if (!amountInput || !Number.isSafeInteger(amount) || amount <= 0) {
      setFormError("Enter the payout amount in whole rupiah.");
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    setFormError("");
    try {
      await requestPayout(amount);
      toast.success("Payout requested.");
      setAmountInput("");
      setPayoutPage(1);
      setLedgerPage(1);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to request payout.",
      );
      // The balance or open-payout state may have changed under us.
      setRefreshKey((k) => k + 1);
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  const negative = overview ? overview.balance < 0 : false;

  // Why the form is locked. Only a hint: `can_request` from the server is the
  // single source of truth for whether the form is enabled.
  let blockedReason = "";
  if (overview && !overview.can_request) {
    if (!overview.payout_account) {
      blockedReason = "Set your payout account in Settings before requesting a payout.";
    } else if (overview.balance < overview.min_payout_amount) {
      blockedReason = `Your balance is below the minimum payout of ${formatIDR(overview.min_payout_amount)}.`;
    } else {
      blockedReason =
        "You already have a payout request waiting to be processed.";
    }
  }

  const cards = overview
    ? [
        {
          label: "Available balance",
          value: formatIDR(overview.balance),
          tone: negative ? "text-[#e85d3b]" : "text-[#1f2a37]",
        },
        {
          label: "Total credited",
          value: formatIDR(overview.total_credited),
          tone: "text-[#2f9e5a]",
        },
        {
          label: "Total paid out",
          value: formatIDR(overview.total_paid_out),
          tone: "text-[#1f2a37]",
        },
        {
          label: "Total refunded",
          value: formatIDR(overview.total_refunded),
          tone: "text-[#1f6fb2]",
        },
      ]
    : [];

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Balance"
        description="Earnings from paid production payments, minus refunds and payouts."
      />

      {environment === "sandbox" && (
        <p className="rounded-lg border border-[#e8eef4] bg-white px-4 py-3 text-[12.5px] text-[#6b7c93]">
          Sandbox payments never count toward your balance. Only production
          payments are credited.
        </p>
      )}

      {overviewLoading && !overview ? (
        <Card>
          <LoadingBlock />
        </Card>
      ) : overview ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <Card key={card.label} className="p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a97a8]">
                  {card.label}
                </p>
                <p className={`mt-2 text-[22px] font-semibold ${card.tone}`}>
                  {card.value}
                </p>
                {card.label === "Available balance" && negative && (
                  <p className="mt-1 text-[12px] text-[#e85d3b]">
                    Negative balance: deducted by refunds
                  </p>
                )}
              </Card>
            ))}
          </div>

          <Card className="p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold text-[#1f2a37]">
              Request payout
            </h2>
            <p className="mt-1 break-words text-[12.5px] text-[#8a97a8]">
              Minimum payout: {formatIDR(overview.min_payout_amount)}.{" "}
              {overview.payout_account ? (
                <>
                  Sent to {overview.payout_account.bank_name} ·{" "}
                  {overview.payout_account.account_number} ·{" "}
                  {overview.payout_account.account_holder}.{" "}
                  <Link
                    href="/dashboard/settings"
                    className="font-medium text-[#3b9eff] hover:underline"
                  >
                    Change account
                  </Link>
                </>
              ) : (
                <Link
                  href="/dashboard/settings"
                  className="font-medium text-[#3b9eff] hover:underline"
                >
                  Set payout account
                </Link>
              )}
            </p>
            <form
              onSubmit={(e) => void handleSubmit(e)}
              className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
            >
              <label className="flex flex-col gap-1.5 sm:w-64">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#8a97a8]">
                  Amount (IDR)
                </span>
                <input
                  inputMode="numeric"
                  autoComplete="off"
                  value={amountInput}
                  onChange={(e) => {
                    setAmountInput(e.target.value.replace(/\D/g, "").slice(0, 15));
                    setFormError("");
                  }}
                  placeholder="e.g. 100000"
                  disabled={!overview.can_request || submitting}
                  className="h-10 rounded-lg border border-[#e8eef4] px-3 text-[13px] outline-none focus:border-[#3b9eff] focus:ring-2 focus:ring-[#3b9eff]/15 disabled:bg-[#f6f8fb]"
                />
              </label>
              <Button
                type="submit"
                disabled={!overview.can_request || submitting || !amountInput}
                className="h-10 rounded-full bg-[#06163a] px-5 text-[13px] font-semibold text-white shadow-none hover:bg-[#0b2048]"
              >
                {submitting ? "Requesting..." : "Request payout"}
              </Button>
            </form>
            {blockedReason && (
              <p className="mt-3 text-[12.5px] text-[#c27a00]">{blockedReason}</p>
            )}
            {formError && (
              <p role="alert" className="mt-3 text-[12.5px] text-[#e85d3b]">
                {formError}
              </p>
            )}
          </Card>
        </>
      ) : null}

      <Card>
        <div className="border-b border-[#eef2f6] px-5 py-4">
          <h2 className="text-[15px] font-semibold text-[#1f2a37]">
            Payout history
          </h2>
        </div>
        {payoutsLoading && payouts.length === 0 ? (
          <LoadingBlock />
        ) : payouts.length === 0 ? (
          <EmptyState message="No payout requests yet." />
        ) : (
          <TableShell>
            <table className="w-full min-w-150 text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-[#eef2f6] text-[11px] font-semibold uppercase tracking-wide text-[#8a97a8]">
                  <th className="px-5 py-3">Requested</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Destination</th>
                  <th className="px-5 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-[#f3f6f9] align-top text-[#3d4b5c] last:border-0"
                  >
                    <td className="px-5 py-3 text-[#6b7c93]">
                      {formatDateTime(p.requested_at)}
                    </td>
                    <td className="px-5 py-3 font-medium text-[#1f2a37]">
                      {formatIDR(p.amount)}
                    </td>
                    <td className="px-5 py-3">
                      <PayoutStatusBadge status={p.status} />
                    </td>
                    <td className="px-5 py-3">
                      {p.bank_name} · {p.account_number}
                      <br />
                      <span className="text-[#8a97a8]">{p.account_holder}</span>
                    </td>
                    <td className="px-5 py-3">
                      {p.status === "paid" && (
                        <>
                          {p.reference ? `Transfer reference: ${p.reference}` : "Paid"}
                          {p.processed_at && (
                            <div className="text-[#8a97a8]">
                              {formatDateTime(p.processed_at)}
                            </div>
                          )}
                        </>
                      )}
                      {p.status === "rejected" && (
                        <>
                          {p.reject_reason
                            ? `Reason: ${p.reject_reason}`
                            : "Rejected"}
                          {p.processed_at && (
                            <div className="text-[#8a97a8]">
                              {formatDateTime(p.processed_at)}
                            </div>
                          )}
                        </>
                      )}
                      {p.status === "requested" && (
                        <span className="text-[#8a97a8]">
                          Waiting to be processed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        )}
        <PagerBar
          page={payoutPage}
          totalPages={payoutPages}
          total={payoutTotal}
          onPage={setPayoutPage}
        />
      </Card>

      <Card>
        <div className="border-b border-[#eef2f6] px-5 py-4">
          <h2 className="text-[15px] font-semibold text-[#1f2a37]">
            Balance history
          </h2>
        </div>
        {ledgerLoading && entries.length === 0 ? (
          <LoadingBlock />
        ) : entries.length === 0 ? (
          <EmptyState message="No balance movements yet." />
        ) : (
          <TableShell>
            <table className="w-full min-w-150 text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-[#eef2f6] text-[11px] font-semibold uppercase tracking-wide text-[#8a97a8]">
                  <th className="px-5 py-3">Time</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Note</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((en) => (
                  <tr
                    key={en.id}
                    className="border-b border-[#f3f6f9] text-[#3d4b5c] last:border-0"
                  >
                    <td className="px-5 py-3 text-[#6b7c93]">
                      {formatDateTime(en.created_at)}
                    </td>
                    <td className="px-5 py-3">
                      {ENTRY_LABELS[en.entry_type] ?? en.entry_type}
                    </td>
                    <td
                      className={`px-5 py-3 font-medium ${
                        en.amount < 0 ? "text-[#e85d3b]" : "text-[#2f9e5a]"
                      }`}
                    >
                      {signedIDR(en.amount)}
                    </td>
                    <td className="px-5 py-3 text-[#6b7c93]">{en.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        )}
        <PagerBar
          page={ledgerPage}
          totalPages={ledgerPages}
          total={ledgerTotal}
          onPage={setLedgerPage}
        />
      </Card>
    </div>
  );
}
