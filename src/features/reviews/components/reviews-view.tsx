"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Download, Instagram, MessageSquareHeart, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChipFilter } from "@/components/shared/chip-filter";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StarRating } from "@/components/shared/star-rating";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate, formatNumber } from "@/lib/format";
import { initials } from "@/lib/utils";
import type { Review, ReviewSource } from "@/types/domain";
import { deleteReview, importGoogleReviews, upsertReview } from "../actions";

const SOURCE_LABEL: Record<ReviewSource, string> = { google: "Google", manual: "In person", instagram: "Instagram" };

function ReviewDialog({ open, onOpenChange, review }: { open: boolean; onOpenChange: (o: boolean) => void; review: Review | null }) {
  const { run, pending } = useServerAction();
  const [form, setForm] = useState({ author_name: "", rating: 5, comment: "", source: "manual" as ReviewSource, review_date: format(new Date(), "yyyy-MM-dd") });
  const [key, setKey] = useState<string | null>(null);
  const k = review?.id ?? "new";
  if (open && key !== k) {
    setKey(k);
    setForm(review
      ? { author_name: review.author_name, rating: review.rating, comment: review.comment ?? "", source: review.source, review_date: review.review_date }
      : { author_name: "", rating: 5, comment: "", source: "manual", review_date: format(new Date(), "yyyy-MM-dd") });
  }
  if (!open && key) setKey(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{review ? "Edit review" : "Add a review"}</DialogTitle></DialogHeader>
        <div className="flex justify-center py-2"><StarRating value={form.rating} onChange={(rating) => setForm({ ...form, rating })} size="lg" /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Client name</Label><Input value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={form.review_date} onChange={(e) => setForm({ ...form, review_date: e.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Where</Label>
            <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v as ReviewSource })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(SOURCE_LABEL) as ReviewSource[]).map((s) => <SelectItem key={s} value={s}>{SOURCE_LABEL[s]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Comment</Label><Textarea value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button loading={pending} onClick={() => run(() => upsertReview({ ...form, comment: form.comment || null }, review?.id), {
            success: review ? "Review updated" : "Review added", onSuccess: () => onOpenChange(false),
          })}>{review ? "Save" : "Add review"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ReviewsView({ reviews, googleReady }: { reviews: Review[]; googleReady: boolean }) {
  const { run, pending } = useServerAction();
  const [filter, setFilter] = useState<"all" | ReviewSource>("all");
  const [editing, setEditing] = useState<Review | null | undefined>(undefined);

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, count: reviews.filter((r) => r.rating === n).length }));
  const list = useMemo(() => reviews.filter((r) => filter === "all" || r.source === filter), [reviews, filter]);

  return (
    <>
      <PageHeader
        title="Reviews"
        description="What your clients say about you"
        actions={
          <>
            {googleReady && (
              <Button variant="outline" loading={pending} onClick={() => run(() => importGoogleReviews(), {
                onSuccess: (r) => toast.success(r.imported ? `${r.imported} Google reviews checked` : "No new Google review"),
              })}>{!pending && <Download />}Import from Google</Button>
            )}
            <Button onClick={() => setEditing(null)}><Plus />Add review</Button>
          </>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-[280px_1fr]">
        <Card className="flex flex-col items-center justify-center p-6 text-center">
          <div className="font-display text-7xl font-semibold leading-none tabular">{reviews.length ? formatNumber(avg, 1) : "—"}</div>
          <div className="mt-2"><StarRating value={Math.round(avg)} /></div>
          <div className="mt-1 text-sm text-muted-foreground">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</div>
        </Card>
        <Card className="space-y-2.5 p-6">
          {dist.map((d) => (
            <div key={d.n} className="flex items-center gap-3 text-sm">
              <span className="flex w-8 items-center gap-0.5 tabular">{d.n}<Star className="h-3 w-3 fill-champagne text-[#D4A373]" /></span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-gradient-to-r from-champagne to-rosegold-400" style={{ width: `${reviews.length ? (d.count / reviews.length) * 100 : 0}%` }} />
              </div>
              <span className="w-8 text-right text-muted-foreground tabular">{d.count}</span>
            </div>
          ))}
        </Card>
      </div>

      <ChipFilter
        className="mb-5"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "All", count: reviews.length },
          ...(Object.keys(SOURCE_LABEL) as ReviewSource[]).map((s) => ({ value: s, label: SOURCE_LABEL[s], count: reviews.filter((r) => r.source === s).length })),
        ]}
      />

      {list.length === 0 ? (
        <EmptyState title="No reviews yet" description="Add the kind words you receive in person or on Instagram, and import your Google reviews." />
      ) : (
        <div className="columns-1 gap-4 md:columns-2 xl:columns-3 [&>*]:mb-4">
          {list.map((r) => (
            <Card key={r.id} className="group break-inside-avoid p-5">
              <div className="flex items-start gap-3">
                {r.author_photo_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={r.author_photo_url} alt="" className="h-10 w-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                  : <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-blush-200 to-champagne font-display font-semibold text-rosegold-700">{initials(r.author_name)}</span>}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{r.author_name}</div>
                  <div className="flex items-center gap-2"><StarRating value={r.rating} /><span className="text-xs text-muted-foreground">{formatDate(r.review_date)}</span></div>
                </div>
                <Badge variant="outline">{r.source === "instagram" ? <Instagram /> : r.source === "manual" ? <MessageSquareHeart /> : null}{SOURCE_LABEL[r.source]}</Badge>
              </div>
              {r.comment && <p className="mt-3 text-[15px] leading-relaxed">“{r.comment}”</p>}
              <div className="mt-3 flex justify-end gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                <Button variant="ghost" size="icon-sm" onClick={() => setEditing(r)} aria-label="Edit"><Pencil /></Button>
                <ConfirmDialog title="Delete this review?" onConfirm={() => run(() => deleteReview(r.id), { success: "Review deleted" })}
                  trigger={<Button variant="ghost" size="icon-sm" aria-label="Delete"><Trash2 /></Button>} />
              </div>
            </Card>
          ))}
        </div>
      )}
      <ReviewDialog open={editing !== undefined} onOpenChange={(o) => !o && setEditing(undefined)} review={editing ?? null} />
    </>
  );
}
