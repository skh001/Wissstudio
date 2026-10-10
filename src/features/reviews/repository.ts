import "server-only";
import { requireUser, unwrap } from "@/lib/action";
import type { Review } from "@/types/domain";

export async function listReviews(): Promise<Review[]> {
  const { supabase } = await requireUser();
  return unwrap(await supabase.from("reviews").select("*").order("review_date", { ascending: false })) as Review[];
}
