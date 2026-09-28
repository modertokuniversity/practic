"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

/** Навантаження учасників проєкту (год, горизонтальні стовпці) — тільки на сторінці проєкту. */
export function WorkloadBarChart({ data }: { data: { name: string; hours: number; color: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 38)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
        <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={110} tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #E4E4EC", fontSize: 12 }}
          formatter={(v: number) => [`${v} год`, "Відпрацьовано"]}
          cursor={{ fill: "#F8F8FB" }}
        />
        <Bar dataKey="hours" radius={[0, 8, 8, 0]} maxBarSize={20}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
