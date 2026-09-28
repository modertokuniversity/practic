"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

export function DepartmentBarChart({ data }: { data: { department: string; hours: number; color: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="department" axisLine={false} tickLine={false} dy={8} interval={0} tick={{ fontSize: 10 }} />
        <YAxis axisLine={false} tickLine={false} width={28} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #E4E4EC", fontSize: 12 }}
          formatter={(v: number) => [`${v} год`, "Відпрацьовано"]}
          cursor={{ fill: "#F8F8FB" }}
        />
        <Bar dataKey="hours" radius={[8, 8, 0, 0]} maxBarSize={48}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
