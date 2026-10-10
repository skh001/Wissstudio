"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useServerAction } from "@/hooks/use-server-action";
import type { SalonSettings } from "@/types/domain";
import { saveBusinessSettings } from "../actions";
import { businessSchema, type BusinessInput } from "../schemas";

export function BusinessForm({ settings }: { settings: SalonSettings }) {
  const { run, pending } = useServerAction();
  const [tech, setTech] = useState("");
  const form = useForm<BusinessInput>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      currency: settings.currency as BusinessInput["currency"], language: settings.language, theme: settings.theme,
      tax_rate: Number(settings.tax_rate), tax_label: settings.tax_label, vat_applicable: settings.vat_applicable,
      monthly_objective: Number(settings.monthly_objective), invoice_prefix: settings.invoice_prefix,
      price_french: Number(settings.price_french), price_nail_art: Number(settings.price_nail_art),
      price_complex_art: Number(settings.price_complex_art), price_strass: Number(settings.price_strass),
      loyalty_points_per_euro: Number(settings.loyalty_points_per_euro), loyalty_reward_threshold: settings.loyalty_reward_threshold,
      loyalty_reward_value: Number(settings.loyalty_reward_value), inactive_after_days: settings.inactive_after_days,
      technicians: settings.technicians,
    },
  });

  const num = (name: keyof BusinessInput, label: string, opts: { step?: string; description?: string } = {}) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl><Input type="number" step={opts.step ?? "0.01"} min={0} {...field} value={field.value as number} /></FormControl>
        {opts.description && <FormDescription>{opts.description}</FormDescription>}
        <FormMessage />
      </FormItem>
    )} />
  );
  const technicians = form.watch("technicians");

  return (
    <Form {...form}>
      <form noValidate className="space-y-5" onSubmit={form.handleSubmit((v) => run(() => saveBusinessSettings(v), { success: "Settings saved" }))}>
        <Card>
          <CardHeader><CardTitle>Nail art prices</CardTitle><CardDescription>Added to the service price during booking.</CardDescription></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {num("price_french", "French (€)")}
            {num("price_nail_art", "Nail art per nail (€)")}
            {num("price_complex_art", "Complex per nail (€)")}
            {num("price_strass", "Strass each (€)")}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Taxes & invoices</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FormField control={form.control} name="tax_label" render={({ field }) => (
              <FormItem><FormLabel>Tax name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
            )} />
            {num("tax_rate", "Rate (% of revenue)", { description: "Micro-entreprise: check your current URSSAF rate." })}
            {num("monthly_objective", "Monthly objective (€)", { step: "50" })}
            <FormField control={form.control} name="invoice_prefix" render={({ field }) => (
              <FormItem><FormLabel>Invoice prefix</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="vat_applicable" render={({ field }) => (
              <label className="flex items-center gap-2.5 text-sm sm:col-span-2 lg:col-span-4">
                <Switch checked={field.value} onCheckedChange={field.onChange} />
                I charge VAT (otherwise invoices show “TVA non applicable, art. 293 B du CGI”)
              </label>
            )} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Loyalty & clients</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {num("loyalty_points_per_euro", "Points per € spent", { step: "0.5" })}
            {num("loyalty_reward_threshold", "Points for a reward", { step: "1" })}
            {num("loyalty_reward_value", "Reward value (€)")}
            {num("inactive_after_days", "Inactive after (days)", { step: "1" })}
            <div className="space-y-2 sm:col-span-2 lg:col-span-4">
              <span className="text-sm font-medium">Technicians</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {technicians.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm">
                    {t}
                    {technicians.length > 1 && (
                      <button type="button" onClick={() => form.setValue("technicians", technicians.filter((x) => x !== t))} aria-label={`Remove ${t}`}><X className="h-3 w-3" /></button>
                    )}
                  </span>
                ))}
                <Input value={tech} onChange={(e) => setTech(e.target.value)} placeholder="Add a technician" className="h-8 w-44 rounded-full text-sm"
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    if (tech.trim() && !technicians.includes(tech.trim())) form.setValue("technicians", [...technicians, tech.trim()]);
                    setTech("");
                  }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Display</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {([
              ["currency", "Currency", [["EUR", "Euro (€)"], ["CHF", "Swiss franc"], ["GBP", "Pound (£)"], ["USD", "Dollar ($)"], ["CAD", "Canadian dollar"], ["MAD", "Dirham"]]],
              ["language", "Date & number format", [["fr", "Français"], ["en", "English"]]],
              ["theme", "Theme", [["system", "Automatic"], ["light", "Light"], ["dark", "Dark"]]],
            ] as const).map(([name, label, options]) => (
              <FormField key={name} control={form.control} name={name} render={({ field }) => (
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <Select value={field.value as string} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
            ))}
          </CardContent>
        </Card>
        <div className="flex justify-end"><Button type="submit" size="lg" loading={pending}>Save settings</Button></div>
      </form>
    </Form>
  );
}
