import Link from "next/link";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { fullName } from "@/lib/utils";
import type { Invoice } from "@/types/domain";

export function InvoiceList({ invoices, showClient = true }: { invoices: Invoice[]; showClient?: boolean }) {
  if (!invoices.length) return <p className="py-6 text-center text-sm text-muted-foreground">No invoices yet. They are created when an appointment is completed.</p>;
  return (
    <ul className="divide-y divide-border/60">
      {invoices.map((inv) => (
        <li key={inv.id}>
          <Link href={`/invoices/${inv.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-accent/60">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blush-100 text-rosegold-500 dark:bg-secondary"><FileText className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <div className="font-medium tabular">{inv.number}</div>
              <div className="truncate text-xs text-muted-foreground">{formatDate(inv.issued_at)}{showClient && inv.client ? ` · ${fullName(inv.client)}` : ""}</div>
            </div>
            <Badge variant={inv.paid ? "success" : "outline"}>{inv.paid ? "Paid" : "Unpaid"}</Badge>
            <div className="w-20 text-right font-medium tabular">{formatCurrency(inv.total)}</div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
