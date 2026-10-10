import "server-only";
import { requireUser, unwrap } from "@/lib/action";
import type { GalleryItem } from "@/types/domain";

export async function listGallery(): Promise<GalleryItem[]> {
  const { supabase } = await requireUser();
  return unwrap(
    await supabase.from("gallery_items").select("*, client:clients(id, first_name, last_name)").order("created_at", { ascending: false }),
  ) as GalleryItem[];
}
