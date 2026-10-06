"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Datum = Record<string, string | number>;

type TooltipContent = { active?: boolean; payload?: { value?: number | string }[]; label?: string | number; format: (v: number) => string };

function ChartTooltip({ active, payload, label, format }: TooltipContent) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-semibold text-foreground">{format(Number(payload[0].value))}</p>
    </div>
  );
}

/**
 * Single-series bar chart: one hue (brand), recessive grid, 4px rounded data
 * ends, hover tooltip, and a table view for screen readers / exact values.
 */
export function BarChartCard({
  title,
  description,
  data,
  x,
  y,
  format = (v) => String(v),
  horizontal = false,
  height = 240,
}: {
  title: string;
  description?: string;
  data: Datum[];
  x: string;
  y: string;
  format?: (v: number) => string;
  horizontal?: boolean;
  height?: number;
}) {
  const empty = data.every((d) => !Number(d[y]));
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      <div className="mt-4" style={{ height }} aria-hidden>
        {empty ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">No data in this period yet</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 4, right: 8, bottom: 0, left: horizontal ? 8 : -12 }} barCategoryGap={horizontal ? 6 : 2}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="0" vertical={horizontal} horizontal={!horizontal} />
              {horizontal ? (
                <>
                  <XAxis type="number" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => format(v)} allowDecimals={false} />
                  <YAxis type="category" dataKey={x} width={130} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                </>
              ) : (
                <>
                  <XAxis dataKey={x} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => format(v)} allowDecimals={false} width={56} />
                </>
              )}
              <Tooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltip format={format} />} />
              <Bar dataKey={y} fill="var(--brand)" radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={horizontal ? 18 : 22} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">View as table</summary>
        <div className="mt-2 max-h-56 overflow-y-auto">
          <table className="w-full">
            <tbody className="divide-y">
              {data.map((d) => (
                <tr key={String(d[x])}>
                  <td className="py-1 text-muted-foreground">{d[x]}</td>
                  <td className="py-1 text-right font-medium">{format(Number(d[y]))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
