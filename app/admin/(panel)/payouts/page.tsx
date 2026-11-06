"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CopyIcon, RefreshCwIcon } from "lucide-react";
import ConfirmedActionDialog from "@/app/components/admin/ConfirmedActionDialog";
import PagerBar from "@/app/components/admin/PagerBar";
import { Button } from "@/components/ui/button";
import {
  fetchAdminPayouts,
  markPayoutPaid,
  rejectPayout,
  PAYOUT_REASON_MAX,
  PAYOUT_REFERENCE_MAX,
  type AdminPayout,
} from "@/lib/admin-payouts";
import { usePagination } from "@/lib/use-pagination";
import {
  Card,
  EmptyState,
  formatDateTime,
  formatIDR,
  LoadingBlock,
  PageHeader,
  TableShell,
} from "../../../components/admin/ui";

const PAGE_SIZE = 20;
// The API caps a page at 100; the queue walks every page.
const QUEUE_PAGE = 100;

const TABS = [
  { value: "requested", label: "Requested" },
  { value: "paid", label: "Paid" },
  { value: "rejected", label: "Rejected" },
  { value: "", label: "All" },
];

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  requested: { label: "Requested", className: "bg-[#fff7e6] text-[#c27a00]" },
  paid: { label: "Paid", className: "bg-[#e8f8ee] text-[#2f9e5a]" },
  rejected: { label: "Rejected", className: "bg-[#fff1ed] text-[#e85d3b]" },
};

function PayoutStatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? {
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

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success("Account number copied.");
  } catch {
    toast.error("Could not copy. Select the number and copy it manually.");
  }
}

type Action = { kind: "pay" | "reject"; payout: AdminPayout };

export default function AdminPayoutsPage() {
  const [status, setStatus] = useState("requested");
  const [items, setItems] = useState<AdminPayout[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [action, setAction] = useState<Action | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const [page, setPage] = usePagination([status], totalPages);
  const isQueue = status === "requested";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError("");
      try {
        if (isQueue) {
          // Processing queue: gather every open request, oldest first.
          const all: AdminPayout[] = [];
          for (let offset = 0, guard = 0; guard < 100; guard += 1) {
            const res = await fetchAdminPayouts({
              status: "requested",
              limit: QUEUE_PAGE,
              offset,
            });
            const batch = res.items ?? [];
            all.push(...batch);
            offset += QUEUE_PAGE;
            if (batch.length < QUEUE_PAGE || offset >= (res.total ?? 0)) break;
          }
          all.sort(
            (a, b) =>
              new Date(a.requested_at).getTime() -
              new Date(b.requested_at).getTime(),
          );
          if (cancelled) return;
          setItems(all);
          setTotal(all.length);
        } else {
          const res = await fetchAdminPayouts({
            status: status || undefined,
            limit: PAGE_SIZE,
            offset: (page - 1) * PAGE_SIZE,
          });
          if (cancelled) return;
          setItems(res.items ?? []);
          setTotal(res.total ?? 0);
        }
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err instanceof Error ? err.message : "Failed to load payouts.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [status, page, isQueue, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  async function submit(a: Action, text: string) {
    try {
      if (a.kind === "pay") {
        await markPayoutPaid(a.payout.id, text);
        toast.success("Payout marked as paid.");
      } else {
        await rejectPayout(a.payout.id, text);
        toast.success("Payout rejected and the balance restored.");
      }
    } catch (err) {
      // e.g. 409 "already processed": the list is stale, reload it while the
      // dialog shows the error inline.
      refresh();
      throw err;
    }
    refresh();
  }

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Payouts"
        description="Merchant withdrawal requests. Transfer the money outside the platform, then mark the request as paid."
        actions={
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 rounded-full border-[#e8eef4] bg-white text-[#3d4b5c] shadow-none"
            aria-label="Refresh"
            onClick={refresh}
          >
            <RefreshCwIcon className={loading ? "animate-spin" : undefined} />
          </Button>
        }
      />

      <Card className="p-3">
        <div className="inline-flex flex-wrap rounded-full border border-[#e8eef4] bg-white p-1">
          {TABS.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => setStatus(t.value)}
              className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition ${
                status === t.value
                  ? "bg-[#06163a] text-white"
                  : "text-[#6b7c93] hover:bg-[#f4f7fb]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        {loading ? (
          <LoadingBlock />
        ) : loadError ? (
          <div className="px-5 py-8 text-center text-[13px] text-[#e85d3b]">
            {loadError}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            message={
              isQueue ? "No payout requests waiting." : "No payouts found."
            }
          />
        ) : (
          <TableShell>
            <table className="w-full min-w-[920px] text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-[#eef2f6] text-[11px] font-semibold uppercase tracking-wide text-[#8a97a8]">
                  <th className="px-5 py-3">Merchant</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Bank account</th>
                  <th className="px-5 py-3">Requested</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">
                    {isQueue ? "Actions" : "Details"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-[#f3f6f9] align-top text-[#3d4b5c] last:border-0"
                  >
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/merchants/${p.merchant_id}`}
                        className="font-medium text-[#1f2a37] hover:text-[#ff5e16]"
                      >
                        {p.merchant_name || p.merchant_id}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-[#1f2a37]">
                      {formatIDR(p.amount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-[#1f2a37]">{p.bank_name}</p>
                      <p className="mt-0.5 flex items-center gap-1.5">
                        <span className="font-mono">{p.account_number}</span>
                        <button
                          type="button"
                          aria-label="Copy account number"
                          title="Copy account number"
                          onClick={() => void copyText(p.account_number)}
                          className="rounded p-1 text-[#6b7c93] hover:bg-[#f4f7fb] hover:text-[#06163a]"
                        >
                          <CopyIcon className="size-3.5" />
                        </button>
                      </p>
                      <p className="mt-0.5 text-[#6b7c93]">{p.account_holder}</p>
                    </td>
                    <td className="px-5 py-3.5 text-[#6b7c93]">
                      {formatDateTime(p.requested_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <PayoutStatusBadge status={p.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {p.status === "requested" ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setAction({ kind: "pay", payout: p })}
                          >
                            Mark as paid
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              setAction({ kind: "reject", payout: p })
                            }
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-0.5 text-[12px] text-[#6b7c93]">
                          <p>Processed {formatDateTime(p.processed_at)}</p>
                          {p.reference && (
                            <p className="break-all">Ref: {p.reference}</p>
                          )}
                          {p.reject_reason && (
                            <p className="break-words">
                              Reason: {p.reject_reason}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        )}
        {!isQueue && !loading && !loadError && (
          <PagerBar
            page={page}
            totalPages={totalPages}
            total={total}
            onPage={setPage}
          />
        )}
      </Card>

      {action && (
        <ConfirmedActionDialog
          key={`${action.kind}-${action.payout.id}`}
          open
          onOpenChange={(o) => {
            if (!o) setAction(null);
          }}
          title={action.kind === "pay" ? "Mark as paid" : "Reject payout"}
          description={
            action.kind === "pay"
              ? "Confirm you have already transferred the money to this account."
              : "The requested amount returns to the merchant's balance."
          }
          warning={
            action.kind === "reject"
              ? "The reason is visible to the merchant."
              : undefined
          }
          text={
            action.kind === "pay"
              ? {
                  label: "Transfer reference",
                  maxLength: PAYOUT_REFERENCE_MAX,
                  placeholder: "Bank transfer reference or receipt number",
                }
              : {
                  label: "Reason",
                  maxLength: PAYOUT_REASON_MAX,
                  placeholder: "Why is this request rejected?",
                }
          }
          confirmLabel={
            action.kind === "pay" ? "Confirm: mark as paid" : "Confirm: reject"
          }
          destructive={action.kind === "reject"}
          summary={(v) =>
            `${action.kind === "pay" ? "Mark as paid" : "Reject"} ${formatIDR(
              action.payout.amount,
            )} for ${action.payout.merchant_name || "this merchant"}\n${
              action.payout.bank_name
            } · ${action.payout.account_number} · ${
              action.payout.account_holder
            }\n${action.kind === "pay" ? "Reference" : "Reason"}: ${v.text}`
          }
          onSubmit={(v) => submit(action, v.text)}
        />
      )}
    </div>
  );
}
