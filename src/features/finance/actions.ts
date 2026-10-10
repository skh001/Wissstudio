"use server";

import { revalidatePath } from "next/cache";
import { requireUser, runAction, unwrap } from "@/lib/action";
import { emptyToNull } from "@/lib/utils";
import { expenseSchema, giftCardSchema, type ExpenseInput, type GiftCardInput } from "./schemas";

const revalidate = () => { revalidatePath("/finance"); revalidatePath("/dashboard"); };

export async function upsertExpense(input: ExpenseInput, id?: string) {
  return runAction(async () => {
    const { supabase } = await requireUser();
    const row = emptyToNull(expenseSchema.parse(input));
    if (id) unwrap(await supabase.from("expenses").update(row).eq("id", id).select("id").single());
    else unwrap(await supabase.from("expenses").insert(row).select("id").single());
    revalidate();
    return null;
  });
}

export async function deleteExpense(id: string) {
  return runAction(async () => {
    const { supabase } = await requireUser();
    unwrap(await supabase.from("expenses").delete().eq("id", id).select("id"));
    revalidate();
    return null;
  });
}

export async function createGiftCard(input: GiftCardInput) {
  return runAction(async () => {
    const { supabase } = await requireUser();
    const data = emptyToNull(giftCardSchema.parse(input));
    unwrap(await supabase.from("gift_cards").insert({ ...data, code: data.code.toUpperCase(), balance: data.initial_amount }).select("id").single());
    revalidatePath("/finance");
    return null;
  });
}

export async function toggleGiftCard(id: string, is_active: boolean) {
  return runAction(async () => {
    const { supabase } = await requireUser();
    unwrap(await supabase.from("gift_cards").update({ is_active }).eq("id", id).select("id"));
    revalidatePath("/finance");
    return null;
  });
}
