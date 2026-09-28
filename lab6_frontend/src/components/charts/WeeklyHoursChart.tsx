"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function WeeklyHoursChart({ data }: { data: { label: string; hours: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="hoursFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="0" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} dy={8} />
        <YAxis axisLine={false} tickLine={false} width={28} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #E4E4EC", fontSize: 12, boxShadow: "0 8px 24px -8px rgba(0,0,0,0.12)" }}
          formatter={(v: number) => [`${v} год`, "Відпрацьовано"]}
        />
        <Area type="monotone" dataKey="hours" stroke="#7C3AED" strokeWidth={2.5} fill="url(#hoursFill)" dot={{ r: 3, fill: "#7C3AED" }} activeDot={{ r: 5 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
