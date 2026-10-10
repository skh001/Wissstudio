"use client";

import { useState } from "react";
import { Gift, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/shared/empty-state";
import { useServerAction } from "@/hooks/use-server-action";
import { formatCurrency, formatDate } from "@/lib/format";
import { generateCode } from "@/lib/utils";
import type { GiftCard } from "@/types/domain";
import { createGiftCard, toggleGiftCard } from "../actions";

export function GiftCardsPanel({ cards }: { cards: GiftCard[] }) {
  const { run, pending } = useServerAction();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", initial_amount: "50", purchaser_name: "", recipient_name: "", expires_at: "" });

  const openNew = () => {
    const in1y = new Date(); in1y.setFullYear(in1y.getFullYear() + 1);
    setForm({ code: generateCode(), initial_amount: "50", purchaser_name: "", recipient_name: "", expires_at: in1y.toISOString().slice(0, 10) });
    setOpen(true);
  };

  return (
    <>
      <div className="mb-4 flex justify-end"><Button onClick={openNew}><Plus />New gift card</Button></div>
      {cards.length === 0 ? (
        <EmptyState title="No gift cards yet" description="Sell a gift card and redeem it later on any appointment." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Card key={c.id} className="relative overflow-hidden p-5">
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-lacquer opacity-70" />
              <Gift className="relative h-5 w-5 text-primary" />
              <div className="relative mt-3 font-mono text-sm tracking-wider">{c.code}</div>
              <div className="relative mt-1 font-display text-3xl font-semibold tabular">{formatCurrency(c.balance)}</div>
              <div className="relative text-xs text-muted-foreground">of {formatCurrency(c.initial_amount)} · {c.recipient_name ? `for ${c.recipient_name}` : "no recipient"}</div>
              <div className="relative mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{c.expires_at ? `Expires ${formatDate(c.expires_at)}` : "No expiry"}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={c.is_active && Number(c.balance) > 0 ? "success" : "outline"}>{c.is_active ? (Number(c.balance) > 0 ? "Active" : "Used") : "Disabled"}</Badge>
                  <Switch checked={c.is_active} onCheckedChange={(v) => run(() => toggleGiftCard(c.id, v))} aria-label="Active" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New gift card</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2"><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="font-mono" /></div>
            <div className="space-y-1.5"><Label>Amount (€)</Label><Input type="number" min={1} value={form.initial_amount} onChange={(e) => setForm({ ...form, initial_amount: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Expires</Label><Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Bought by</Label><Input value={form.purchaser_name} onChange={(e) => setForm({ ...form, purchaser_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>For</Label><Input value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={pending} onClick={() => run(() => createGiftCard({ ...form, initial_amount: Number(form.initial_amount) }), {
              success: "Gift card created", onSuccess: () => setOpen(false),
            })}>Create gift card</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
