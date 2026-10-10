"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { FileSpreadsheet, FileText, FileType2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChipFilter } from "@/components/shared/chip-filter";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { formatCurrency } from "@/lib/format";
import { getReportData, type ReportData, type ReportPeriod } from "../actions";
import { exportReportCSV, exportReportExcel, exportReportPDF } from "../lib/exporters";

export function ReportsView() {
  const [period, setPeriod] = useState<ReportPeriod>("monthly");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [busy, setBusy] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["report", period, date],
    queryFn: async () => { const r = await getReportData(period, date); if (!r.ok) throw new Error(r.error); return r.data; },
    enabled: /^\d{4}-\d{2}-\d{2}$/.test(date),
  });

  async function exportAs(kind: "pdf" | "xlsx" | "csv", fn: (d: ReportData) => unknown) {
    if (!data) return;
    setBusy(kind);
    try { await fn(data); toast.success("Report downloaded"); }
    catch (e) { console.error(e); toast.error("The file couldn't be created. Try again."); }
    finally { setBusy(null); }
  }

  const s = data?.summary;
  const tiles = s ? [
    ["Revenue", formatCurrency(s.revenue)], ["Expenses", formatCurrency(s.expenses)], ["Profit", formatCurrency(s.profit)],
    [`${s.taxLabel} (est.)`, formatCurrency(s.taxes)], ["Appointments", String(s.appointments)], ["Average basket", formatCurrency(s.averageBasket)],
  ] : [];

  return (
    <>
      <PageHeader
        title="Reports"
        description="Ready for your accountant: PDF to read, Excel to work with, CSV for any tool."
        actions={
          <>
            <Button variant="outline" disabled={!data || !!busy} onClick={() => exportAs("csv", exportReportCSV)}>{busy === "csv" ? <Loader2 className="animate-spin" /> : <FileType2 />}CSV</Button>
            <Button variant="outline" disabled={!data || !!busy} onClick={() => exportAs("xlsx", exportReportExcel)}>{busy === "xlsx" ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}Excel</Button>
            <Button disabled={!data || !!busy} onClick={() => exportAs("pdf", exportReportPDF)}>{busy === "pdf" ? <Loader2 className="animate-spin" /> : <FileText />}PDF</Button>
          </>
        }
      />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <ChipFilter<ReportPeriod> value={period} onChange={setPeriod}
          options={[{ value: "daily", label: "Day" }, { value: "weekly", label: "Week" }, { value: "monthly", label: "Month" }, { value: "yearly", label: "Year" }]} />
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44 rounded-full" aria-label="Report date" />
        {data && <span className="text-sm text-muted-foreground">Period: {data.label}</span>}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : isError || !data ? (
        <EmptyState title="The report couldn't load" description="Check your connection and try again." />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {tiles.map(([label, value]) => (
              <Card key={label} className="p-5">
                <div className="text-sm text-muted-foreground">{label}</div>
                <div className="mt-1 font-display text-3xl font-semibold tabular">{value}</div>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Services</CardTitle></CardHeader>
              <CardContent>
                {data.topServices.length ? (
                  <Table>
                    <TableHeader><TableRow><TableHead>Service</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
                    <TableBody>{data.topServices.map((r) => (
                      <TableRow key={r.name}><TableCell>{r.name}</TableCell><TableCell className="text-right tabular">{r.count}</TableCell><TableCell className="text-right tabular">{formatCurrency(r.revenue)}</TableCell></TableRow>
                    ))}</TableBody>
                  </Table>
                ) : <p className="text-sm text-muted-foreground">No completed appointment in this period.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Payments & expenses</CardTitle></CardHeader>
              <CardContent className="space-y-5 text-sm">
                <ul className="space-y-1.5">
                  {data.paymentMethods.map((p) => <li key={p.method} className="flex justify-between"><span>{p.method}</span><span className="tabular">{formatCurrency(p.amount)}</span></li>)}
                  {!data.paymentMethods.length && <li className="text-muted-foreground">No payment recorded.</li>}
                </ul>
                <ul className="space-y-1.5 border-t pt-4">
                  {data.expenseBreakdown.map((e) => <li key={e.category} className="flex justify-between"><span>{e.label}</span><span className="tabular">{formatCurrency(e.amount)}</span></li>)}
                  {!data.expenseBreakdown.length && <li className="text-muted-foreground">No expense recorded.</li>}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
