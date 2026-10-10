"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { endOfMonth, endOfWeek, endOfYear, format, isSameYear, startOfMonth, startOfWeek, startOfYear } from "date-fns";
import { ChevronLeft, ChevronRight, Landmark, Pencil, Plus, Receipt, Trash2, TrendingDown, TrendingUp, Trophy, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChipFilter } from "@/components/shared/chip-filter";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { useSalon } from "@/components/layout/salon-context";
import { useServerAction } from "@/hooks/use-server-action";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import { round2, sum } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import type { Expense, ExpenseCategory, GiftCard, Invoice } from "@/types/domain";
import { deleteExpense } from "../actions";
import {
  expenseBreakdown, expensesBetween, monthlySeries, revenueBetween, topClients, topServices, type RevenueAppointment,
} from "../lib/analytics";
import { DonutChart, ProfitChart, RevenueChart } from "./charts";
import { ExpenseCategorySelect, ExpenseFormDialog } from "./expense-form-dialog";
import { GiftCardsPanel } from "./gift-cards-panel";
import { InvoiceList } from "./invoice-list";

type Period = "week" | "month" | "year";

export function FinanceView({
  year, appointments, expenses, invoices, giftCards,
}: {
  year: number; appointments: RevenueAppointment[]; expenses: Expense[]; invoices: Invoice[]; giftCards: GiftCard[];
}) {
  const salon = useSalon();
  const router = useRouter();
  const params = useSearchParams();
  const openQuick = useUIStore((s) => s.openQuick);
  const { run } = useServerAction();
  const [period, setPeriod] = useState<Period>("month");
  const [category, setCategory] = useState("all");
  const [editing, setEditing] = useState<Expense | null>(null);

  const ref = useMemo(() => (isSameYear(new Date(), new Date(year, 0, 1)) ? new Date() : new Date(year, 11, 31)), [year]);
  const range = {
    week: [startOfWeek(ref, { weekStartsOn: 1 }), endOfWeek(ref, { weekStartsOn: 1 })],
    month: [startOfMonth(ref), endOfMonth(ref)],
    year: [startOfYear(ref), endOfYear(ref)],
  }[period] as [Date, Date];

  const stats = useMemo(() => {
    const inPeriod = appointments.filter((a) => a.status === "completed" && new Date(a.start_at) >= range[0] && new Date(a.start_at) <= range[1]);
    const revenue = revenueBetween(appointments, ...range);
    const exp = expensesBetween(expenses, ...range);
    return {
      revenue, expenses: exp, profit: round2(revenue - exp),
      basket: inPeriod.length ? round2(revenue / inPeriod.length) : 0,
      taxes: round2((revenue * Number(salon.tax_rate)) / 100),
      count: inPeriod.length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments, expenses, period, year, salon.tax_rate]);

  const series = useMemo(() => monthlySeries(appointments, expenses, startOfYear(ref), endOfMonth(ref)), [appointments, expenses, ref]);
  const active = series.filter((m) => m.revenue > 0);
  const best = active.length ? active.reduce((a, b) => (b.revenue > a.revenue ? b : a)) : null;
  const worst = active.length > 1 ? active.reduce((a, b) => (b.revenue < a.revenue ? b : a)) : null;
  const services = topServices(appointments, 8).sort((a, b) => b.profit - a.profit);
  const clients = topClients(appointments, 6);
  const breakdown = expenseBreakdown(expenses).map((e) => ({
    name: EXPENSE_CATEGORIES[e.category as ExpenseCategory].label, value: e.amount, color: EXPENSE_CATEGORIES[e.category as ExpenseCategory].color,
  }));
  const filteredExpenses = category === "all" ? expenses : expenses.filter((e) => e.category === category);
  const tab = params.get("tab") ?? "overview";

  return (
    <>
      <PageHeader
        title="Finance"
        description={`${salon.tax_label} estimated at ${salon.tax_rate} % of revenue`}
        actions={
          <>
            <div className="flex items-center rounded-full border bg-card">
              <Button variant="ghost" size="icon-sm" asChild><Link href={`/finance?year=${year - 1}`} aria-label="Previous year"><ChevronLeft /></Link></Button>
              <span className="px-2 text-sm font-medium tabular">{year}</span>
              <Button variant="ghost" size="icon-sm" asChild><Link href={`/finance?year=${year + 1}`} aria-label="Next year"><ChevronRight /></Link></Button>
            </div>
            <Button onClick={() => openQuick("expense")}><Plus />Add expense</Button>
          </>
        }
      />

      <Tabs value={tab} onValueChange={(v) => router.replace(`/finance?year=${year}&tab=${v}`, { scroll: false })}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="gift-cards">Gift cards</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5">
          <ChipFilter<Period> value={period} onChange={setPeriod}
            options={[{ value: "week", label: "This week" }, { value: "month", label: "This month" }, { value: "year", label: `Year ${year}` }]} />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard label="Revenue" value={stats.revenue} format="currency" icon={Wallet} hint={`${stats.count} appointments`} />
            <StatCard label="Expenses" value={stats.expenses} format="currency" icon={Receipt} />
            <StatCard label="Profit" value={stats.profit} format="currency" icon={TrendingUp} tone={stats.profit < 0 ? "alert" : "default"} />
            <StatCard label="Average basket" value={stats.basket} format="currency" icon={Trophy} />
            <StatCard label={`${salon.tax_label} (est.)`} value={stats.taxes} format="currency" icon={Landmark} className="col-span-2 lg:col-span-1" />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Revenue & expenses</CardTitle><CardDescription>{year}, month by month</CardDescription></CardHeader>
              <CardContent><RevenueChart data={series} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Where the money goes</CardTitle><CardDescription>Expenses {year}</CardDescription></CardHeader>
              <CardContent>
                {breakdown.length ? (
                  <>
                    <DonutChart data={breakdown} />
                    <ul className="mt-4 space-y-1.5 text-sm">
                      {breakdown.slice(0, 6).map((b) => (
                        <li key={b.name} className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.color }} /><span className="flex-1">{b.name}</span>
                          <span className="tabular text-muted-foreground">{formatCurrency(b.value)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : <p className="text-sm text-muted-foreground">No expenses this year.</p>}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Profit evolution</CardTitle></CardHeader>
              <CardContent><ProfitChart data={series} height={240} /></CardContent>
            </Card>
            <div className="grid gap-4">
              <Card className="p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingUp className="h-4 w-4 text-emerald-500" />Best month</div>
                <div className="mt-1 font-display text-3xl font-semibold capitalize">{best ? format(new Date(`${best.key}-01`), "MMMM") : "—"}</div>
                {best && <div className="text-sm text-muted-foreground tabular">{formatCurrency(best.revenue)}</div>}
              </Card>
              <Card className="p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingDown className="h-4 w-4 text-red-400" />Quietest month</div>
                <div className="mt-1 font-display text-3xl font-semibold capitalize">{worst ? format(new Date(`${worst.key}-01`), "MMMM") : "—"}</div>
                {worst && <div className="text-sm text-muted-foreground tabular">{formatCurrency(worst.revenue)}</div>}
              </Card>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Most profitable services</CardTitle><CardDescription>Revenue minus product cost</CardDescription></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Service</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Margin</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {services.map((s) => (
                      <TableRow key={s.name}><TableCell className="font-medium">{s.name}</TableCell><TableCell className="text-right tabular">{s.count}</TableCell>
                        <TableCell className="text-right tabular">{formatCurrency(s.revenue)}</TableCell><TableCell className="text-right font-medium tabular">{formatCurrency(s.profit)}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Top clients</CardTitle><CardDescription>{year}</CardDescription></CardHeader>
              <CardContent>
                <ul className="divide-y divide-border/60">
                  {clients.map((c, i) => (
                    <li key={c.id}>
                      <Link href={`/clients/${c.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-accent/60">
                        <span className="w-6 font-display text-xl font-semibold text-muted-foreground">{i + 1}</span>
                        <span className="flex-1 truncate font-medium">{c.name}</span>
                        <span className="text-xs text-muted-foreground">{c.visits} visits</span>
                        <span className="w-20 text-right font-medium tabular">{formatCurrency(c.spent)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expenses">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <ExpenseCategorySelect value={category} onChange={setCategory} />
            <span className="text-sm text-muted-foreground">Total <strong className="text-foreground tabular">{formatCurrency(sum(filteredExpenses, (e) => e.amount))}</strong></span>
          </div>
          {filteredExpenses.length === 0 ? (
            <EmptyState title="No expenses" description="Track rent, products and subscriptions to see your real profit."
              action={<Button onClick={() => openQuick("expense")}><Plus />Add expense</Button>} />
          ) : (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead className="hidden sm:table-cell">Category</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="w-24" /></TableRow></TableHeader>
                <TableBody>
                  {filteredExpenses.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(e.date, "d MMM")}</TableCell>
                      <TableCell><div className="font-medium">{e.label}</div>{e.supplier && <div className="text-xs text-muted-foreground">{e.supplier}</div>}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="inline-flex items-center gap-1.5 text-sm"><span className="h-2 w-2 rounded-full" style={{ background: EXPENSE_CATEGORIES[e.category].color }} />{EXPENSE_CATEGORIES[e.category].label}</span>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular">{formatCurrency(e.amount)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Button variant="ghost" size="icon-sm" onClick={() => setEditing(e)} aria-label="Edit"><Pencil /></Button>
                          <ConfirmDialog title="Delete this expense?" onConfirm={() => run(() => deleteExpense(e.id), { success: "Expense deleted" })}
                            trigger={<Button variant="ghost" size="icon-sm" aria-label="Delete"><Trash2 /></Button>} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="invoices"><Card><CardContent className="pt-5 sm:pt-6"><InvoiceList invoices={invoices} /></CardContent></Card></TabsContent>
        <TabsContent value="gift-cards"><GiftCardsPanel cards={giftCards} /></TabsContent>
      </Tabs>
      <ExpenseFormDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} expense={editing} />
    </>
  );
}
