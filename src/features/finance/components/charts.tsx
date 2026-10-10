"use client";

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/format";

const axis = { stroke: "hsl(var(--muted-foreground))", fontSize: 11, tickLine: false, axisLine: false } as const;

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-lift">
      {label && <div className="mb-1 font-medium capitalize">{label}</div>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="ml-auto pl-3 font-medium tabular">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export interface MonthPoint { month: string; revenue: number; expenses: number; profit: number }

export function RevenueChart({ data, height = 280 }: { data: MonthPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 6, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="g-rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B76E79" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#B76E79" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="g-exp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EBD3BC" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#EBD3BC" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 6" />
        <XAxis dataKey="month" {...axis} />
        <YAxis {...axis} tickFormatter={(v) => `${v}€`} width={52} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#D9A3AB", strokeDasharray: "4 4" }} />
        <Area type="monotone" name="Revenue" dataKey="revenue" stroke="#B76E79" strokeWidth={2.5} fill="url(#g-rev)" animationDuration={900} />
        <Area type="monotone" name="Expenses" dataKey="expenses" stroke="#C9A98A" strokeWidth={2} fill="url(#g-exp)" animationDuration={900} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ProfitChart({ data, height = 280 }: { data: MonthPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 6, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 6" />
        <XAxis dataKey="month" {...axis} />
        <YAxis {...axis} tickFormatter={(v) => `${v}€`} width={52} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--accent))", radius: 8 }} />
        <Bar dataKey="profit" name="Profit" radius={[8, 8, 8, 8]} animationDuration={900} maxBarSize={36}>
          {data.map((d) => <Cell key={d.month} fill={d.profit >= 0 ? "#E99BBB" : "#EE8F8F"} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data, height = 220 }: { data: { name: string; value: number; color: string }[]; height?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none" animationDuration={900}>
            {data.map((d) => <Cell key={d.name} fill={d.color} />)}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-display text-2xl font-semibold tabular">{formatCurrency(total, { compact: true })}</div>
          <div className="text-[11px] text-muted-foreground">total</div>
        </div>
      </div>
    </div>
  );
}
