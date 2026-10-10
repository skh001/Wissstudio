"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser, runAction, unwrap, AppError } from "@/lib/action";

const reviewSchema = z.object({
  source: z.enum(["google", "manual", "instagram"]),
  author_name: z.string().trim().min(1, "Enter the client's name").max(80),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).nullable().optional(),
  review_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  client_id: z.string().uuid().nullable().optional(),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

export async function upsertReview(input: ReviewInput, id?: string) {
  return runAction(async () => {
    const { supabase } = await requireUser();
    const row = reviewSchema.parse(input);
    if (id) unwrap(await supabase.from("reviews").update(row).eq("id", id).select("id"));
    else unwrap(await supabase.from("reviews").insert(row).select("id"));
    revalidatePath("/reviews");
    return null;
  });
}

export async function deleteReview(id: string) {
  return runAction(async () => {
    const { supabase } = await requireUser();
    unwrap(await supabase.from("reviews").delete().eq("id", id).select("id"));
    revalidatePath("/reviews");
    return null;
  });
}

/** Imports the latest Google reviews (the Places API returns at most 5 per call). */
export async function importGoogleReviews() {
  return runAction(async () => {
    const { supabase, user } = await requireUser();
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (!key) throw new AppError("Add GOOGLE_PLACES_API_KEY to the environment to import Google reviews.");
    const { data: settings } = await supabase.from("salon_settings").select("google_place_id").eq("owner_id", user.id).single();
    if (!settings?.google_place_id) throw new AppError("Add your Google Place ID in Settings → Salon first.");

    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(settings.google_place_id)}`, {
      headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "reviews,rating,userRatingCount" },
      cache: "no-store",
    });
    if (!res.ok) throw new AppError(`Google returned an error (${res.status}). Check the Place ID and API key.`);
    const json = (await res.json()) as {
      reviews?: { name: string; rating: number; text?: { text: string }; originalText?: { text: string };
        publishTime: string; authorAttribution?: { displayName: string; photoUri?: string } }[];
    };
    const rows = (json.reviews ?? []).map((r) => ({
      source: "google" as const,
      external_id: r.name,
      author_name: r.authorAttribution?.displayName ?? "Google user",
      author_photo_url: r.authorAttribution?.photoUri ?? null,
      rating: r.rating,
      comment: r.originalText?.text ?? r.text?.text ?? null,
      review_date: r.publishTime.slice(0, 10),
      owner_id: user.id,
    }));
    if (rows.length) {
      unwrap(await supabase.from("reviews").upsert(rows, { onConflict: "owner_id,source,external_id", ignoreDuplicates: true }).select("id"));
    }
    revalidatePath("/reviews");
    return { imported: rows.length };
  });
}
