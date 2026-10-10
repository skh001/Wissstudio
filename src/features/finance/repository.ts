import "server-only";
import { requireUser, unwrap } from "@/lib/action";
import type { Appointment, Expense, GiftCard, Invoice } from "@/types/domain";

export type FinanceAppointment = Pick<
  Appointment, "id" | "start_at" | "status" | "total_price" | "product_cost" | "profit" | "client_id" | "service_id" | "payment_status" | "payment_method"
> & { service: { name: string } | null; client: { first_name: string; last_name: string } | null };

export async function getFinanceData(from: string, to: string) {
  const { supabase } = await requireUser();
  const [appointments, expenses] = await Promise.all([
    supabase.from("appointments")
      .select("id, start_at, status, total_price, product_cost, profit, client_id, service_id, payment_status, payment_method, service:services(name), client:clients(first_name, last_name)")
      .gte("start_at", from).lt("start_at", to).order("start_at"),
    supabase.from("expenses").select("*").gte("date", from.slice(0, 10)).lt("date", to.slice(0, 10)).order("date", { ascending: false }),
  ]);
  return {
    appointments: unwrap(appointments) as unknown as FinanceAppointment[],
    expenses: unwrap(expenses) as Expense[],
  };
}

export async function listInvoices(limit = 200): Promise<Invoice[]> {
  const { supabase } = await requireUser();
  return unwrap(
    await supabase.from("invoices").select("*, client:clients(id, first_name, last_name, email, phone)").order("issued_at", { ascending: false }).limit(limit),
  ) as Invoice[];
}

export async function getInvoice(id: string) {
  const { supabase } = await requireUser();
  return unwrap(
    await supabase.from("invoices").select("*, client:clients(id, first_name, last_name, email, phone)").eq("id", id).maybeSingle(),
  ) as Invoice | null;
}

export async function listGiftCards(): Promise<GiftCard[]> {
  const { supabase } = await requireUser();
  return unwrap(await supabase.from("gift_cards").select("*").order("created_at", { ascending: false })) as GiftCard[];
}
