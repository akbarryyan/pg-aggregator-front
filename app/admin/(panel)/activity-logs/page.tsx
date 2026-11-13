"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import { DownloadIcon, RefreshCwIcon, SearchIcon, XIcon } from "lucide-react";
import DateRangeButton from "@/app/components/admin/DateRangeButton";
import FilterDropdown from "@/app/components/admin/FilterDropdown";
import StatsOverview from "@/app/components/admin/StatsOverview";
import {
  exportActivityLogs,
  fetchActivityLogs,
  fetchActivityLogStats,
  type ActivityEntry,
  type ActivityStats,
} from "@/lib/admin-api";
import { usePagination } from "@/lib/use-pagination";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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

const ACTOR_OPTIONS = [
  { value: "", label: "All actors" },
  { value: "admin", label: "Admin" },
  { value: "merchant_user", label: "Merchant" },
  { value: "anonymous", label: "Anonymous" },
];

const RESULT_OPTIONS = [
  { value: "", label: "All results" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
];

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10 / page" },
  { value: "20", label: "20 / page" },
  { value: "50", label: "50 / page" },
  { value: "100", label: "100 / page" },
];

const ACTOR_LABEL: Record<string, string> = {
  admin: "Admin",
  merchant_user: "Merchant",
  anonymous: "Anonymous",
};

const ACTOR_BADGE: Record<string, string> = {
  admin: "bg-[#e8edf7] text-[#06163a]",
  merchant_user: "bg-[#fff1e8] text-[#d9480f]",
  anonymous: "bg-[#f1f5f9] text-[#6b7c93]",
};

const DONUT_COLORS = [
  "#06163a",
  "#ff5e16",
  "#3b9eff",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#94a3b8",
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

function ActorBadge({ type }: { type: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
        ACTOR_BADGE[type] ?? ACTOR_BADGE.anonymous
      }`}
    >
      {ACTOR_LABEL[type] ?? type}
    </span>
  );
}

function ResultBadge({ code }: { code: number }) {
  const ok = code < 400;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
        ok ? "bg-[#e8f8ee] text-[#2f9e5a]" : "bg-[#fdeceb] text-[#e85d3b]"
      }`}
    >
      {ok ? "Success" : "Failed"}
      <span className="font-medium opacity-80">{code}</span>
    </span>
  );
}

/** Link for the entry's target when the route points at a known admin page. */
function targetHref(e: ActivityEntry): string | null {
  const route = e.route ?? "";
  if (route.includes("/payments/{id}") && e.target_id)
    return `/admin/payments/${encodeURIComponent(e.target_id)}`;
  if (route.includes("/merchants/{id}") && e.target_id)
    return `/admin/merchants/${encodeURIComponent(e.target_id)}`;
  if (route.includes("/payouts")) return "/admin/payouts";
  return null;
}

function TargetCell({ entry }: { entry: ActivityEntry }) {
  const href = targetHref(entry);
  const label = entry.target_id || (href ? "View" : "—");
  if (!href) return <>{label}</>;
  return (
    <Link
      href={href}
      onClick={(ev) => ev.stopPropagation()}
      className="inline-block max-w-[180px] truncate align-bottom font-medium text-[#ff5e16] hover:underline"
    >
      {label}
    </Link>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-[#f3f6f9] py-3 last:border-0">
      <dt className="text-[11.5px] font-semibold uppercase tracking-wide text-[#8a97a8]">
        {label}
      </dt>
      <dd className="mt-1 break-words text-[13px] text-[#1f2a37]">
        {children}
      </dd>
    </div>
  );
}

function formatDetailValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function ActivityDrawer({
  entry,
  onClose,
}: {
  entry: ActivityEntry | null;
  onClose: () => void;
}) {
  const details = Object.entries(entry?.details ?? {});
  return (
    <Drawer
      open={entry !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      direction="right"
    >
      <DrawerContent className="data-[vaul-drawer-direction=right]:w-[85%] data-[vaul-drawer-direction=right]:sm:max-w-md border-[#e8eef4] bg-white">
        <DrawerClose asChild>
          <button
            type="button"
            aria-label="Close drawer"
            className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full text-[#6b7c93] transition hover:bg-[#f4f7fb] hover:text-[#06163a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5e16]/40"
          >
            <XIcon className="size-5" />
          </button>
        </DrawerClose>
        <DrawerHeader className="border-b border-[#eef2f6] pr-14 text-left">
          <DrawerTitle className="text-[18px] font-semibold text-[#1f2a37]">
            Activity detail
          </DrawerTitle>
          <DrawerDescription className="text-[13px] text-[#8a97a8]">
            {entry ? formatDateTime(entry.created_at) : ""}
          </DrawerDescription>
        </DrawerHeader>
        {entry && (
          <dl className="flex-1 overflow-y-auto px-4 py-2">
            <DetailRow label="Actor">
              <ActorBadge type={entry.actor_type} />{" "}
              {entry.actor_email || "—"}
            </DetailRow>
            {entry.actor_id && (
              <DetailRow label="Actor ID">{entry.actor_id}</DetailRow>
            )}
            {entry.merchant_id && (
              <DetailRow label="Merchant ID">{entry.merchant_id}</DetailRow>
            )}
            <DetailRow label="Action">{entry.action}</DetailRow>
            <DetailRow label="Request">
              {entry.method} {entry.route}
            </DetailRow>
            <DetailRow label="Target">
              <TargetCell entry={entry} />
            </DetailRow>
            <DetailRow label="Result">
              <ResultBadge code={entry.status_code} />
            </DetailRow>
            <DetailRow label="Duration">{entry.duration_ms} ms</DetailRow>
            <DetailRow label="IP address">{entry.ip || "—"}</DetailRow>
            <DetailRow label="User agent">{entry.user_agent || "—"}</DetailRow>
            <DetailRow label="Log ID">{entry.id}</DetailRow>
            <div className="pt-4">
              <p className="text-[12.5px] font-semibold text-[#1f2a37]">
                Details
              </p>
              {details.length === 0 ? (
                <p className="mt-1 text-[13px] text-[#8a97a8]">
                  No additional details.
                </p>
              ) : (
                <dl className="mt-1">
                  {details.map(([k, v]) => (
                    <DetailRow key={k} label={k}>
                      {formatDetailValue(v)}
                    </DetailRow>
                  ))}
                </dl>
              )}
            </div>
          </dl>
        )}
      </DrawerContent>
    </Drawer>
  );
}

export default function AdminActivityLogsPage() {
  const [items, setItems] = useState<ActivityEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [actorType, setActorType] = useState("");
  const [result, setResult] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<ActivityEntry | null>(null);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  const [statsKey, setStatsKey] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const [page, setPage] = usePagination(
    [actorType, result, search, dateFrom, dateTo, pageSize],
    totalPages,
  );
  const pageItems = useMemo(
    () => buildPageItems(page, totalPages),
    [page, totalPages],
  );

  // Apply the typed search shortly after the last keystroke (no Search button).
  useEffect(() => {
    const next = searchInput.trim();
    if (next === search) return;
    const timer = window.setTimeout(() => setSearch(next), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput, search]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await fetchActivityLogs({
          search: search || undefined,
          actor_type: actorType || undefined,
          result: result || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        });
        if (cancelled) return;
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      } catch (err) {
        if (cancelled) return;
        toast.error(
          err instanceof Error ? err.message : "Failed to load activity log.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [search, actorType, result, dateFrom, dateTo, page, pageSize, refreshKey]);

  // Summary cards + charts load on their own so the table works if this fails.
  useEffect(() => {
    let cancelled = false;
    fetchActivityLogStats()
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

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  async function handleExport() {
    setExporting(true);
    try {
      await exportActivityLogs({
        search: search || undefined,
        actor_type: actorType || undefined,
        result: result || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      toast.success("Activity log exported successfully.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to export activity log.",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Activity Log"
        description="Who did what in the admin and merchant dashboards. Retained for 90 days."
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
                  label: "Total activity",
                  value: stats.total.toLocaleString("id-ID"),
                  note: `Last ${stats.days} days`,
                },
                {
                  label: "Failed logins",
                  value: stats.failed_logins.toLocaleString("id-ID"),
                  note: `Last ${stats.days} days`,
                  tone: stats.failed_logins > 0 ? "text-[#e85d3b]" : undefined,
                },
                {
                  label: "Active users",
                  value: stats.active_actors.toLocaleString("id-ID"),
                  note: `Last ${stats.days} days`,
                },
              ]
        }
        chart={{
          title: "Activity per day",
          subtitle: `Last ${stats?.days ?? 14} days · admin vs merchant`,
          data: stats?.daily ?? [],
          xKey: "label",
          series: [
            { key: "admin", name: "Admin", color: "#06163a" },
            { key: "merchant", name: "Merchant", color: "#ff5e16" },
          ],
          stacked: true,
          emptyText: "No activity in this period.",
        }}
        donut={{
          title: "Activity by action",
          subtitle: "Most frequent actions",
          slices: (stats?.breakdown ?? []).map((b, i) => ({
            name: b.action,
            value: b.count,
            color: DONUT_COLORS[i % DONUT_COLORS.length],
          })),
          emptyText: "No activity yet.",
        }}
      />

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <FilterDropdown
              label="Actor"
              value={actorType}
              options={ACTOR_OPTIONS}
              onChange={setActorType}
              className="w-full sm:w-40"
            />
            <FilterDropdown
              label="Result"
              value={result}
              options={RESULT_OPTIONS}
              onChange={setResult}
              className="w-full sm:w-40"
            />
            <form
              role="search"
              className="flex w-full min-w-0 flex-1 sm:min-w-[220px]"
              onSubmit={(e) => {
                e.preventDefault();
                setSearch(searchInput.trim());
              }}
            >
              <div className="relative w-full">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8a97a8]" />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search email, action, target..."
                  aria-label="Search activity log"
                  className="h-9 w-full rounded-full border border-[#e8eef4] bg-[#f8fafc] pr-3 pl-9 text-[13px] text-[#1f2a37] outline-none focus:border-[#3b9eff] focus:bg-white focus:ring-2 focus:ring-[#3b9eff]/15"
                />
              </div>
            </form>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterDropdown
              label="Rows"
              value={String(pageSize)}
              options={PAGE_SIZE_OPTIONS}
              onChange={(v) => setPageSize(Number(v))}
              className="w-[120px]"
            />

            <TooltipProvider delayDuration={200}>
              <div className="flex items-center gap-1.5 pt-5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-9 rounded-full border-[#e8eef4] bg-white text-[#3d4b5c] shadow-none hover:bg-[#f4f7fb]"
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

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={exporting}
                      className="size-9 rounded-full border-[#e8eef4] bg-white text-[#3d4b5c] shadow-none hover:bg-[#f4f7fb]"
                      aria-label="Export CSV"
                      onClick={() => void handleExport()}
                    >
                      <DownloadIcon />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={6}>
                    Export CSV
                  </TooltipContent>
                </Tooltip>

                <DateRangeButton
                  from={dateFrom}
                  to={dateTo}
                  label="Filter by date range"
                  onChange={({ from, to }) => {
                    setDateFrom(from);
                    setDateTo(to);
                  }}
                />
              </div>
            </TooltipProvider>
          </div>
        </div>
      </Card>

      <Card>
        <div className="border-b border-[#eef2f6] px-5 py-4 text-[12.5px] text-[#8a97a8]">
          {loading
            ? "Loading..."
            : total === 0
              ? "0 activities"
              : `Showing ${rangeStart}–${rangeEnd} of ${total} activities`}
        </div>

        {loading ? (
          <LoadingBlock />
        ) : items.length === 0 ? (
          <EmptyState message="No activity matches these filters." />
        ) : (
          <TableShell>
            <table className="w-full min-w-[960px] text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-[#eef2f6] text-[11px] font-semibold uppercase tracking-wide text-[#8a97a8]">
                  <th className="px-5 py-3">Time</th>
                  <th className="px-5 py-3">Actor</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Target</th>
                  <th className="px-5 py-3">Result</th>
                  <th className="px-5 py-3">IP</th>
                </tr>
              </thead>
              <tbody>
                {items.map((e) => (
                  <tr
                    key={e.id}
                    tabIndex={0}
                    onClick={() => setSelected(e)}
                    onKeyDown={(ev) => {
                      if (ev.target !== ev.currentTarget) return;
                      if (ev.key === "Enter" || ev.key === " ") {
                        ev.preventDefault();
                        setSelected(e);
                      }
                    }}
                    className="cursor-pointer border-b border-[#f3f6f9] text-[#3d4b5c] last:border-0 hover:bg-[#f8fafc]"
                  >
                    <td className="whitespace-nowrap px-5 py-3.5 text-[#6b7c93]">
                      {formatDateTime(e.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="max-w-[220px] truncate">
                        {e.actor_email || "—"}
                      </p>
                      <div className="mt-1">
                        <ActorBadge type={e.actor_type} />
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-[#1f2a37]">
                      {e.action}
                    </td>
                    <td className="px-5 py-3.5">
                      <TargetCell entry={e} />
                    </td>
                    <td className="px-5 py-3.5">
                      <ResultBadge code={e.status_code} />
                    </td>
                    <td className="px-5 py-3.5 text-[#6b7c93]">
                      {e.ip || "—"}
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

      <ActivityDrawer entry={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
