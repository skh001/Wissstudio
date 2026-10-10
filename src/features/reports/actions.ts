"use server";

import {
  endOfDay, endOfMonth, endOfWeek, endOfYear, startOfDay, startOfMonth, startOfWeek, startOfYear, format,
} from "date-fns";
import { requireUser, runAction } from "@/lib/action";
import { round2, sum, fullName } from "@/lib/utils";
import { expenseBreakdown, topClients, topServices, type RevenueAppointment } from "@/features/finance/lib/analytics";
import { getFinanceData } from "@/features/finance/repository";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";
import type { ExpenseCategory, PaymentMethod } from "@/types/domain";

export type ReportPeriod = "daily" | "weekly" | "monthly" | "yearly";

export async function getReportData(period: ReportPeriod, dateISO: string) {
  return runAction(async () => {
    const { supabase, user } = await requireUser();
    const d = new Date(`${dateISO}T12:00:00`);
    const range = {
      daily: [startOfDay(d), endOfDay(d)],
      weekly: [startOfWeek(d, { weekStartsOn: 1 }), endOfWeek(d, { weekStartsOn: 1 })],
      monthly: [startOfMonth(d), endOfMonth(d)],
      yearly: [startOfYear(d), endOfYear(d)],
    }[period] as [Date, Date];

    const [{ appointments, expenses }, { data: settings }] = await Promise.all([
      getFinanceData(range[0].toISOString(), range[1].toISOString()),
      supabase.from("salon_settings").select("name, address, phone, email, siret, tax_rate, tax_label, currency").eq("owner_id", user.id).single(),
    ]);

    const done = appointments.filter((a) => a.status === "completed");
    const revenue = round2(sum(done, (a) => a.total_price));
    const productCost = round2(sum(done, (a) => a.product_cost));
    const totalExpenses = round2(sum(expenses, (e) => e.amount));
    const taxRate = Number(settings?.tax_rate ?? 0);

    const byMethod = new Map<string, number>();
    for (const a of done) {
      const k = PAYMENT_METHODS[(a.payment_method ?? "other") as PaymentMethod];
      byMethod.set(k, round2((byMethod.get(k) ?? 0) + Number(a.total_price)));
    }

    return {
      salon: settings,
      period,
      label: {
        daily: format(range[0], "dd/MM/yyyy"),
        weekly: `${format(range[0], "dd/MM")} – ${format(range[1], "dd/MM/yyyy")}`,
        monthly: format(range[0], "MM/yyyy"),
        yearly: format(range[0], "yyyy"),
      }[period],
      from: range[0].toISOString(),
      to: range[1].toISOString(),
      summary: {
        revenue,
        expenses: totalExpenses,
        productCost,
        profit: round2(revenue - totalExpenses),
        taxes: round2((revenue * taxRate) / 100),
        taxLabel: settings?.tax_label ?? "Taxes",
        taxRate,
        appointments: done.length,
        cancelled: appointments.filter((a) => a.status === "cancelled").length,
        averageBasket: done.length ? round2(revenue / done.length) : 0,
        clients: new Set(done.map((a) => a.client_id).filter(Boolean)).size,
      },
      paymentMethods: [...byMethod.entries()].map(([method, amount]) => ({ method, amount })),
      topServices: topServices(done as unknown as RevenueAppointment[], 10),
      topClients: topClients(done as unknown as RevenueAppointment[], 10),
      expenseBreakdown: expenseBreakdown(expenses).map((e) => ({ ...e, label: EXPENSE_CATEGORIES[e.category as ExpenseCategory].label })),
      appointmentRows: appointments.map((a) => ({
        date: format(new Date(a.start_at), "dd/MM/yyyy HH:mm"),
        client: fullName(a.client),
        service: a.service?.name ?? "",
        status: a.status,
        payment: a.payment_method ? PAYMENT_METHODS[a.payment_method as PaymentMethod] : "",
        total: Number(a.total_price),
        product_cost: Number(a.product_cost),
        profit: round2(Number(a.total_price) - Number(a.product_cost)),
      })),
      expenseRows: expenses.map((e) => ({
        date: format(new Date(`${e.date}T12:00:00`), "dd/MM/yyyy"),
        category: EXPENSE_CATEGORIES[e.category].label,
        label: e.label,
        supplier: e.supplier ?? "",
        amount: Number(e.amount),
      })),
    };
  });
}
export type ReportData = NonNullable<Extract<Awaited<ReturnType<typeof getReportData>>, { ok: true }>["data"]>;
