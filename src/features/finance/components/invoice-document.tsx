"use client";

import Link from "next/link";
import { ArrowLeft, Printer, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/shared/logo";
import { useSalon } from "@/components/layout/salon-context";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn, fullName } from "@/lib/utils";
import type { Invoice } from "@/types/domain";
import { useState } from "react";

/** A4 invoice + 80 mm thermal receipt layout, both printable from the browser. */
export function InvoiceDocument({ invoice }: { invoice: Invoice }) {
  const salon = useSalon();
  const [receipt, setReceipt] = useState(false);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Link href="/finance?tab=invoices" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Invoices</Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setReceipt((r) => !r)}><Receipt />{receipt ? "Invoice layout" : "Receipt layout"}</Button>
          <Button onClick={() => window.print()}><Printer />Print</Button>
        </div>
      </div>

      <article className={cn("print-area mx-auto rounded-3xl border bg-white text-[#2a1e23] shadow-soft", receipt ? "max-w-[80mm] p-5 font-mono text-[11px]" : "p-8 sm:p-12")}>
        <header className={cn("flex gap-6", receipt ? "flex-col items-center text-center" : "items-start justify-between")}>
          <div className={cn("flex items-center gap-3", receipt && "flex-col")}>
            {salon.logo_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={salon.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover" />
              : <LogoMark className="h-12 w-12" />}
            <div>
              <div className={cn("font-semibold", receipt ? "text-sm" : "font-display text-2xl")}>{salon.name}</div>
              <div className="text-xs text-neutral-500">{salon.address}</div>
              <div className="text-xs text-neutral-500">{[salon.phone, salon.email].filter(Boolean).join(" · ")}</div>
              {salon.siret && <div className="text-xs text-neutral-500">SIRET {salon.siret}</div>}
            </div>
          </div>
          <div className={receipt ? "" : "text-right"}>
            <div className={receipt ? "font-semibold" : "font-display text-3xl font-semibold"}>{receipt ? "Reçu" : "Facture"}</div>
            <div className="text-sm">{invoice.number}</div>
            <div className="text-xs text-neutral-500">{formatDate(invoice.issued_at, "dd/MM/yyyy HH:mm")}</div>
          </div>
        </header>

        {invoice.client && !receipt && (
          <div className="mt-8 rounded-2xl bg-[#FFF6FA] p-4 text-sm">
            <div className="text-xs text-neutral-500">Client</div>
            <div className="font-medium">{fullName(invoice.client)}</div>
            <div className="text-xs text-neutral-500">{[invoice.client.phone, invoice.client.email].filter(Boolean).join(" · ")}</div>
          </div>
        )}

        <table className={cn("w-full", receipt ? "mt-4" : "mt-8 text-sm")}>
          <thead>
            <tr className="border-b text-left text-xs text-neutral-500">
              <th className="py-2 font-normal">Prestation</th>
              <th className="py-2 text-right font-normal">Qté</th>
              {!receipt && <th className="py-2 text-right font-normal">P.U.</th>}
              <th className="py-2 text-right font-normal">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it, i) => (
              <tr key={i} className="border-b border-dashed">
                <td className="py-2">{it.label}</td>
                <td className="py-2 text-right tabular">{it.quantity}</td>
                {!receipt && <td className="py-2 text-right tabular">{formatCurrency(it.unit_price)}</td>}
                <td className="py-2 text-right tabular">{formatCurrency(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={cn("ml-auto mt-4 space-y-1", receipt ? "" : "max-w-xs text-sm")}>
          <div className="flex justify-between"><span>Sous-total</span><span className="tabular">{formatCurrency(invoice.subtotal)}</span></div>
          {Number(invoice.discount) > 0 && <div className="flex justify-between"><span>Remise</span><span className="tabular">−{formatCurrency(invoice.discount)}</span></div>}
          <div className={cn("flex justify-between border-t pt-2 font-semibold", !receipt && "text-lg")}><span>Total TTC</span><span className="tabular">{formatCurrency(invoice.total)}</span></div>
          <div className="flex justify-between text-xs text-neutral-500">
            <span>{invoice.paid ? "Payé" : "À régler"}</span>
            <span>{invoice.payment_method ? PAYMENT_METHODS[invoice.payment_method] : ""}</span>
          </div>
        </div>

        <footer className={cn("text-center text-[10px] text-neutral-500", receipt ? "mt-6" : "mt-12")}>
          {!salon.vat_applicable && <p>TVA non applicable, art. 293 B du CGI</p>}
          <p className="mt-1">Merci pour votre confiance 💗 {salon.socials.instagram}</p>
        </footer>
      </article>
    </div>
  );
}
