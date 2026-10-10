"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/shared/image-upload";
import { useServerAction } from "@/hooks/use-server-action";
import { GALLERY_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { GalleryItem } from "@/types/domain";
import { upsertGalleryItem } from "../actions";

export function GalleryFormDialog({
  open,
  onOpenChange,
  item,
  clientId,
  appointmentId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  item?: GalleryItem | null;
  clientId?: string | null;
  appointmentId?: string | null;
}) {
  const { run, pending } = useServerAction();
  const [before, setBefore] = useState<string | null>(null);
  const [after, setAfter] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [cats, setCats] = useState<string[]>([]);
  const [featured, setFeatured] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBefore(item?.before_url ?? null);
    setAfter(item?.after_url ?? null);
    setTitle(item?.title ?? "");
    setCats(item?.categories ?? []);
    setFeatured(item?.is_featured ?? false);
  }, [open, item]);

  const toggle = (c: string) => setCats((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{item ? "Edit photo" : "Add photos"}</DialogTitle>
          <DialogDescription>The before photo is optional. Photos are resized automatically.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Before</Label><ImageUpload value={before} onChange={setBefore} folder="gallery" label="Before photo" aspect="aspect-[4/5]" /></div>
          <div className="space-y-1.5"><Label>After</Label><ImageUpload value={after} onChange={setAfter} folder="gallery" label="After photo" aspect="aspect-[4/5]" /></div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="g-title">Title</Label>
          <Input id="g-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Babyboomer chrome, mariage…" />
        </div>
        <div className="space-y-2">
          <Label>Categories</Label>
          <div className="flex flex-wrap gap-1.5">
            {GALLERY_CATEGORIES.map((c) => (
              <button key={c} type="button" onClick={() => toggle(c)}
                className={cn("rounded-full border px-3 py-1 text-xs transition", cats.includes(c) ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/40")}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2.5 text-sm"><Switch checked={featured} onCheckedChange={setFeatured} />Show in favourites</label>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            loading={pending}
            disabled={!after}
            onClick={() => run(() => upsertGalleryItem({
              title: title || null, before_url: before, after_url: after!, categories: cats, is_featured: featured,
              client_id: item?.client_id ?? clientId ?? null, appointment_id: item?.appointment_id ?? appointmentId ?? null,
            }, item?.id), { success: item ? "Photo updated" : "Photo added", onSuccess: () => onOpenChange(false) })}
          >
            {item ? "Save" : "Add to gallery"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
