import "server-only";
import { addDays, endOfMonth, startOfMonth, subMonths, min as minDate, startOfYear } from "date-fns";
import { requireUser, unwrap } from "@/lib/action";
import { round2, sum } from "@/lib/utils";
import {
  expensesBetween, isRevenue, monthlySeries, pctChange, periodRanges, returningRate, revenueBetween,
  topClients, topServices, type RevenueAppointment,
} from "@/features/finance/lib/analytics";
import { APPOINTMENT_SELECT } from "@/features/appointments/repository";
import type { Activity, AppointmentWithRelations, Expense, ProductWithCategory } from "@/types/domain";

export async function getDashboardData() {
  const { supabase } = await requireUser();
  const now = new Date();
  const from = minDate([startOfYear(now), startOfMonth(subMonths(now, 11))]);
  const r = periodRanges(now);

  const [appts, expenses, products, activity, upcoming] = await Promise.all([
    supabase.from("appointments")
      .select("id, start_at, status, total_price, product_cost, client_id, service_id, service:services(name), client:clients(first_name, last_name)")
      .gte("start_at", from.toISOString()).lt("start_at", addDays(now, 1).toISOString()).limit(10000),
    supabase.from("expenses").select("date, amount, category").gte("date", from.toISOString().slice(0, 10)),
    supabase.from("products").select("*, category:stock_categories(id, name)"),
    supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(8),
    supabase.from("appointments").select(APPOINTMENT_SELECT)
      .gte("start_at", r.today.start.toISOString()).in("status", ["pending", "confirmed", "completed"])
      .lt("start_at", addDays(now, 14).toISOString()).order("start_at").limit(40),
  ]);

  const all = unwrap(appts) as unknown as RevenueAppointment[];
  const exp = unwrap(expenses) as Pick<Expense, "date" | "amount" | "category">[];
  const upcomingList = unwrap(upcoming) as AppointmentWithRelations[];

  const monthRevenue = revenueBetween(all, r.month.start, r.month.end);
  const lastMonthRevenue = revenueBetween(all, r.lastMonth.start, r.lastMonth.end);
  const monthExpenses = expensesBetween(exp, r.month.start, r.month.end);
  const monthCompleted = all.filter((a) => isRevenue(a) && new Date(a.start_at) >= r.month.start);
  const todayList = upcomingList.filter((a) => new Date(a.start_at) <= r.today.end);
  const last90 = all.filter((a) => new Date(a.start_at) >= addDays(now, -90));

  return {
    today: {
      appointments: todayList,
      revenue: revenueBetween(all, r.today.start, r.today.end),
      expected: round2(sum(todayList.filter((a) => a.status !== "completed"), (a) => a.total_price)),
    },
    revenue: {
      week: revenueBetween(all, r.week.start, r.week.end),
      month: monthRevenue,
      monthTrend: pctChange(monthRevenue, lastMonthRevenue),
      year: revenueBetween(all, r.year.start, r.year.end),
    },
    expenses: { month: monthExpenses },
    profit: { month: round2(monthRevenue - monthExpenses) },
    clientsThisMonth: new Set(monthCompleted.map((a) => a.client_id).filter(Boolean)).size,
    averageBasket: monthCompleted.length ? round2(monthRevenue / monthCompleted.length) : 0,
    returningRate: returningRate(all, r.month.start, r.month.end),
    series: monthlySeries(all, exp, startOfMonth(subMonths(now, 11)), endOfMonth(now)),
    topServices: topServices(last90, 5),
    bestClient: topClients(all.filter((a) => new Date(a.start_at) >= r.year.start), 1)[0] ?? null,
    lowStock: (unwrap(products) as ProductWithCategory[]).filter((p) => Number(p.quantity) <= Number(p.min_quantity)),
    activity: unwrap(activity) as Activity[],
    upcoming: upcomingList.filter((a) => new Date(a.start_at) > now && a.status !== "completed").slice(0, 6),
  };
}
export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
