import type { Metadata } from "next";
import { listGallery } from "@/features/gallery/repository";
import { GalleryView } from "@/features/gallery/components/gallery-view";

export const metadata: Metadata = { title: "Gallery" };

export default async function GalleryPage() {
  return <GalleryView items={await listGallery()} />;
}
