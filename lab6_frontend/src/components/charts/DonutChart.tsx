"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export function DonutChart({
  data,
  size = 160,
}: {
  data: { name: string; value: number; color: string }[];
  size?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={size * 0.32} outerRadius={size * 0.48} paddingAngle={3} stroke="none">
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E4E4EC", fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-ink-800">{total}</span>
        <span className="text-[10px] text-ink-400">всього</span>
      </div>
    </div>
  );
}
