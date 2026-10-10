"use server";

import { revalidatePath } from "next/cache";
import { requireUser, runAction, unwrap, AppError } from "@/lib/action";
import { emptyToNull } from "@/lib/utils";
import { clientSchema, type ClientInput } from "./schemas";

function normalize(input: ClientInput) {
  const data = clientSchema.parse(input);
  return emptyToNull({ ...data, instagram: data.instagram ? `@${data.instagram.replace(/^@/, "")}` : data.instagram });
}

export async function upsertClient(input: ClientInput, id?: string) {
  return runAction(async () => {
    const { supabase } = await requireUser();
    const row = normalize(input);
    const saved = (id
      ? unwrap(await supabase.from("clients").update(row).eq("id", id).select("id").single())
      : unwrap(await supabase.from("clients").insert(row).select("id").single())) as { id: string };
    revalidatePath("/clients");
    if (id) revalidatePath(`/clients/${id}`);
    return saved;
  });
}

export async function toggleClientFlag(id: string, flag: "is_favorite" | "is_vip", value: boolean) {
  return runAction(async () => {
    const { supabase } = await requireUser();
    unwrap(await supabase.from("clients").update({ [flag]: value }).eq("id", id).select("id").single());
    revalidatePath("/clients");
    revalidatePath(`/clients/${id}`);
    return null;
  });
}

export async function deleteClient(id: string) {
  return runAction(async () => {
    const { supabase } = await requireUser();
    unwrap(await supabase.from("clients").delete().eq("id", id).select("id"));
    revalidatePath("/clients");
    return null;
  });
}

export async function redeemLoyalty(id: string) {
  return runAction(async () => {
    const { supabase, user } = await requireUser();
    const { data: settings } = await supabase.from("salon_settings").select("loyalty_reward_threshold").eq("owner_id", user.id).single();
    const { data: client } = await supabase.from("clients").select("loyalty_points").eq("id", id).single();
    const threshold = settings?.loyalty_reward_threshold ?? 200;
    if (!client || client.loyalty_points < threshold) throw new AppError(`This client needs ${threshold} points to redeem a reward.`);
    unwrap(await supabase.from("clients").update({ loyalty_points: client.loyalty_points - threshold }).eq("id", id).select("id"));
    revalidatePath(`/clients/${id}`);
    return null;
  });
}

/** CSV import: accepts French or English headers. Skips rows without a first name and existing emails. */
export async function importClients(rows: Record<string, string>[]) {
  return runAction(async () => {
    const { supabase } = await requireUser();
    const pick = (r: Record<string, string>, ...keys: string[]) => keys.map((k) => r[k]).find((v) => v && v.trim()) ?? null;
    const toIsoDate = (v: string | null) => {
      if (!v) return null;
      const fr = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
      if (fr) return `${fr[3]}-${fr[2]!.padStart(2, "0")}-${fr[1]!.padStart(2, "0")}`;
      return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
    };

    const { data: existing } = await supabase.from("clients").select("email");
    const known = new Set((existing ?? []).map((e) => (e.email ?? "").toLowerCase()).filter(Boolean));

    const records = rows
      .map((r) => ({
        first_name: pick(r, "first_name", "prénom", "prenom", "firstname") ?? "",
        last_name: pick(r, "last_name", "nom", "lastname") ?? "",
        phone: pick(r, "phone", "téléphone", "telephone", "tel", "mobile"),
        email: pick(r, "email", "e-mail", "mail")?.toLowerCase() ?? null,
        instagram: pick(r, "instagram", "insta"),
        birthday: toIsoDate(pick(r, "birthday", "anniversaire", "date_de_naissance")),
        notes: pick(r, "notes", "note", "commentaire"),
        allergies: pick(r, "allergies", "allergie"),
      }))
      .filter((r) => r.first_name && (!r.email || !known.has(r.email)));

    if (!records.length) throw new AppError("No new clients found. Check the file has a first name column (first_name or prénom).");
    for (let i = 0; i < records.length; i += 500) {
      unwrap(await supabase.from("clients").insert(records.slice(i, i + 500)).select("id"));
    }
    revalidatePath("/clients");
    return { imported: records.length, skipped: rows.length - records.length };
  });
}
