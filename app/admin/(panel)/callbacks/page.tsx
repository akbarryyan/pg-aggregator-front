"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { RefreshCwIcon, RotateCcwIcon } from "lucide-react";
import FilterDropdown from "@/app/components/admin/FilterDropdown";
import StatsOverview, { statusColor } from "@/app/components/admin/StatsOverview";
import {
  fetchAdminCallbacks,
  fetchCallbackStats,
  retryAdminCallback,
  type AdminCallback,
  type CallbackStats,
} from "@/lib/admin-api";
import { usePagination } from "@/lib/use-pagination";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
  LoadingBlock,
  PageHeader,
  TableShell,
} from "../../../components/admin/ui";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
  { value: "pending", label: "Pending" },
  { value: "skipped", label: "Skipped" },
];

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10 / page" },
  { value: "20", label: "20 / page" },
  { value: "50", label: "50 / page" },
];

function buildPageItems(current: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: Array<number | "ellipsis"> = [1];
  if (current > 3) pages.push("ellipsis");
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  for (let p = start; p <= end; p += 1) pages.push(p);
  if (current < totalPages - 2) pages.push("ellipsis");
  pages.push(totalPages);
  return pages;
}

function statusStyle(status: string) {
  switch (status) {
    case "success":
      return "bg-[#e8f8ee] text-[#2f9e5a]";
    case "failed":
      return "bg-[#fff1ed] text-[#e85d3b]";
    case "pending":
      return "bg-[#fff7e6] text-[#c27a00]";
    case "skipped":
      return "bg-[#eef2f6] text-[#6b7c93]";
    default:
      return "bg-[#eef2f6] text-[#6b7c93]";
  }
}

export default function AdminCallbacksPage() {
  const [items, setItems] = useState<AdminCallback[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [stats, setStats] = useState<CallbackStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  const [statsKey, setStatsKey] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const [page, setPage] = usePagination([status, pageSize], totalPages);
  const pageItems = useMemo(
    () => buildPageItems(page, totalPages),
    [page, totalPages],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await fetchAdminCallbacks({
          status: status || undefined,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        });
        if (cancelled) return;
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      } catch (err) {
        if (cancelled) return;
        toast.error(
          err instanceof Error ? err.message : "Failed to load callbacks.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [status, page, pageSize, refreshKey]);

  // Summary cards + charts: loaded on their own (the table keeps working if
  // this fails) and refreshed with the table or via the section's Retry button.
  useEffect(() => {
    let cancelled = false;
    fetchCallbackStats()
      .then((data) => {
        if (cancelled) return;
        setStats(data);
        setStatsError(false);
      })
      .catch(() => {
        if (!cancelled) setStatsError(true);
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey, statsKey]);

  const deliveredPct =
    stats && stats.total > 0 ? Math.floor((stats.success / stats.total) * 100) : 0;

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  async function handleRetry(id: string) {
    setRetryingId(id);
    try {
      await retryAdminCallback(id);
      toast.success("Retry attempt recorded.");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to retry callback.",
      );
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Callbacks"
        description="Outbound webhook deliveries to merchant endpoints after payment status changes."
      />

      <StatsOverview
        loading={statsLoading}
        error={statsError && !stats}
        onRetry={() => {
          setStatsLoading(true);
          setStatsError(false);
          setStatsKey((k) => k + 1);
        }}
        cards={
          !stats
            ? []
            : [
                {
                  label: "Total deliveries",
                  value: stats.total.toLocaleString("id-ID"),
                  note: "All outbound callbacks",
                },
                {
                  label: "Delivered",
                  value: stats.success.toLocaleString("id-ID"),
                  note: `${deliveredPct}% of total`,
                  tone: "text-[#2f9e5a]",
                },
                {
                  label: "Failed / pending",
                  value: (stats.failed + stats.pending).toLocaleString("id-ID"),
                  note:
                    `${stats.failed.toLocaleString("id-ID")} failed · ${stats.pending.toLocaleString("id-ID")} pending` +
                    (stats.skipped > 0
                      ? ` · ${stats.skipped.toLocaleString("id-ID")} skipped`
                      : ""),
                  tone:
                    stats.failed + stats.pending > 0
                      ? "text-[#e85d3b]"
                      : undefined,
                },
              ]
        }
        chart={{
          title: "Deliveries per day",
          subtitle: `Last ${stats?.days ?? 14} days · outcome of each delivery`,
          data: stats?.daily ?? [],
          xKey: "label",
          series: [
            { key: "success", name: "Delivered", color: "#22c55e" },
            { key: "failed", name: "Failed", color: "#ef4444" },
            { key: "other", name: "Other", color: "#94a3b8" },
          ],
          stacked: true,
          emptyText: "No callback deliveries in this period.",
        }}
        donut={{
          title: "Delivery status",
          subtitle: "Share of deliveries by status",
          slices: (stats?.breakdown ?? []).map((st) => ({
            name: st.status.charAt(0).toUpperCase() + st.status.slice(1),
            value: st.count,
            color: statusColor(st.status),
          })),
          emptyText: "No callback deliveries yet.",
        }}
      />

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <FilterDropdown
            label="Status"
            value={status}
            options={STATUS_OPTIONS}
            onChange={setStatus}
            className="w-full sm:w-44"
          />
          <div className="flex flex-wrap items-center gap-2">
            <FilterDropdown
              label="Rows"
              value={String(pageSize)}
              options={PAGE_SIZE_OPTIONS}
              onChange={(v) => setPageSize(Number(v))}
              className="w-30"
            />
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="mt-5 size-9 rounded-full border-[#e8eef4] bg-white text-[#3d4b5c] shadow-none hover:bg-[#f4f7fb]"
                    aria-label="Refresh"
                    onClick={() => setRefreshKey((k) => k + 1)}
                  >
                    <RefreshCwIcon
                      className={loading ? "animate-spin" : undefined}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>
                  Refresh
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </Card>

      <Card>
        <div className="border-b border-[#eef2f6] px-5 py-4 text-[12.5px] text-[#8a97a8]">
          {loading
            ? "Loading..."
            : total === 0
              ? "0 delivery(ies)"
              : `Showing ${rangeStart}–${rangeEnd} of ${total} delivery(ies)`}
        </div>

        {loading ? (
          <LoadingBlock />
        ) : items.length === 0 ? (
          <EmptyState message="No merchant callback deliveries yet." />
        ) : (
          <TableShell>
            <table className="w-full min-w-275 text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-[#eef2f6] text-[11px] font-semibold uppercase tracking-wide text-[#8a97a8]">
                  <th className="px-5 py-3">Time</th>
                  <th className="px-5 py-3">Payment</th>
                  <th className="px-5 py-3">Merchant</th>
                  <th className="px-5 py-3">Event</th>
                  <th className="px-5 py-3">Target</th>
                  <th className="px-5 py-3">Attempt</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">HTTP</th>
                  <th className="px-5 py-3">Error</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#f3f6f9] text-[#3d4b5c] last:border-0"
                  >
                    <td className="px-5 py-3.5 text-[#6b7c93]">
                      {formatDateTime(row.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/payments/${row.payment_id}`}
                        className="font-medium text-[#1f2a37] hover:text-[#ff5e16]"
                      >
                        {row.payment_reference || "View"}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/merchants/${row.merchant_id}`}
                        className="font-medium text-[#1f2a37] hover:text-[#ff5e16]"
                      >
                        {row.merchant_name || "—"}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-[#1f2a37]">
                      {row.event_type}
                    </td>
                    <td className="max-w-50 truncate px-5 py-3.5 text-[#6b7c93]">
                      {row.target_url}
                    </td>
                    <td className="px-5 py-3.5">#{row.attempt_number}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusStyle(
                          row.status,
                        )}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {row.http_status ?? "—"}
                    </td>
                    <td className="max-w-45 truncate px-5 py-3.5 text-[#e85d3b]">
                      {row.error_message || "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end">
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                disabled={
                                  retryingId === row.id ||
                                  row.status === "success"
                                }
                                className="size-8 rounded-full border-[#e8eef4] bg-white text-[#3d4b5c] shadow-none hover:bg-[#f4f7fb] disabled:opacity-40 max-lg:size-9"
                                aria-label="Retry callback"
                                onClick={() => void handleRetry(row.id)}
                              >
                                <RotateCcwIcon
                                  className={
                                    retryingId === row.id
                                      ? "animate-spin"
                                      : undefined
                                  }
                                />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" sideOffset={6}>
                              Retry delivery
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        )}

        {!loading && total > 0 && (
          <div className="flex flex-row flex-wrap items-center justify-between gap-3 border-t border-[#eef2f6] px-4 py-3">
            <p className="text-[12.5px] text-[#8a97a8]">
              Page {page} of {totalPages}
            </p>
            <Pagination className="mx-0 w-auto justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage((p) => Math.max(1, p - 1));
                    }}
                    className={
                      page <= 1 ? "pointer-events-none opacity-40" : undefined
                    }
                  />
                </PaginationItem>
                {pageItems.map((item, idx) =>
                  item === "ellipsis" ? (
                    <PaginationItem key={`e-${idx}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={item}>
                      <PaginationLink
                        href="#"
                        isActive={item === page}
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(item);
                        }}
                      >
                        {item}
                      </PaginationLink>
                    </PaginationItem>
                  ),
                )}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage((p) => Math.min(totalPages, p + 1));
                    }}
                    className={
                      page >= totalPages
                        ? "pointer-events-none opacity-40"
                        : undefined
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </Card>
    </div>
  );
}
