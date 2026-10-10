"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/shared/image-upload";
import { useServerAction } from "@/hooks/use-server-action";
import type { OpeningHours, SalonSettings } from "@/types/domain";
import { saveSalonSettings } from "../actions";
import { salonSchema, type SalonInput } from "../schemas";

const DAYS: [keyof OpeningHours, string][] = [
  ["mon", "Monday"], ["tue", "Tuesday"], ["wed", "Wednesday"], ["thu", "Thursday"], ["fri", "Friday"], ["sat", "Saturday"], ["sun", "Sunday"],
];

export function SalonForm({ settings }: { settings: SalonSettings }) {
  const { run, pending } = useServerAction();
  const form = useForm<SalonInput>({
    resolver: zodResolver(salonSchema),
    defaultValues: {
      name: settings.name, owner_name: settings.owner_name, logo_url: settings.logo_url, address: settings.address ?? "",
      phone: settings.phone ?? "", email: settings.email ?? "", siret: settings.siret ?? "", google_place_id: settings.google_place_id ?? "",
      opening_hours: settings.opening_hours,
      socials: { instagram: "", tiktok: "", facebook: "", website: "", ...settings.socials },
    },
  });

  const text = (name: "name" | "owner_name" | "address" | "phone" | "email" | "siret", label: string, type = "text") => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem><FormLabel>{label}</FormLabel><FormControl><Input type={type} {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
    )} />
  );
  const social = (name: "socials.instagram" | "socials.tiktok" | "socials.facebook" | "socials.website", label: string) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem><FormLabel>{label}</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
    )} />
  );

  return (
    <Form {...form}>
      <form noValidate className="space-y-5" onSubmit={form.handleSubmit((v) => run(() => saveSalonSettings(v), { success: "Salon saved" }))}>
        <Card>
          <CardHeader><CardTitle>Salon</CardTitle><CardDescription>Shown on invoices, receipts and reports.</CardDescription></CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-[120px_1fr]">
            <FormField control={form.control} name="logo_url" render={({ field }) => (
              <FormItem><FormLabel>Logo</FormLabel><ImageUpload value={field.value} onChange={field.onChange} folder="salon" label="Logo" /></FormItem>
            )} />
            <div className="grid gap-3 sm:grid-cols-2">
              {text("name", "Salon name")}
              {text("owner_name", "Your first name")}
              <div className="sm:col-span-2">{text("address", "Address")}</div>
              {text("phone", "Phone", "tel")}
              {text("email", "Email", "email")}
              {text("siret", "SIRET")}
              <FormField control={form.control} name="google_place_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Google Place ID</FormLabel>
                  <FormControl><Input placeholder="ChIJ…" {...field} value={field.value ?? ""} /></FormControl>
                  <FormDescription>Used to import Google reviews.</FormDescription>
                </FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Opening hours</CardTitle><CardDescription>Highlighted in the calendar.</CardDescription></CardHeader>
          <CardContent className="divide-y divide-border/60">
            {DAYS.map(([key, label]) => {
              const closed = form.watch(`opening_hours.${key}.closed`);
              return (
                <div key={key} className="flex flex-wrap items-center gap-3 py-2.5">
                  <span className="w-28 text-sm font-medium">{label}</span>
                  <FormField control={form.control} name={`opening_hours.${key}.closed`} render={({ field }) => (
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Switch checked={!field.value} onCheckedChange={(open) => field.onChange(!open)} />{field.value ? "Closed" : "Open"}
                    </label>
                  )} />
                  {!closed && (
                    <div className="ml-auto flex items-center gap-2">
                      <FormField control={form.control} name={`opening_hours.${key}.open`} render={({ field }) => <Input type="time" className="h-9 w-28" {...field} />} />
                      <span className="text-muted-foreground">–</span>
                      <FormField control={form.control} name={`opening_hours.${key}.close`} render={({ field }) => <Input type="time" className="h-9 w-28" {...field} />} />
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Social media</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {social("socials.instagram", "Instagram")}
            {social("socials.tiktok", "TikTok")}
            {social("socials.facebook", "Facebook")}
            {social("socials.website", "Website")}
          </CardContent>
        </Card>
        <div className="flex justify-end"><Button type="submit" size="lg" loading={pending}>Save salon</Button></div>
      </form>
    </Form>
  );
}
