"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MEDIA_BUCKET } from "@/lib/constants";

const MAX_DIMENSION = 1800;

/** Downscales large phone photos before upload (keeps the gallery fast and storage small). */
async function compress(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_200_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b ?? file), "image/webp", 0.86));
  } catch {
    return file;
  }
}

export function useMediaUpload(folder: string) {
  const [uploading, setUploading] = useState(false);

  async function upload(file: File): Promise<string> {
    setUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in again to upload photos.");
      const blob = await compress(file);
      const ext = blob.type === "image/webp" ? "webp"
        : blob.type === "application/pdf" ? "pdf"
        : (/\.([a-z0-9]{2,5})$/i.exec(file.name)?.[1]?.toLowerCase() ?? "jpg");
      const path = `${user.id}/${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, blob, {
        cacheControl: "31536000",
        contentType: blob.type || file.type,
      });
      if (error) throw new Error(error.message);
      return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
    } finally {
      setUploading(false);
    }
  }

  return { upload, uploading };
}
