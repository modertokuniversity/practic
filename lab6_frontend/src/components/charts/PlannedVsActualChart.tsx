"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

/** Порівняння планових (оцінка задач) і фактичних (табель) годин проєкту. */
export function PlannedVsActualChart({ planned, actual }: { planned: number; actual: number }) {
  const data = [{ name: "Години", План: planned, Факт: actual }];
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
        <YAxis axisLine={false} tickLine={false} width={28} />
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E4E4EC", fontSize: 12 }} formatter={(v: number) => [`${v} год`, ""]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="План" fill="#D1D1DC" radius={[8, 8, 0, 0]} maxBarSize={64} />
        <Bar dataKey="Факт" fill="#7C3AED" radius={[8, 8, 0, 0]} maxBarSize={64} />
      </BarChart>
    </ResponsiveContainer>
  );
}
