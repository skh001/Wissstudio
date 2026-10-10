import type { Metadata } from "next";
import { Suspense } from "react";
import { getFinanceData, listGiftCards, listInvoices } from "@/features/finance/repository";
import { FinanceView } from "@/features/finance/components/finance-view";

export const metadata: Metadata = { title: "Finance" };

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const { year: y } = await searchParams;
  const year = Number(y) >= 2000 && Number(y) <= 2100 ? Number(y) : new Date().getFullYear();
  // include the previous year so "returning" and comparisons have history
  const [{ appointments, expenses }, invoices, giftCards] = await Promise.all([
    getFinanceData(new Date(year, 0, 1).toISOString(), new Date(year + 1, 0, 1).toISOString()),
    listInvoices(),
    listGiftCards(),
  ]);
  return (
    <Suspense>
      <FinanceView year={year} appointments={appointments} expenses={expenses} invoices={invoices} giftCards={giftCards} />
    </Suspense>
  );
}
