import {
  eachMonthOfInterval, endOfMonth, format, isSameMonth, isWithinInterval, startOfMonth,
  startOfWeek, startOfYear, endOfWeek, startOfDay, endOfDay, subMonths,
} from "date-fns";
import { round2, sum } from "@/lib/utils";
import type { Expense } from "@/types/domain";

export interface RevenueAppointment {
  id: string;
  start_at: string;
  status: string;
  total_price: number;
  product_cost: number;
  client_id: string | null;
  service_id: string | null;
  service?: { name: string } | null;
  client?: { first_name: string; last_name: string } | null;
}

export const isRevenue = (a: RevenueAppointment) => a.status === "completed";

const inRange = (d: string | Date, start: Date, end: Date) =>
  isWithinInterval(typeof d === "string" ? new Date(d) : d, { start, end });

export function revenueBetween(appts: RevenueAppointment[], start: Date, end: Date) {
  return round2(sum(appts.filter((a) => isRevenue(a) && inRange(a.start_at, start, end)), (a) => a.total_price));
}

export function expensesBetween(expenses: Pick<Expense, "date" | "amount">[], start: Date, end: Date) {
  return round2(sum(expenses.filter((e) => inRange(`${e.date}T12:00:00`, start, end)), (e) => e.amount));
}

export function periodRanges(now = new Date()) {
  return {
    today: { start: startOfDay(now), end: endOfDay(now) },
    week: { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) },
    month: { start: startOfMonth(now), end: endOfMonth(now) },
    lastMonth: { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) },
    year: { start: startOfYear(now), end: endOfDay(now) },
  };
}

/** Revenue / expenses / profit per month for charts. */
export function monthlySeries(appts: RevenueAppointment[], expenses: Pick<Expense, "date" | "amount">[], start: Date, end: Date) {
  return eachMonthOfInterval({ start, end }).map((m) => {
    const revenue = round2(sum(appts.filter((a) => isRevenue(a) && isSameMonth(new Date(a.start_at), m)), (a) => a.total_price));
    const exp = round2(sum(expenses.filter((e) => isSameMonth(new Date(`${e.date}T12:00:00`), m)), (e) => e.amount));
    const count = appts.filter((a) => isRevenue(a) && isSameMonth(new Date(a.start_at), m)).length;
    return { key: format(m, "yyyy-MM"), month: format(m, "MMM"), revenue, expenses: exp, profit: round2(revenue - exp), count };
  });
}

export function topServices(appts: RevenueAppointment[], limit = 5) {
  const map = new Map<string, { name: string; count: number; revenue: number; profit: number }>();
  for (const a of appts.filter(isRevenue)) {
    const name = a.service?.name ?? "Other";
    const row = map.get(name) ?? { name, count: 0, revenue: 0, profit: 0 };
    row.count += 1;
    row.revenue += Number(a.total_price);
    row.profit += Number(a.total_price) - Number(a.product_cost);
    map.set(name, row);
  }
  return [...map.values()].map((r) => ({ ...r, revenue: round2(r.revenue), profit: round2(r.profit) }))
    .sort((a, b) => b.count - a.count).slice(0, limit);
}

export function topClients(appts: RevenueAppointment[], limit = 5) {
  const map = new Map<string, { id: string; name: string; visits: number; spent: number }>();
  for (const a of appts.filter((x) => isRevenue(x) && x.client_id)) {
    const row = map.get(a.client_id!) ?? {
      id: a.client_id!, name: `${a.client?.first_name ?? ""} ${a.client?.last_name ?? ""}`.trim() || "Client", visits: 0, spent: 0,
    };
    row.visits += 1;
    row.spent += Number(a.total_price);
    map.set(a.client_id!, row);
  }
  return [...map.values()].map((r) => ({ ...r, spent: round2(r.spent) })).sort((a, b) => b.spent - a.spent).slice(0, limit);
}

export function expenseBreakdown(expenses: Pick<Expense, "category" | "amount">[]) {
  const map = new Map<string, number>();
  for (const e of expenses) map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount));
  return [...map.entries()].map(([category, amount]) => ({ category, amount: round2(amount) })).sort((a, b) => b.amount - a.amount);
}

/** % of clients served in [start,end] who had already visited before start. */
export function returningRate(appts: RevenueAppointment[], start: Date, end: Date) {
  const inPeriod = new Set(appts.filter((a) => isRevenue(a) && a.client_id && inRange(a.start_at, start, end)).map((a) => a.client_id!));
  if (!inPeriod.size) return 0;
  const before = new Set(appts.filter((a) => isRevenue(a) && a.client_id && new Date(a.start_at) < start).map((a) => a.client_id!));
  return Math.round(([...inPeriod].filter((id) => before.has(id)).length / inPeriod.size) * 100);
}

export function pctChange(current: number, previous: number) {
  if (!previous) return current ? null : 0;
  return ((current - previous) / previous) * 100;
}
