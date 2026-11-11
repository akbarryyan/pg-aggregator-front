"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { PencilIcon, PowerIcon } from "lucide-react";
import EditMerchantDrawer from "@/app/components/admin/EditMerchantDrawer";
import MerchantAPIKeysSection from "@/app/components/admin/MerchantAPIKeysSection";
import MerchantProviderConfigSection from "@/app/components/admin/MerchantProviderConfigSection";
import ConfirmedActionDialog from "@/app/components/admin/ConfirmedActionDialog";
import PagerBar from "@/app/components/admin/PagerBar";
import { usePagination } from "@/lib/use-pagination";
import {
  adjustMerchantBalance,
  fetchAllAdminBalances,
  fetchAdminMerchantLedger,
  ADJUSTMENT_MAX_ABS,
  ADJUSTMENT_REASON_MAX,
  type AdminLedgerEntry,
  type AdminMerchantBalance,
} from "@/lib/admin-payouts";
import {
  fetchAdminMerchant,
  fetchAdminMerchantPayments,
  setAdminMerchantActive,
  setMerchantFeeBearer,
  type FeeBearer,
  type AdminMerchant,
  type AdminPayment,
} from "@/lib/admin-api";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Card,
  EmptyState,
  formatDateTime,
  formatIDR,
  LoadingBlock,
  PageHeader,
  StatusBadge,
  TableShell,
} from "../../../../components/admin/ui";

const LEDGER_PAGE_SIZE = 20;

const ENTRY_LABEL: Record<string, string> = {
  payment_credit: "Payment credit",
  refund_debit: "Refund",
  payout_debit: "Payout",
  payout_reversal: "Payout reversal",
  adjustment: "Adjustment",
};

export default function AdminMerchantDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [merchant, setMerchant] = useState<AdminMerchant | null>(null);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [feeBearerDraft, setFeeBearerDraft] = useState<FeeBearer>("merchant");
  const [savingFee, setSavingFee] = useState(false);
  const [balance, setBalance] = useState<AdminMerchantBalance | null>(null);
  const [balanceKey, setBalanceKey] = useState(0);
  const [balanceError, setBalanceError] = useState(false);
  const [ledgerError, setLedgerError] = useState("");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [entries, setEntries] = useState<AdminLedgerEntry[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const ledgerPages = Math.max(1, Math.ceil(ledgerTotal / LEDGER_PAGE_SIZE));
  const [ledgerPage, setLedgerPage] = usePagination([id], ledgerPages);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function loadBalance() {
      setBalanceError(false);
      try {
        const all = await fetchAllAdminBalances();
        if (!cancelled) setBalance(all.get(id) ?? null);
      } catch {
        if (!cancelled) {
          setBalance(null);
          setBalanceError(true);
        }
      }
    }
    void loadBalance();
    return () => {
      cancelled = true;
    };
  }, [id, balanceKey]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function loadLedger() {
      setLedgerLoading(true);
      setLedgerError("");
      try {
        const res = await fetchAdminMerchantLedger(
          id,
          LEDGER_PAGE_SIZE,
          (ledgerPage - 1) * LEDGER_PAGE_SIZE,
        );
        if (cancelled) return;
        setEntries(res.items ?? []);
        setLedgerTotal(res.total ?? 0);
      } catch (err) {
        if (!cancelled) {
          setLedgerError(
            err instanceof Error ? err.message : "Failed to load balance history.",
          );
        }
      } finally {
        if (!cancelled) setLedgerLoading(false);
      }
    }
    void loadLedger();
    return () => {
      cancelled = true;
    };
  }, [id, ledgerPage, balanceKey]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [m, p] = await Promise.all([
          fetchAdminMerchant(id),
          fetchAdminMerchantPayments(id, { limit: 20, offset: 0 }),
        ]);
        if (cancelled) return;
        setMerchant(m);
        setFeeBearerDraft(m.fee_bearer ?? "merchant");
        setPayments(p.items ?? []);
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err instanceof Error ? err.message : "Failed to load merchant.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleToggleActive() {
    if (!merchant) return;
    setToggling(true);
    try {
      const updated = await setAdminMerchantActive(
        merchant.id,
        !merchant.is_active,
      );
      setMerchant(updated);
      toast.success(
        updated.is_active ? "Merchant activated." : "Merchant deactivated.",
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update status.",
      );
    } finally {
      setToggling(false);
    }
  }

  async function handleSaveFeeBearer() {
    if (!merchant || feeBearerDraft === merchant.fee_bearer) return;
    // Switching to customer changes what customers are charged, so confirm.
    if (
      feeBearerDraft === "customer" &&
      !window.confirm(
        "Customers of this merchant will be charged the nominal plus Cashi's 0.7% fee on new payments. Continue?",
      )
    ) {
      return;
    }
    setSavingFee(true);
    try {
      const updated = await setMerchantFeeBearer(merchant.id, feeBearerDraft);
      setMerchant(updated);
      setFeeBearerDraft(updated.fee_bearer);
      toast.success("Fee setting updated.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update fee setting.",
      );
    } finally {
      setSavingFee(false);
    }
  }

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Merchant detail"
        description="Merchant profile and related payments."
        actions={
          <Link
            href="/admin/merchants"
            className="text-[13px] font-semibold text-[#6b7c93] hover:text-[#06163a]"
          >
            ← Back to merchants
          </Link>
        }
      />

      {loading ? (
        <Card>
          <LoadingBlock />
        </Card>
      ) : !merchant ? (
        <Card className="p-6 text-[13px] text-[#8a97a8]">Merchant not found.</Card>
      ) : (
        <>
          <Card className="p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="break-words text-[18px] font-semibold text-[#1f2a37]">
                  {merchant.business_name}
                </h2>
                <p className="mt-1 break-words text-[13px] text-[#6b7c93]">{merchant.name}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    merchant.is_active
                      ? "bg-[#e8f8ee] text-[#2f9e5a]"
                      : "bg-[#fff1ed] text-[#e85d3b]"
                  }`}
                >
                  {merchant.is_active ? "Active" : "Inactive"}
                </span>

                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-9 rounded-full border-[#e8eef4] bg-white text-[#3d4b5c] shadow-none hover:bg-[#f4f7fb]"
                        aria-label="Edit merchant"
                        onClick={() => setEditOpen(true)}
                      >
                        <PencilIcon />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={6}>
                      Edit merchant
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={toggling}
                        className={`size-9 rounded-full shadow-none ${
                          merchant.is_active
                            ? "border-[#ffd4c8] bg-white text-[#e85d3b] hover:bg-[#fff5f2]"
                            : "border-[#c8efd4] bg-white text-[#2f9e5a] hover:bg-[#f0faf3]"
                        }`}
                        aria-label={
                          merchant.is_active
                            ? "Deactivate merchant"
                            : "Activate merchant"
                        }
                        onClick={() => void handleToggleActive()}
                      >
                        <PowerIcon className={toggling ? "animate-pulse" : undefined} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={6}>
                      {merchant.is_active ? "Deactivate" : "Activate"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-[#f8fafc] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a97a8]">
                  Email
                </p>
                <p className="mt-1 break-all text-[13.5px] font-medium text-[#1f2a37]">
                  {merchant.email}
                </p>
              </div>
              <div className="rounded-lg bg-[#f8fafc] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a97a8]">
                  Phone
                </p>
                <p className="mt-1 text-[13.5px] font-medium text-[#1f2a37]">
                  {merchant.phone || "—"}
                </p>
              </div>
              <div className="rounded-lg bg-[#f8fafc] px-4 py-3 sm:col-span-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a97a8]">
                  Webhook URL
                </p>
                <p className="mt-1 break-all text-[13.5px] font-medium text-[#1f2a37]">
                  {merchant.webhook_url || "—"}
                </p>
              </div>
              <div className="rounded-lg bg-[#f8fafc] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a97a8]">
                  Created
                </p>
                <p className="mt-1 text-[13.5px] font-medium text-[#1f2a37]">
                  {formatDateTime(merchant.created_at)}
                </p>
              </div>
              <div className="rounded-lg bg-[#f8fafc] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a97a8]">
                  Updated
                </p>
                <p className="mt-1 text-[13.5px] font-medium text-[#1f2a37]">
                  {formatDateTime(merchant.updated_at)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h3 className="text-[15px] font-semibold text-[#1f2a37]">
              Fee borne by
            </h3>
            <p className="mt-1 text-[12.5px] text-[#6b7c93]">
              Merchant: the customer pays the nominal; Cashi&apos;s fee is
              deducted from what the merchant receives. Customer: the customer
              pays the nominal plus Cashi&apos;s fee (0.7%), and the merchant
              receives the full nominal. Example: nominal Rp 2.000 → customer
              pays Rp 2.015. Applies to new payments only.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                value={feeBearerDraft}
                onChange={(e) => setFeeBearerDraft(e.target.value as FeeBearer)}
                disabled={savingFee}
                aria-label="Fee bearer"
                className="h-9 rounded-lg border border-[#e8eef4] bg-white px-3 text-[13px] text-[#1f2a37]"
              >
                <option value="merchant">Merchant</option>
                <option value="customer">Customer</option>
              </select>
              <Button
                type="button"
                size="sm"
                className="max-lg:h-9"
                disabled={savingFee || feeBearerDraft === merchant.fee_bearer}
                onClick={() => void handleSaveFeeBearer()}
              >
                {savingFee ? "Saving..." : "Save"}
              </Button>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-[15px] font-semibold text-[#1f2a37]">
                  Balance
                </h3>
                <p
                  className={`mt-2 text-[22px] font-semibold ${
                    balance && balance.balance < 0
                      ? "text-[#e85d3b]"
                      : "text-[#1f2a37]"
                  }`}
                >
                  {balance ? formatIDR(balance.balance) : balanceError ? "Balance unavailable" : "—"}
                </p>
                {balanceError && (
                  <button
                    type="button"
                    onClick={() => setBalanceKey((k) => k + 1)}
                    className="mt-1 text-[12.5px] font-semibold text-[#e85d3b] underline"
                  >
                    Retry
                  </button>
                )}
                {balance && balance.open_payout_amount > 0 && (
                  <p className="mt-1 text-[12.5px] text-[#c27a00]">
                    Open payout request: {formatIDR(balance.open_payout_amount)}{" "}
                    <Link
                      href="/admin/payouts"
                      className="font-semibold underline"
                    >
                      View payouts
                    </Link>
                  </p>
                )}
              </div>
              <Button
                type="button"
                className="max-lg:h-9"
                onClick={() => setAdjustOpen(true)}
              >
                Adjust balance
              </Button>
            </div>
          </Card>

          <Card>
            <div className="border-b border-[#eef2f6] px-5 py-4">
              <h3 className="text-[15px] font-semibold text-[#1f2a37]">
                Balance history
              </h3>
            </div>
            {ledgerLoading ? (
              <LoadingBlock />
            ) : ledgerError ? (
              <div className="flex items-center justify-between gap-3 px-5 py-6 text-[13px] text-[#e85d3b]">
                <span>{ledgerError}</span>
                <button
                  type="button"
                  onClick={() => setBalanceKey((k) => k + 1)}
                  className="font-semibold underline"
                >
                  Retry
                </button>
              </div>
            ) : entries.length === 0 ? (
              <EmptyState message="No balance movements yet." />
            ) : (
              <TableShell>
                <table className="w-full min-w-[640px] text-left text-[12.5px]">
                  <thead>
                    <tr className="border-b border-[#eef2f6] text-[11px] font-semibold uppercase tracking-wide text-[#8a97a8]">
                      <th className="px-5 py-3">Time</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr
                        key={e.id}
                        className="border-b border-[#f3f6f9] text-[#3d4b5c] last:border-0"
                      >
                        <td className="px-5 py-3.5 text-[#6b7c93]">
                          {formatDateTime(e.created_at)}
                        </td>
                        <td className="px-5 py-3.5">
                          {ENTRY_LABEL[e.entry_type] ?? e.entry_type}
                        </td>
                        <td
                          className={`px-5 py-3.5 font-medium ${
                            e.amount < 0 ? "text-[#e85d3b]" : "text-[#2f9e5a]"
                          }`}
                        >
                          {e.amount > 0 ? "+" : ""}
                          {formatIDR(e.amount)}
                        </td>
                        <td className="px-5 py-3.5 break-words">
                          {e.note || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableShell>
            )}
            {!ledgerLoading && (
              <PagerBar
                page={ledgerPage}
                totalPages={ledgerPages}
                total={ledgerTotal}
                onPage={setLedgerPage}
              />
            )}
          </Card>

          {adjustOpen && (
            <ConfirmedActionDialog
              open
              onOpenChange={setAdjustOpen}
              title="Adjust balance"
              description="Enter a positive number to credit the merchant or a negative number to debit."
              warning="This changes the merchant's balance. The reason is visible to the merchant."
              amount={{
                label: "Amount (IDR, signed)",
                allowNegative: true,
                maxAbs: ADJUSTMENT_MAX_ABS,
                hint: "Whole rupiah, for example 25000 or -25000.",
              }}
              text={{ label: "Reason", maxLength: ADJUSTMENT_REASON_MAX }}
              confirmLabel="Confirm adjustment"
              summary={(v) =>
                `Adjust ${merchant.business_name} balance by ${
                  (v.amount ?? 0) > 0 ? "+" : ""
                }${formatIDR(v.amount ?? 0)}\nReason: ${v.text}`
              }
              onSubmit={async (v) => {
                await adjustMerchantBalance(merchant.id, v.amount ?? 0, v.text);
                toast.success("Balance adjusted.");
                setBalanceKey((k) => k + 1);
              }}
            />
          )}

          <MerchantAPIKeysSection merchantId={merchant.id} />

          <MerchantProviderConfigSection merchantId={merchant.id} />

          <Card>
            <div className="border-b border-[#eef2f6] px-5 py-4">
              <h3 className="text-[15px] font-semibold text-[#1f2a37]">
                Recent payments
              </h3>
            </div>
            {payments.length === 0 ? (
              <EmptyState message="No payments for this merchant." />
            ) : (
              <TableShell>
                <table className="w-full min-w-[720px] text-left text-[12.5px]">
                  <thead>
                    <tr className="border-b border-[#eef2f6] text-[11px] font-semibold uppercase tracking-wide text-[#8a97a8]">
                      <th className="px-5 py-3">Reference</th>
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-[#f3f6f9] text-[#3d4b5c] last:border-0"
                      >
                        <td className="px-5 py-3.5">
                          <Link
                            href={`/admin/payments/${p.id}`}
                            className="font-medium text-[#1f2a37] hover:text-[#ff5e16]"
                          >
                            {p.reference}
                          </Link>
                        </td>
                        <td className="px-5 py-3.5">
                          {formatIDR(p.amount, p.currency)}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="px-5 py-3.5 text-[#6b7c93]">
                          {formatDateTime(p.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableShell>
            )}
          </Card>

          <EditMerchantDrawer
            open={editOpen}
            merchant={merchant}
            onOpenChange={setEditOpen}
            onUpdated={setMerchant}
          />
        </>
      )}
    </div>
  );
}
