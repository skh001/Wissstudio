import "server-only";
import { requireUser, unwrap } from "@/lib/action";
import type { ConsumptionRule, Service } from "@/types/domain";

export async function listServices(opts: { activeOnly?: boolean } = {}): Promise<Service[]> {
  const { supabase } = await requireUser();
  let q = supabase.from("services").select("*").order("sort_order").order("name");
  if (opts.activeOnly) q = q.eq("is_active", true);
  return unwrap(await q) as Service[];
}

export async function listConsumptionRules(): Promise<ConsumptionRule[]> {
  const { supabase } = await requireUser();
  return unwrap(
    await supabase.from("consumption_rules").select("*, product:products(id, name, unit)").order("id"),
  ) as ConsumptionRule[];
}
