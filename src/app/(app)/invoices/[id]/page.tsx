import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getInvoice } from "@/features/finance/repository";
import { InvoiceDocument } from "@/features/finance/components/invoice-document";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const invoice = await getInvoice(id);
  if (!invoice) notFound();
  return <InvoiceDocument invoice={invoice} />;
}
