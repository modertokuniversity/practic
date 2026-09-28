"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function LineTrendChart({
  data,
  dataKey,
  color = "#EF4444",
  unit = "хв",
}: {
  data: Record<string, string | number>[];
  dataKey: string;
  color?: string;
  unit?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} dy={8} tick={{ fontSize: 11 }} />
        <YAxis axisLine={false} tickLine={false} width={28} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #E4E4EC", fontSize: 12 }}
          formatter={(v: number) => [`${v} ${unit}`, "Значення"]}
        />
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
