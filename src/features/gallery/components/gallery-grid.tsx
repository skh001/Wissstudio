"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Pencil, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate } from "@/lib/format";
import { cn, fullName } from "@/lib/utils";
import type { GalleryItem } from "@/types/domain";
import { deleteGalleryItem } from "../actions";
import { GalleryFormDialog } from "./gallery-form-dialog";

/** Before/after viewer: drag the handle to compare. */
function BeforeAfter({ before, after }: { before: string; after: string }) {
  const [pos, setPos] = useState(50);
  return (
    <div className="relative aspect-[4/5] w-full select-none overflow-hidden rounded-2xl bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt="After" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt="Before" className="h-full w-full object-cover" />
      </div>
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${pos}%` }} />
      <span className="absolute left-3 top-3 rounded-full bg-black/40 px-2 py-0.5 text-xs text-white">Before</span>
      <span className="absolute right-3 top-3 rounded-full bg-black/40 px-2 py-0.5 text-xs text-white">After</span>
      <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0" aria-label="Compare before and after" />
    </div>
  );
}

export function GalleryGrid({ items, className }: { items: GalleryItem[]; className?: string }) {
  const [viewing, setViewing] = useState<GalleryItem | null>(null);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const { run } = useServerAction();

  return (
    <>
      <div className={cn("columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3", className)}>
        {items.map((item, i) => (
          <motion.button
            key={item.id}
            type="button"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(i, 12) * 0.03 }}
            onClick={() => setViewing(item)}
            className="group relative block w-full break-inside-avoid overflow-hidden rounded-2xl bg-muted text-left"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.after_url} alt={item.title ?? "Nail set"} loading="lazy" className="w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-3 text-white opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
              <div className="truncate text-sm font-medium">{item.title ?? item.categories.join(", ") ?? ""}</div>
              {item.client && <div className="truncate text-xs text-white/80">{fullName(item.client)}</div>}
            </div>
            {item.before_url && <span className="absolute left-2 top-2 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-medium text-plum">Before / after</span>}
            {item.is_featured && <Star className="absolute right-2 top-2 h-4 w-4 fill-champagne text-[#C9A15B]" />}
          </motion.button>
        ))}
      </div>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="sm:max-w-lg">
          {viewing && (
            <>
              <DialogTitle>{viewing.title ?? "Nail set"}</DialogTitle>
              {viewing.before_url ? (
                <BeforeAfter before={viewing.before_url} after={viewing.after_url} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={viewing.after_url} alt={viewing.title ?? ""} className="w-full rounded-2xl object-cover" />
              )}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {viewing.categories.map((c) => <span key={c} className="rounded-full bg-secondary px-2.5 py-0.5 text-secondary-foreground">{c}</span>)}
                <span className="ml-auto text-muted-foreground">{formatDate(viewing.created_at)}</span>
              </div>
              {viewing.client && (
                <Link href={`/clients/${viewing.client.id}`} className="text-sm text-primary hover:underline">{fullName(viewing.client)}</Link>
              )}
              <div className="flex justify-end gap-2">
                <ConfirmDialog
                  title="Delete this photo?"
                  description="The photo files are removed from storage too."
                  onConfirm={() => run(() => deleteGalleryItem(viewing.id), { success: "Photo deleted", onSuccess: () => setViewing(null) })}
                  trigger={<Button variant="ghost" size="sm" className="text-destructive"><Trash2 />Delete</Button>}
                />
                <Button variant="outline" size="sm" onClick={() => { setEditing(viewing); setViewing(null); }}><Pencil />Edit</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <GalleryFormDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} item={editing} />
    </>
  );
}
