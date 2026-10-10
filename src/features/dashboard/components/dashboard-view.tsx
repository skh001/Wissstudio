"use client";

import Link from "next/link";
import {
  AlertTriangle, ArrowUpRight, CalendarCheck, Crown, Euro, HandCoins, PiggyBank, Receipt, Repeat, ShoppingBag, TrendingUp, Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ClientAvatar } from "@/components/shared/client-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { ProfitChart, RevenueChart } from "@/features/finance/components/charts";
import { formatCurrency, formatRelativeDay, formatTime, timeAgo } from "@/lib/format";
import { fullName } from "@/lib/utils";
import type { DashboardData } from "../repository";
import { DashboardHero } from "./dashboard-hero";

export function DashboardView({ data, objective, ownerName }: { data: DashboardData; objective: number; ownerName: string }) {
  const nextToday = data.today.appointments.find((a) => new Date(a.start_at) > new Date() && a.status !== "completed");
  const progress = objective > 0 ? Math.min(100, (data.revenue.month / objective) * 100) : 0;
  const maxService = Math.max(1, ...data.topServices.map((s) => s.count));

  return (
    <div className="space-y-6">
      <DashboardHero
        name={ownerName}
        todayCount={data.today.appointments.filter((a) => a.status !== "cancelled").length}
        expected={data.today.expected}
        nextAt={nextToday ? formatTime(nextToday.start_at) : null}
      />

      {data.lowStock.length > 0 && (
        <Link
          href="/stock?filter=low"
          className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 transition hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            <strong>{data.lowStock.length} product{data.lowStock.length > 1 ? "s" : ""} below minimum:</strong>{" "}
            {data.lowStock.slice(0, 4).map((p) => p.name).join(", ")}
          </span>
          <ArrowUpRight className="h-4 w-4 shrink-0" />
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Today" value={data.today.revenue} format="currency" icon={Euro} hint={`${data.today.appointments.length} appointments`} />
        <StatCard label="This week" value={data.revenue.week} format="currency" icon={TrendingUp} />
        <StatCard label="This month" value={data.revenue.month} format="currency" icon={HandCoins} trend={data.revenue.monthTrend} hint="vs last month" />
        <StatCard label="This year" value={data.revenue.year} format="currency" icon={PiggyBank} />
        <StatCard label="Profit this month" value={data.profit.month} format="currency" icon={Receipt} hint={`${formatCurrency(data.expenses.month)} expenses`} tone={data.profit.month < 0 ? "alert" : "default"} />
        <StatCard label="Clients this month" value={data.clientsThisMonth} icon={Users} />
        <StatCard label="Average basket" value={data.averageBasket} format="currency" icon={ShoppingBag} />
        <StatCard label="Returning clients" value={data.returningRate} format="percent" icon={Repeat} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Tabs defaultValue="revenue">
            <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
              <div>
                <CardTitle>Last 12 months</CardTitle>
                <CardDescription>Completed appointments vs expenses</CardDescription>
              </div>
              <TabsList className="h-9">
                <TabsTrigger value="revenue" className="px-3 py-1 text-xs">Revenue</TabsTrigger>
                <TabsTrigger value="profit" className="px-3 py-1 text-xs">Profit</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="revenue" className="mt-0"><RevenueChart data={data.series} /></TabsContent>
              <TabsContent value="profit" className="mt-0"><ProfitChart data={data.series} /></TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Monthly objective</CardTitle>
            <CardDescription>{formatCurrency(objective)} goal</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-6">
            <div>
              <div className="font-display text-5xl font-semibold tabular"><AnimatedCounter value={progress} format="percent" /></div>
              <Progress value={progress} className="mt-3 h-3" />
              <p className="mt-2 text-xs text-muted-foreground">
                {progress >= 100 ? "Objective reached. Beautiful month 💗" : `${formatCurrency(Math.max(0, objective - data.revenue.month))} to go`}
              </p>
            </div>
            {data.bestClient && (
              <Link href={`/clients/${data.bestClient.id}`} className="flex items-center gap-3 rounded-2xl bg-blush-50 p-3 transition hover:bg-blush-100 dark:bg-secondary/60">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-champagne text-rosegold-700"><Crown className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Best client this year</div>
                  <div className="truncate font-medium">{data.bestClient.name}</div>
                </div>
                <div className="ml-auto text-right text-sm font-medium tabular">{formatCurrency(data.bestClient.spent)}</div>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Today</CardTitle>
            <Link href="/calendar" className="text-sm text-primary hover:underline">Open calendar</Link>
          </CardHeader>
          <CardContent>
            {data.today.appointments.length === 0 ? (
              <EmptyState title="Free day" description="No appointments booked for today." className="py-8" />
            ) : (
              <ul className="divide-y divide-border/60">
                {data.today.appointments.map((a) => (
                  <li key={a.id}>
                    <Link href={`/appointments/${a.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-accent/60">
                      <div className="w-12 shrink-0 text-center">
                        <div className="font-display text-xl font-semibold tabular">{formatTime(a.start_at)}</div>
                      </div>
                      <span className="h-10 w-1 shrink-0 rounded-full" style={{ background: a.service?.color ?? "#F4A6C6" }} />
                      <ClientAvatar client={a.client} className="h-9 w-9" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{fullName(a.client)}</div>
                        <div className="truncate text-xs text-muted-foreground">{a.service?.name ?? "Appointment"}</div>
                      </div>
                      <div className="hidden text-right sm:block">
                        <div className="text-sm font-medium tabular">{formatCurrency(a.total_price)}</div>
                      </div>
                      <StatusBadge status={a.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top services</CardTitle><CardDescription>Last 90 days</CardDescription></CardHeader>
          <CardContent>
            {data.topServices.length === 0 ? (
              <p className="text-sm text-muted-foreground">Complete a few appointments to see your favourites.</p>
            ) : (
              <ul className="space-y-3.5">
                {data.topServices.map((s, i) => (
                  <li key={s.name}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate">{i === 0 && "⭐ "}{s.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular">{s.count} × · {formatCurrency(s.revenue, { compact: true })}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-gradient-to-r from-blush-300 to-rosegold-500" style={{ width: `${(s.count / maxService) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Coming up</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {data.upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing booked in the next two weeks.</p>
            ) : (
              <ul className="space-y-1">
                {data.upcoming.map((a) => (
                  <li key={a.id}>
                    <Link href={`/appointments/${a.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-accent/60">
                      <ClientAvatar client={a.client} className="h-8 w-8" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{fullName(a.client)}</div>
                        <div className="truncate text-xs text-muted-foreground">{formatRelativeDay(a.start_at)}</div>
                      </div>
                      <StatusBadge status={a.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Stock alerts</CardTitle>
            <Link href="/stock" className="text-sm text-primary hover:underline">Stock</Link>
          </CardHeader>
          <CardContent>
            {data.lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">Everything is well stocked ✨</p>
            ) : (
              <ul className="space-y-2.5">
                {data.lowStock.slice(0, 6).map((p) => (
                  <li key={p.id} className="flex items-center gap-3">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
                    <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                    <span className="shrink-0 text-xs font-medium text-red-600 tabular dark:text-red-300">{p.quantity} / {p.min_quantity} {p.unit}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
          <CardContent>
            {data.activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Your activity will show up here.</p>
            ) : (
              <ol className="relative space-y-4 border-l border-border pl-4">
                {data.activity.map((a) => (
                  <li key={a.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-rosegold-400" />
                    <div className="text-sm">{a.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{a.description} · {timeAgo(a.created_at)}</div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
