"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Crown, Heart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/shared/image-upload";
import { useServerAction } from "@/hooks/use-server-action";
import { NAIL_LENGTHS, NAIL_SHAPES, NAIL_STYLES } from "@/lib/constants";
import type { Client } from "@/types/domain";
import { upsertClient } from "../actions";
import { clientSchema, type ClientInput } from "../schemas";

const EMPTY: ClientInput = {
  first_name: "", last_name: "", phone: "", email: "", instagram: "", birthday: "", notes: "", allergies: "",
  favorite_color: "", favorite_shape: null, favorite_length: null, favorite_style: null, preferred_technician: "",
  avatar_url: null, is_favorite: false, is_vip: false, tags: [],
};

function toInput(c: Client): ClientInput {
  return {
    ...EMPTY,
    ...Object.fromEntries(Object.entries(c).filter(([k]) => k in EMPTY)),
    tags: c.tags ?? [],
  } as ClientInput;
}

export function ClientFormDialog({ open, onOpenChange, client }: { open: boolean; onOpenChange: (o: boolean) => void; client?: Client | null }) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const [tag, setTag] = useState("");
  const form = useForm<ClientInput>({ resolver: zodResolver(clientSchema), defaultValues: client ? toInput(client) : EMPTY });

  useEffect(() => { if (open) form.reset(client ? toInput(client) : EMPTY); }, [open, client, form]);

  const tags = form.watch("tags") ?? [];
  const addTag = () => {
    const t = tag.trim();
    if (t && !tags.includes(t)) form.setValue("tags", [...tags, t]);
    setTag("");
  };

  const onSubmit = form.handleSubmit((values) =>
    run(() => upsertClient(values, client?.id), {
      success: client ? "Client updated" : "Client added",
      onSuccess: (res) => {
        onOpenChange(false);
        if (!client) router.push(`/clients/${res.id}`);
      },
    }),
  );

  const choice = (name: "favorite_shape" | "favorite_length" | "favorite_style", label: string, list: string[]) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <Select value={field.value ?? undefined} onValueChange={field.onChange}>
          <FormControl><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger></FormControl>
          <SelectContent>{list.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
        </Select>
      </FormItem>
    )} />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{client ? "Edit client" : "New client"}</DialogTitle>
          <DialogDescription>Only the first name is required. You can fill in the rest later.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-6" noValidate>
            <div className="flex gap-4">
              <FormField control={form.control} name="avatar_url" render={({ field }) => (
                <ImageUpload value={field.value} onChange={field.onChange} folder="avatars" label="Photo" className="h-24 w-24 shrink-0 rounded-full" aspect="" />
              )} />
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <FormField control={form.control} name="first_name" render={({ field }) => (
                  <FormItem><FormLabel>First name</FormLabel><FormControl><Input autoFocus {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="last_name" render={({ field }) => (
                  <FormItem><FormLabel>Last name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" inputMode="tel" {...field} value={field.value ?? ""} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="instagram" render={({ field }) => (
                <FormItem><FormLabel>Instagram</FormLabel><FormControl><Input placeholder="@" {...field} value={field.value ?? ""} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="birthday" render={({ field }) => (
                <FormItem><FormLabel>Birthday</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl></FormItem>
              )} />
            </div>

            <section className="space-y-3">
              <h3 className="font-display text-lg font-semibold">Nail preferences</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField control={form.control} name="favorite_color" render={({ field }) => (
                  <FormItem><FormLabel>Favourite colour</FormLabel><FormControl><Input placeholder="Nude rosé, rouge…" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                )} />
                {choice("favorite_shape", "Shape", NAIL_SHAPES)}
                {choice("favorite_length", "Length", NAIL_LENGTHS)}
                {choice("favorite_style", "Style", NAIL_STYLES)}
                <FormField control={form.control} name="preferred_technician" render={({ field }) => (
                  <FormItem><FormLabel>Preferred technician</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
                )} />
              </div>
            </section>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField control={form.control} name="allergies" render={({ field }) => (
                <FormItem><FormLabel>Allergies</FormLabel><FormControl><Textarea className="min-h-[72px]" placeholder="HEMA, latex…" {...field} value={field.value ?? ""} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea className="min-h-[72px]" {...field} value={field.value ?? ""} /></FormControl></FormItem>
              )} />
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">Tags</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">
                    {t}
                    <button type="button" onClick={() => form.setValue("tags", tags.filter((x) => x !== t))} aria-label={`Remove ${t}`}><X className="h-3 w-3" /></button>
                  </span>
                ))}
                <Input
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
                  onBlur={addTag}
                  placeholder="Add a tag and press Enter"
                  className="h-8 w-48 rounded-full text-xs"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <FormField control={form.control} name="is_vip" render={({ field }) => (
                <label className="flex items-center gap-2.5 text-sm"><Switch checked={field.value} onCheckedChange={field.onChange} /><Crown className="h-4 w-4 text-[#C9A15B]" />VIP</label>
              )} />
              <FormField control={form.control} name="is_favorite" render={({ field }) => (
                <label className="flex items-center gap-2.5 text-sm"><Switch checked={field.value} onCheckedChange={field.onChange} /><Heart className="h-4 w-4 text-primary" />Favourite</label>
              )} />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" loading={pending}>{client ? "Save changes" : "Add client"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
