"use client";

import type { MerchantStats } from "@/lib/admin-api";
import StatsOverview from "./StatsOverview";
import { formatIDR } from "./ui";

const SIGNUP_COLOR = "#3b9eff";

type Props = {
  stats: MerchantStats | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
};

/**
 * Summary cards and charts above the merchants table. It loads and fails on its
 * own (the table below keeps working), and does not follow the table's filters.
 * A thin mapping from MerchantStats onto the shared StatsOverview.
 */
export default function MerchantStatsSection({
  stats,
  loading,
  error,
  onRetry,
}: Props) {
  const activeShare =
    stats && stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0;
  const hasNegative = (stats?.negative_balance_count ?? 0) > 0;

  return (
    <StatsOverview
      loading={loading}
      error={error && !stats}
      errorText="Could not load the merchant summary."
      onRetry={onRetry}
      cards={
        !stats
          ? []
          : [
              {
                label: "Total merchants",
                value: stats.total.toLocaleString("id-ID"),
                note: `${stats.inactive.toLocaleString("id-ID")} inactive`,
              },
              {
                label: "Active merchants",
                value: stats.active.toLocaleString("id-ID"),
                tone: "text-[#2f9e5a]",
                note: `${activeShare}% of all merchants`,
              },
              {
                label: "Total merchant balance",
                value: formatIDR(stats.total_balance),
                tone:
                  stats.total_balance < 0
                    ? "text-[#e85d3b]"
                    : "text-[#1f2a37]",
                note: hasNegative
                  ? `${stats.negative_balance_count.toLocaleString("id-ID")} merchant(s) with a negative balance`
                  : "Owed to merchants",
                noteTone: hasNegative ? "text-[#e85d3b]" : "text-[#8a97a8]",
              },
            ]
      }
      chart={{
        title: "Merchant sign-ups",
        subtitle: `Last ${stats?.days ?? 14} days · new merchants per day`,
        data: stats?.signups_daily ?? [],
        xKey: "label",
        series: [{ key: "count", name: "New merchants", color: SIGNUP_COLOR }],
        emptyText: "No sign-ups in this period.",
      }}
      donut={{
        title: "Active vs inactive",
        subtitle: "Share of merchants by status",
        slices: [
          { name: "Active", value: stats?.active ?? 0, color: "#22c55e" },
          { name: "Inactive", value: stats?.inactive ?? 0, color: "#94a3b8" },
        ],
        emptyText: "No merchants yet.",
      }}
    />
  );
}
