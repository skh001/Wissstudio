"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, addMinutes, format, roundToNearestMinutes } from "date-fns";
import { motion } from "framer-motion";
import { Gift, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { NumberStepper } from "@/components/shared/number-stepper";
import { ClientPicker } from "@/features/clients/components/client-picker";
import { useServerAction } from "@/hooks/use-server-action";
import { formatCurrency, formatDuration } from "@/lib/format";
import { computePricing } from "../lib/pricing";
import { toZonedParts } from "../lib/timezone";
import { fetchAppointment, fetchAppointmentFormOptions, upsertAppointment } from "../actions";
import { appointmentSchema, type AppointmentInput } from "../schemas";

export interface AppointmentDraft { start?: string; clientId?: string; duplicateOf?: string; editId?: string }

function defaults(draft: AppointmentDraft | null): AppointmentInput {
  const start = draft?.start ? new Date(draft.start) : roundToNearestMinutes(addMinutes(new Date(), 15), { nearestTo: 30 });
  const parts = toZonedParts(start);
  return {
    client_id: draft?.clientId ?? null,
    service_id: "" as unknown as string,
    date: parts.date,
    time: parts.time,
    duration_minutes: 60,
    status: "confirmed",
    technician: null,
    french: false,
    nail_art_count: 0,
    complex_art_count: 0,
    strass_count: 0,
    discount: 0,
    gift_card_id: null,
    notes: "",
  };
}

export function AppointmentFormDialog({
  open,
  onOpenChange,
  draft,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: AppointmentDraft | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { run, pending } = useServerAction();
  const sourceId = draft?.editId ?? draft?.duplicateOf;
  const isEdit = !!draft?.editId;

  const options = useQuery({
    queryKey: ["appointment-form-options"],
    queryFn: async () => {
      const res = await fetchAppointmentFormOptions();
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: open,
  });

  const source = useQuery({
    queryKey: ["appointment", sourceId],
    queryFn: async () => {
      const res = await fetchAppointment(sourceId!);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: open && !!sourceId,
  });

  const form = useForm<AppointmentInput>({ resolver: zodResolver(appointmentSchema), defaultValues: defaults(draft) });
  const [touchedDuration, setTouchedDuration] = useState(false);

  // reset whenever the dialog opens with a new draft / source
  useEffect(() => {
    if (!open) return;
    setTouchedDuration(false);
    const a = source.data;
    if (sourceId && !a) return;
    if (a) {
      const start = isEdit ? new Date(a.start_at) : addDays(new Date(a.start_at), 7 * Math.max(1, Math.ceil((Date.now() - new Date(a.start_at).getTime()) / (7 * 86400000))));
      const parts = toZonedParts(start);
      form.reset({
        client_id: a.client_id,
        service_id: a.service_id ?? ("" as unknown as string),
        date: parts.date,
        time: parts.time,
        duration_minutes: Math.round((new Date(a.end_at).getTime() - new Date(a.start_at).getTime()) / 60000),
        status: isEdit && a.status !== "completed" ? a.status : "confirmed",
        technician: a.technician,
        french: a.french,
        nail_art_count: a.nail_art_count,
        complex_art_count: a.complex_art_count,
        strass_count: a.strass_count,
        discount: Number(a.discount),
        gift_card_id: isEdit ? a.gift_card_id : null,
        notes: a.notes ?? "",
      });
      setTouchedDuration(true);
    } else {
      form.reset(defaults(draft));
    }
  }, [open, source.data, sourceId, isEdit, draft, form]);

  const values = useWatch({ control: form.control });
  const service = options.data?.services.find((s) => s.id === values.service_id);

  // follow the service duration until the user changes it by hand
  useEffect(() => {
    if (service && !touchedDuration) form.setValue("duration_minutes", service.duration_minutes);
  }, [service, touchedDuration, form]);

  const pricing = useMemo(() => {
    if (!options.data) return null;
    return computePricing(
      {
        servicePrice: isEdit && source.data?.service_id === values.service_id ? Number(source.data?.service_price ?? 0) : Number(service?.price ?? 0),
        french: !!values.french,
        nailArtCount: Number(values.nail_art_count ?? 0),
        complexArtCount: Number(values.complex_art_count ?? 0),
        strassCount: Number(values.strass_count ?? 0),
        discount: Number(values.discount ?? 0),
      },
      options.data.prices,
    );
  }, [options.data, service, values, isEdit, source.data]);

  const endTime = values.date && values.time
    ? format(addMinutes(new Date(`${values.date}T${values.time}:00`), Number(values.duration_minutes) || 0), "HH:mm")
    : null;

  const onSubmit = form.handleSubmit((data) =>
    run(() => upsertAppointment(data, draft?.editId), {
      success: isEdit ? "Appointment updated" : "Appointment booked",
      onSuccess: (res) => {
        onOpenChange(false);
        void queryClient.invalidateQueries({ queryKey: ["appointment", res.id] });
        if (!isEdit) router.push(`/appointments/${res.id}`);
      },
    }),
  );

  const loading = options.isLoading || (!!sourceId && source.isLoading);
  const prices = options.data?.prices;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit appointment" : draft?.duplicateOf ? "Duplicate appointment" : "New appointment"}</DialogTitle>
          <DialogDescription>{isEdit ? "Changes sync to Google Calendar automatically." : "The total updates as you add nail art."}</DialogDescription>
        </DialogHeader>

        {loading || !options.data ? (
          <div className="space-y-3"><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-40" /></div>
        ) : (
          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-6" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="client_id" render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Client</FormLabel>
                    <ClientPicker
                      clients={options.data.clients.filter((c): c is NonNullable<typeof c> => !!c)}
                      value={field.value}
                      onChange={field.onChange}
                      onCreated={() => void queryClient.invalidateQueries({ queryKey: ["appointment-form-options"] })}
                    />
                  </FormItem>
                )} />

                <FormField control={form.control} name="service_id" render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Service</FormLabel>
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger className="h-12"><SelectValue placeholder="Choose a service" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {options.data.services.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            <span className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                              {s.name}
                              <span className="text-muted-foreground">· {formatCurrency(s.price)} · {formatDuration(s.duration_minutes)}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" className="h-12" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="time" render={({ field }) => (
                    <FormItem><FormLabel>Time</FormLabel><FormControl><Input type="time" step={300} className="h-12" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="duration_minutes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minutes</FormLabel>
                      <FormControl>
                        <Input type="number" min={5} step={5} className="h-12" {...field} onChange={(e) => { setTouchedDuration(true); field.onChange(e); }} />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
                {endTime && <p className="-mt-2 text-xs text-muted-foreground sm:col-span-2">Ends at {endTime}</p>}

                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger className="h-12"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        {isEdit && <SelectItem value="cancelled">Cancelled</SelectItem>}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                {prices && prices.technicians.length > 1 ? (
                  <FormField control={form.control} name="technician" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Technician</FormLabel>
                      <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger className="h-12"><SelectValue placeholder="Anyone" /></SelectTrigger></FormControl>
                        <SelectContent>{prices.technicians.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                ) : (
                  <FormField control={form.control} name="discount" render={({ field }) => (
                    <FormItem><FormLabel>Discount (€)</FormLabel><FormControl><Input type="number" min={0} step="0.5" className="h-12" {...field} /></FormControl></FormItem>
                  )} />
                )}
              </div>

              {/* Nail art */}
              <section className="rounded-2xl bg-blush-50 p-4 dark:bg-secondary/50 sm:p-5">
                <div className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
                  <Sparkles className="h-4 w-4 text-primary" /> Nail art
                </div>
                <div className="divide-y divide-blush-200/70 dark:divide-border">
                  <FormField control={form.control} name="french" render={({ field }) => (
                    <div className="flex items-center justify-between py-2.5">
                      <div><div className="text-sm font-medium">French</div><div className="text-xs text-muted-foreground">{formatCurrency(prices?.price_french)}</div></div>
                      <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="French" />
                    </div>
                  )} />
                  {([
                    ["nail_art_count", "Nail art", prices?.price_nail_art, "per nail", 20],
                    ["complex_art_count", "Complex nail art", prices?.price_complex_art, "per nail", 20],
                    ["strass_count", "Strass", prices?.price_strass, "each", 500],
                  ] as const).map(([name, label, price, unit, max]) => (
                    <FormField key={name} control={form.control} name={name} render={({ field }) => (
                      <div className="flex items-center justify-between py-2.5">
                        <div><div className="text-sm font-medium">{label}</div><div className="text-xs text-muted-foreground">{formatCurrency(price)} {unit}</div></div>
                        <NumberStepper value={Number(field.value) || 0} onChange={field.onChange} max={max} />
                      </div>
                    )} />
                  ))}
                </div>
              </section>

              {prices && prices.technicians.length > 1 && (
                <FormField control={form.control} name="discount" render={({ field }) => (
                  <FormItem><FormLabel>Discount (€)</FormLabel><FormControl><Input type="number" min={0} step="0.5" className="h-12" {...field} /></FormControl></FormItem>
                )} />
              )}

              {options.data.giftCards.length > 0 && (
                <FormField control={form.control} name="gift_card_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5"><Gift className="h-3.5 w-3.5" /> Gift card</FormLabel>
                    <Select value={field.value ?? "none"} onValueChange={(v) => field.onChange(v === "none" ? null : v)}>
                      <FormControl><SelectTrigger className="h-12"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">No gift card</SelectItem>
                        {options.data.giftCards.map((g) => (
                          <SelectItem key={g.id} value={g.id}>{g.code} · {formatCurrency(g.balance)} left</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              )}

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Inspiration, colour reference, reminders…" {...field} value={field.value ?? ""} /></FormControl></FormItem>
              )} />

              {/* Total */}
              <div className="sticky bottom-0 -mx-5 -mb-5 border-t bg-card/95 px-5 pb-5 pt-4 backdrop-blur sm:-mx-7 sm:-mb-7 sm:px-7 sm:pb-7">
                {pricing && (
                  <div className="mb-3 space-y-1 text-sm">
                    <div className="flex justify-between text-muted-foreground"><span>{service?.name ?? "Service"}</span><span className="tabular">{formatCurrency(pricing.subtotal - pricing.extras)}</span></div>
                    {pricing.lines.map((l) => (
                      <div key={l.label} className="flex justify-between text-muted-foreground">
                        <span>{l.label}{l.quantity > 1 ? ` × ${l.quantity}` : ""}</span><span className="tabular">{formatCurrency(l.total)}</span>
                      </div>
                    ))}
                    {pricing.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span className="tabular">−{formatCurrency(pricing.discount)}</span></div>}
                  </div>
                )}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Total</div>
                    <motion.div key={pricing?.total} initial={{ scale: 0.96, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }} className="font-display text-3xl font-semibold tabular">
                      {formatCurrency(pricing?.total ?? 0)}
                    </motion.div>
                  </div>
                  <Button type="submit" size="lg" loading={pending}>{isEdit ? "Save changes" : "Book appointment"}</Button>
                </div>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
