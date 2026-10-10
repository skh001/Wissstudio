"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser, runAction, unwrap } from "@/lib/action";
import { MEDIA_BUCKET } from "@/lib/constants";

const gallerySchema = z.object({
  title: z.string().max(120).nullable().optional(),
  before_url: z.string().url().nullable().optional(),
  after_url: z.string().url({ message: "Add the after photo" }),
  categories: z.array(z.string()).max(10),
  client_id: z.string().uuid().nullable().optional(),
  appointment_id: z.string().uuid().nullable().optional(),
  is_featured: z.boolean().default(false),
});
export type GalleryInput = z.input<typeof gallerySchema>;

function revalidate(clientId?: string | null, appointmentId?: string | null) {
  revalidatePath("/gallery");
  if (clientId) revalidatePath(`/clients/${clientId}`);
  if (appointmentId) revalidatePath(`/appointments/${appointmentId}`);
}

export async function upsertGalleryItem(input: GalleryInput, id?: string) {
  return runAction(async () => {
    const { supabase } = await requireUser();
    const row = gallerySchema.parse(input);
    if (id) unwrap(await supabase.from("gallery_items").update(row).eq("id", id).select("id"));
    else unwrap(await supabase.from("gallery_items").insert(row).select("id"));
    revalidate(row.client_id, row.appointment_id);
    return null;
  });
}

export async function deleteGalleryItem(id: string) {
  return runAction(async () => {
    const { supabase } = await requireUser();
    const item = unwrap(await supabase.from("gallery_items").delete().eq("id", id).select("*").single()) as {
      before_url: string | null; after_url: string; client_id: string | null; appointment_id: string | null;
    };
    // remove the files from storage too
    const paths = [item.before_url, item.after_url]
      .filter((u): u is string => !!u)
      .map((u) => u.split(`/object/public/${MEDIA_BUCKET}/`)[1])
      .filter((p): p is string => !!p);
    if (paths.length) await supabase.storage.from(MEDIA_BUCKET).remove(paths);
    revalidate(item.client_id, item.appointment_id);
    return null;
  });
}
