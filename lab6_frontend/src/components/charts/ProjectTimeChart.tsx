"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

/** Динаміка витраченого часу по КОНКРЕТНОМУ проєкту (14 днів) — сторінка проєкту.
 * Візуально відрізняється від WeeklyHoursChart (дашборд): інший колір, довший період. */
export function ProjectTimeChart({ data }: { data: { label: string; hours: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="projectFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} dy={8} interval={2} tick={{ fontSize: 10 }} />
        <YAxis axisLine={false} tickLine={false} width={28} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #E4E4EC", fontSize: 12 }}
          formatter={(v: number) => [`${v} год`, "Витрачено"]}
        />
        <Area type="monotone" dataKey="hours" stroke="#0EA5E9" strokeWidth={2.5} fill="url(#projectFill)" dot={{ r: 2.5, fill: "#0EA5E9" }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
