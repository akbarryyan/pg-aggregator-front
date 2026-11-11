"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MerchantStats } from "@/lib/admin-api";
import { ChartTooltipBox } from "./DashboardCharts";
import { Card, formatIDR } from "./ui";

const SIGNUP_COLOR = "#3b9eff";
const STATUS_COLORS = { Active: "#22c55e", Inactive: "#94a3b8" } as const;

type Props = {
  stats: MerchantStats | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
};

function SummaryCard({
  label,
  value,
  note,
  tone = "text-[#1f2a37]",
  noteTone = "text-[#8a97a8]",
}: {
  label: string;
  value: string;
  note: string;
  tone?: string;
  noteTone?: string;
}) {
  return (
    <Card className="min-w-0 p-5">
      <p className="text-[12px] text-[#8a97a8]">{label}</p>
      <p
        className={`mt-2 break-words text-[22px] font-bold tracking-tight ${tone}`}
      >
        {value}
      </p>
      <p className={`mt-2 text-[11.5px] ${noteTone}`}>{note}</p>
    </Card>
  );
}

/**
 * Summary cards and charts above the merchants table. It loads and fails on its
 * own (the table below keeps working), and does not follow the table's filters.
 */
export default function MerchantStatsSection({
  stats,
  loading,
  error,
  onRetry,
}: Props) {
  if (!stats) {
    return (
      <Card className="p-5">
        {error ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-[#e85d3b]">
              Could not load the merchant summary.
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="h-9 shrink-0 rounded-full border border-[#e8eef4] bg-white px-4 text-[12.5px] font-semibold text-[#3d4b5c] transition hover:bg-[#f4f7fb]"
            >
              Retry
            </button>
          </div>
        ) : (
          <p className="py-6 text-center text-[13px] text-[#8a97a8]">
            {loading ? "Loading summary..." : ""}
          </p>
        )}
      </Card>
    );
  }

  const activeShare =
    stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0;
  const hasNegative = stats.negative_balance_count > 0;
  const signups = stats.signups_daily ?? [];
  const hasSignups = signups.some((d) => d.count > 0);
  const statusData = [
    { name: "Active", value: stats.active },
    { name: "Inactive", value: stats.inactive },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Total merchants"
          value={stats.total.toLocaleString("id-ID")}
          note={`${stats.inactive.toLocaleString("id-ID")} inactive`}
        />
        <SummaryCard
          label="Active merchants"
          value={stats.active.toLocaleString("id-ID")}
          tone="text-[#2f9e5a]"
          note={`${activeShare}% of all merchants`}
        />
        <SummaryCard
          label="Total merchant balance"
          value={formatIDR(stats.total_balance)}
          tone={stats.total_balance < 0 ? "text-[#e85d3b]" : "text-[#1f2a37]"}
          note={
            hasNegative
              ? `${stats.negative_balance_count.toLocaleString("id-ID")} merchant(s) with a negative balance`
              : "Owed to merchants"
          }
          noteTone={hasNegative ? "text-[#e85d3b]" : "text-[#8a97a8]"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="min-w-0 p-5">
          <div className="mb-4">
            <h2 className="text-[15px] font-semibold text-[#1f2a37]">
              Merchant sign-ups
            </h2>
            <p className="mt-0.5 text-[12px] text-[#8a97a8]">
              Last {stats.days} days · new merchants per day
            </p>
          </div>
          <div className="h-60 w-full sm:h-[280px]">
            {!hasSignups ? (
              <div className="flex h-full items-center justify-center text-[13px] text-[#8a97a8]">
                No sign-ups in this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={signups}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="merchantSignupFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={SIGNUP_COLOR}
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="100%"
                        stopColor={SIGNUP_COLOR}
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#eef2f6"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#8a97a8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={16}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "#8a97a8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                  />
                  <Tooltip content={<ChartTooltipBox />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="New merchants"
                    stroke={SIGNUP_COLOR}
                    strokeWidth={2.2}
                    fill="url(#merchantSignupFill)"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="min-w-0 p-5">
          <div className="mb-4">
            <h2 className="text-[15px] font-semibold text-[#1f2a37]">
              Active vs inactive
            </h2>
            <p className="mt-0.5 text-[12px] text-[#8a97a8]">
              Share of merchants by status
            </p>
          </div>
          <div className="h-60 w-full sm:h-[280px]">
            {statusData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-[13px] text-[#8a97a8]">
                No merchants yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={3}
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {statusData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={
                          STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltipBox />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12, color: "#6b7c93" }}
                    formatter={(value, entry) =>
                      `${value} · ${Number(
                        (entry as { payload?: { value?: number } }).payload
                          ?.value ?? 0,
                      ).toLocaleString("id-ID")}`
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
