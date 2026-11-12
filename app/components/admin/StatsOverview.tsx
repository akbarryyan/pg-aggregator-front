"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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
import { ChartTooltipBox } from "./DashboardCharts";
import { Card, formatIDR } from "./ui";

export type StatCard = {
  label: string;
  value: string;
  note?: string;
  tone?: string;
  noteTone?: string;
};
export type ChartSeries = { key: string; name: string; color: string };
export type DonutSlice = { name: string; value: number; color: string };

export type StatsOverviewProps = {
  /**
   * Exactly 3 cards. An empty list shows the loading/error placeholder. Omit
   * it for charts-only mode: the full-card placeholder does not apply and the
   * chart card uses `chartLoading` / `chartError` / `onChartRetry` instead.
   */
  cards?: StatCard[];
  chart: {
    title: string;
    subtitle: string;
    data: Record<string, number | string>[];
    xKey: string;
    series: ChartSeries[];
    stacked?: boolean;
    valueFormat?: "number" | "idr";
    emptyText: string;
  };
  donut: {
    title: string;
    subtitle: string;
    slices: DonutSlice[];
    emptyText: string;
  };
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  /**
   * Charts-only usage (no `cards`): the chart card shows an inline
   * loading/error state (with Retry) while the donut still renders.
   */
  chartLoading?: boolean;
  chartError?: boolean;
  onChartRetry?: () => void;
  /** Message of the error card (default: "Could not load the summary."). */
  errorText?: string;
};

const STATUS_PALETTE: Record<string, string> = {
  // payment
  paid: "#22c55e",
  pending: "#f59e0b",
  failed: "#ef4444",
  expired: "#94a3b8",
  cancelled: "#8b5cf6",
  refunded: "#3b9eff",
  // callback / payout / webhook events
  success: "#22c55e",
  sending: "#f59e0b",
  skipped: "#94a3b8",
  processed: "#22c55e",
  received: "#3b9eff",
  requested: "#f59e0b",
  approved: "#3b9eff",
  rejected: "#ef4444",
  active: "#22c55e",
  inactive: "#94a3b8",
};

/** Slice/series colour for a payment, callback, payout or event status. */
export function statusColor(status: string): string {
  return STATUS_PALETTE[status.toLowerCase()] ?? "#94a3b8";
}

/** Y-axis tick label: >= 1.000.000 -> "1,5jt", >= 1.000 -> "12rb". */
export function formatCompactNumber(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".", ",")}jt`;
  if (v >= 1000) return `${Math.round(v / 1000)}rb`;
  return String(v);
}

function SummaryCard({
  label,
  value,
  note,
  tone = "text-[#1f2a37]",
  noteTone = "text-[#8a97a8]",
}: StatCard) {
  return (
    <Card className="min-w-0 p-5">
      <p className="text-[12px] text-[#8a97a8]">{label}</p>
      <p
        className={`mt-2 break-words text-[22px] font-bold tracking-tight ${tone}`}
      >
        {value}
      </p>
      {note !== undefined && (
        <p className={`mt-2 text-[11.5px] ${noteTone}`}>{note}</p>
      )}
    </Card>
  );
}

/** "verification_failed" -> "Verification failed" (donut legend/tooltip only). */
function humanizeLabel(name: string): string {
  const t = name.replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const AXIS_TICK = { fill: "#8a97a8", fontSize: 11 };
const CHART_MARGIN = { top: 8, right: 8, left: 0, bottom: 0 };

/**
 * Three summary cards plus a chart and a donut. Pure presentation: the page
 * loads the data on its own (so the table below keeps working if this fails).
 */
export default function StatsOverview({
  cards,
  chart,
  donut,
  loading = false,
  error = false,
  onRetry,
  errorText = "Could not load the summary.",
  chartLoading = false,
  chartError = false,
  onChartRetry,
}: StatsOverviewProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  if ((cards && cards.length === 0) || error) {
    return (
      <Card className="p-5">
        {error ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-[#e85d3b]">
              {errorText}
            </p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="h-9 shrink-0 rounded-full border border-[#e8eef4] bg-white px-4 text-[12.5px] font-semibold text-[#3d4b5c] transition hover:bg-[#f4f7fb]"
              >
                Retry
              </button>
            )}
          </div>
        ) : (
          <p className="py-6 text-center text-[13px] text-[#8a97a8]">
            {loading ? "Loading summary..." : ""}
          </p>
        )}
      </Card>
    );
  }

  const hasChartData = chart.data.some((d) =>
    chart.series.some((s) => Number(d[s.key] ?? 0) > 0),
  );
  const slices = donut.slices
    .filter((s) => s.value > 0)
    .map((s) => ({ ...s, name: humanizeLabel(s.name) }));
  const idr = chart.valueFormat === "idr";
  const tooltipFormatter = idr ? (v: number) => formatIDR(v) : undefined;
  const xAxis = (
    <XAxis
      dataKey={chart.xKey}
      tick={AXIS_TICK}
      axisLine={false}
      tickLine={false}
      minTickGap={16}
    />
  );
  const yAxis = (
    <YAxis
      allowDecimals={false}
      tick={AXIS_TICK}
      axisLine={false}
      tickLine={false}
      width={idr ? 56 : 32}
      tickFormatter={idr ? formatCompactNumber : undefined}
    />
  );
  const grid = (
    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
  );
  const tooltip = (
    <Tooltip content={<ChartTooltipBox valueFormatter={tooltipFormatter} />} />
  );

  return (
    <div className="space-y-4">
      {cards && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {cards.map((c) => (
            <SummaryCard key={c.label} {...c} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="min-w-0 p-5">
          <div className="mb-4">
            <h2 className="text-[15px] font-semibold text-[#1f2a37]">
              {chart.title}
            </h2>
            <p className="mt-0.5 text-[12px] text-[#8a97a8]">
              {chart.subtitle}
            </p>
          </div>
          <div className="h-60 w-full sm:h-[280px]">
            {chartError ? (
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <p className="text-[13px] text-[#e85d3b]">
                  Could not load the chart.
                </p>
                {onChartRetry && (
                  <button
                    type="button"
                    onClick={onChartRetry}
                    className="h-9 shrink-0 rounded-full border border-[#e8eef4] bg-white px-4 text-[12.5px] font-semibold text-[#3d4b5c] transition hover:bg-[#f4f7fb]"
                  >
                    Retry
                  </button>
                )}
              </div>
            ) : chartLoading ? (
              <div className="flex h-full items-center justify-center text-[13px] text-[#8a97a8]">
                Loading chart...
              </div>
            ) : !hasChartData ? (
              <div className="flex h-full items-center justify-center text-[13px] text-[#8a97a8]">
                {chart.emptyText}
              </div>
            ) : chart.stacked ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart.data} margin={CHART_MARGIN}>
                  {grid}
                  {xAxis}
                  {yAxis}
                  {tooltip}
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12, color: "#6b7c93" }}
                  />
                  {chart.series.map((s) => (
                    <Bar
                      key={s.key}
                      dataKey={s.key}
                      name={s.name}
                      stackId="a"
                      fill={s.color}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart.data} margin={CHART_MARGIN}>
                  <defs>
                    {chart.series.map((s) => (
                      <linearGradient
                        key={s.key}
                        id={`${uid}fill${s.key}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={s.color}
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="100%"
                          stopColor={s.color}
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    ))}
                  </defs>
                  {grid}
                  {xAxis}
                  {yAxis}
                  {tooltip}
                  {chart.series.length > 1 && (
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      wrapperStyle={{ fontSize: 12, color: "#6b7c93" }}
                    />
                  )}
                  {chart.series.map((s) => (
                    <Area
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      name={s.name}
                      stroke={s.color}
                      strokeWidth={2.2}
                      fill={`url(#${uid}fill${s.key})`}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="min-w-0 p-5">
          <div className="mb-4">
            <h2 className="text-[15px] font-semibold text-[#1f2a37]">
              {donut.title}
            </h2>
            <p className="mt-0.5 text-[12px] text-[#8a97a8]">
              {donut.subtitle}
            </p>
          </div>
          <div className="h-60 w-full sm:h-[280px]">
            {slices.length === 0 ? (
              <div className="flex h-full items-center justify-center text-[13px] text-[#8a97a8]">
                {donut.emptyText}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={3}
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {slices.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltipBox />} />
                  <Legend
                    verticalAlign="bottom"
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
