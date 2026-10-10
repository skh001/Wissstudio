import "server-only";
import { requireUser, unwrap } from "@/lib/action";
import type {
  AppointmentWithRelations, Client, ClientStats, ClientWithStats, GalleryItem, Invoice,
} from "@/types/domain";

const EMPTY_STATS = (id: string): ClientStats => ({
  client_id: id, total_spent: 0, appointments_count: 0, last_visit: null, next_visit: null,
});

export async function listClients(): Promise<ClientWithStats[]> {
  const { supabase } = await requireUser();
  const [clients, stats] = await Promise.all([
    supabase.from("clients").select("*").order("first_name"),
    supabase.from("client_stats").select("*"),
  ]);
  const byId = new Map((unwrap(stats) as ClientStats[]).map((s) => [s.client_id, s]));
  return (unwrap(clients) as Client[]).map((c) => ({ ...c, stats: byId.get(c.id) ?? EMPTY_STATS(c.id) }));
}

export async function listClientOptions() {
  const { supabase } = await requireUser();
  return unwrap(
    await supabase.from("clients").select("id, first_name, last_name, phone, avatar_url, is_vip").order("first_name"),
  ) as Pick<Client, "id" | "first_name" | "last_name" | "phone" | "avatar_url" | "is_vip">[];
}

export async function getClientProfile(id: string) {
  const { supabase } = await requireUser();
  const [client, stats, appointments, gallery, invoices] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).maybeSingle(),
    supabase.from("client_stats").select("*").eq("client_id", id).maybeSingle(),
    supabase
      .from("appointments")
      .select("*, client:clients(id, first_name, last_name, phone, avatar_url, is_vip), service:services(id, name, color, duration_minutes)")
      .eq("client_id", id)
      .order("start_at", { ascending: false }),
    supabase.from("gallery_items").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    supabase.from("invoices").select("*").eq("client_id", id).order("issued_at", { ascending: false }),
  ]);
  const c = unwrap(client) as Client | null;
  if (!c) return null;

  const appts = unwrap(appointments) as AppointmentWithRelations[];
  const completedIds = appts.filter((a) => a.status === "completed").map((a) => a.id);

  let products: { name: string; quantity: number; times: number }[] = [];
  if (completedIds.length) {
    const used = unwrap(
      await supabase.from("appointment_products").select("product_name, quantity, appointment_id").in("appointment_id", completedIds.slice(0, 300)),
    ) as { product_name: string; quantity: number; appointment_id: string }[];
    const agg = new Map<string, { name: string; quantity: number; appts: Set<string> }>();
    for (const u of used) {
      const row = agg.get(u.product_name) ?? { name: u.product_name, quantity: 0, appts: new Set<string>() };
      row.quantity += Number(u.quantity);
      row.appts.add(u.appointment_id);
      agg.set(u.product_name, row);
    }
    products = [...agg.values()]
      .map((p) => ({ name: p.name, quantity: p.quantity, times: p.appts.size }))
      .sort((a, b) => b.times - a.times)
      .slice(0, 8);
  }

  const serviceCount = new Map<string, number>();
  for (const a of appts) if (a.status === "completed" && a.service) serviceCount.set(a.service.name, (serviceCount.get(a.service.name) ?? 0) + 1);
  const favoriteService = [...serviceCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    client: c,
    stats: (unwrap(stats) as ClientStats | null) ?? EMPTY_STATS(id),
    appointments: appts,
    gallery: unwrap(gallery) as GalleryItem[],
    invoices: unwrap(invoices) as Invoice[],
    products,
    favoriteService,
  };
}
