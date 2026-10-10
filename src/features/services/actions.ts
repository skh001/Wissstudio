"use server";

import { revalidatePath } from "next/cache";
import { requireUser, runAction, unwrap } from "@/lib/action";
import { ruleSchema, serviceSchema, type RuleInput, type ServiceInput } from "./schemas";

export async function upsertService(input: ServiceInput, id?: string) {
  return runAction(async () => {
    const { supabase } = await requireUser();
    const data = serviceSchema.parse(input);
    if (id) unwrap(await supabase.from("services").update(data).eq("id", id).select("id").single());
    else {
      const { count } = await supabase.from("services").select("id", { count: "exact", head: true });
      unwrap(await supabase.from("services").insert({ ...data, sort_order: (count ?? 0) + 1 }).select("id").single());
    }
    revalidatePath("/services");
    return null;
  });
}

export async function deleteService(id: string) {
  return runAction(async () => {
    const { supabase } = await requireUser();
    unwrap(await supabase.from("services").delete().eq("id", id).select("id"));
    revalidatePath("/services");
    return null;
  });
}

export async function reorderServices(ids: string[]) {
  return runAction(async () => {
    const { supabase } = await requireUser();
    await Promise.all(ids.map((id, i) => supabase.from("services").update({ sort_order: i + 1 }).eq("id", id)));
    revalidatePath("/services");
    return null;
  });
}

export async function addConsumptionRule(input: RuleInput) {
  return runAction(async () => {
    const { supabase } = await requireUser();
    unwrap(await supabase.from("consumption_rules").insert(ruleSchema.parse(input)).select("id").single());
    revalidatePath("/services");
    return null;
  });
}

export async function deleteConsumptionRule(id: string) {
  return runAction(async () => {
    const { supabase } = await requireUser();
    unwrap(await supabase.from("consumption_rules").delete().eq("id", id).select("id"));
    revalidatePath("/services");
    return null;
  });
}
