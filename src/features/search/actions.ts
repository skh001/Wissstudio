"use server";

import { requireUser, runAction } from "@/lib/action";
import { fullName } from "@/lib/utils";

export interface SearchHit {
  id: string;
  group: "Clients" | "Appointments" | "Products" | "Invoices" | "Expenses";
  title: string;
  subtitle: string;
  href: string;
}

export async function globalSearch(query: string) {
  return runAction(async (): Promise<SearchHit[]> => {
    const q = query.trim().replace(/[%,()]/g, " ").trim();
    if (q.length < 2) return [];
    const { supabase } = await requireUser();
    const like = `%${q}%`;

    const [clients, products, invoices, expenses] = await Promise.all([
      supabase.from("clients").select("id, first_name, last_name, phone, email, instagram")
        .or(`first_name.ilike.${like},last_name.ilike.${like},phone.ilike.${like},email.ilike.${like},instagram.ilike.${like}`).limit(6),
      supabase.from("products").select("id, name, brand, barcode, quantity, unit")
        .or(`name.ilike.${like},brand.ilike.${like},barcode.ilike.${like},supplier.ilike.${like}`).limit(5),
      supabase.from("invoices").select("id, number, total, issued_at").ilike("number", like).limit(5),
      supabase.from("expenses").select("id, label, amount, date").or(`label.ilike.${like},supplier.ilike.${like}`).limit(5),
    ]);

    const clientIds = (clients.data ?? []).map((c) => c.id);
    const appts = clientIds.length
      ? await supabase.from("appointments")
          .select("id, start_at, status, client:clients(first_name, last_name), service:services(name)")
          .in("client_id", clientIds).order("start_at", { ascending: false }).limit(6)
      : { data: [] };

    const euro = (n: number) => `${Number(n).toFixed(2).replace(".", ",")} €`;
    const date = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

    return [
      ...(clients.data ?? []).map((c) => ({
        id: c.id, group: "Clients" as const, title: fullName(c),
        subtitle: [c.phone, c.instagram, c.email].filter(Boolean).join(" · "), href: `/clients/${c.id}`,
      })),
      ...((appts.data ?? []) as unknown as { id: string; start_at: string; status: string; client: { first_name: string; last_name: string } | null; service: { name: string } | null }[]).map((a) => ({
        id: a.id, group: "Appointments" as const, title: `${fullName(a.client)} · ${a.service?.name ?? "Appointment"}`,
        subtitle: `${date(a.start_at)} · ${a.status}`, href: `/appointments/${a.id}`,
      })),
      ...(products.data ?? []).map((p) => ({
        id: p.id, group: "Products" as const, title: p.name,
        subtitle: `${p.brand ?? ""} · ${p.quantity} ${p.unit} in stock`.replace(/^ · /, ""), href: `/stock?product=${p.id}`,
      })),
      ...(invoices.data ?? []).map((i) => ({
        id: i.id, group: "Invoices" as const, title: i.number, subtitle: `${euro(i.total)} · ${date(i.issued_at)}`, href: `/invoices/${i.id}`,
      })),
      ...(expenses.data ?? []).map((e) => ({
        id: e.id, group: "Expenses" as const, title: e.label, subtitle: `${euro(e.amount)} · ${date(e.date)}`, href: `/finance?tab=expenses`,
      })),
    ];
  });
}
