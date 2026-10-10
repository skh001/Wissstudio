"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, Clock, FlaskConical, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { useSalon } from "@/components/layout/salon-context";
import { useServerAction } from "@/hooks/use-server-action";
import { formatCurrency, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AddonKind, ConsumptionRule, Product, Service } from "@/types/domain";
import { addConsumptionRule, deleteConsumptionRule, deleteService, reorderServices, upsertService } from "../actions";
import { serviceSchema, type ServiceInput } from "../schemas";

const SWATCHES = ["#F4A6C6", "#F08BB4", "#E879A6", "#D9A3AB", "#C88792", "#B76E79", "#A85F6C", "#E3B5A4", "#EBD3BC", "#CFB1B7", "#C9B6E4", "#8FD3A8"];
const ADDONS: { key: AddonKind; label: string; per: string }[] = [
  { key: "french", label: "French", per: "per appointment" },
  { key: "nail_art", label: "Nail art", per: "per nail" },
  { key: "complex_art", label: "Complex nail art", per: "per nail" },
  { key: "strass", label: "Strass", per: "per strass" },
];

type ProductOption = Pick<Product, "id" | "name" | "unit">;

function ServiceDialog({ open, onOpenChange, service, categories }: { open: boolean; onOpenChange: (o: boolean) => void; service: Service | null; categories: string[] }) {
  const { run, pending } = useServerAction();
  const form = useForm<ServiceInput>({ resolver: zodResolver(serviceSchema) });
  useEffect(() => {
    if (open) form.reset(service
      ? { ...service, price: Number(service.price), description: service.description ?? "" }
      : { name: "", description: "", category: categories[0] ?? "Gel", price: 30, duration_minutes: 60, color: SWATCHES[0]!, is_active: true });
  }, [open, service, categories, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{service ? "Edit service" : "New service"}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form noValidate className="space-y-4" onSubmit={form.handleSubmit((v) => run(() => upsertService(v, service?.id), {
            success: service ? "Service updated" : "Service added", onSuccess: () => onOpenChange(false),
          }))}>
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-3 gap-3">
              <FormField control={form.control} name="price" render={({ field }) => (
                <FormItem><FormLabel>Price (€)</FormLabel><FormControl><Input type="number" step="0.5" min={0} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="duration_minutes" render={({ field }) => (
                <FormItem><FormLabel>Minutes</FormLabel><FormControl><Input type="number" step={5} min={5} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem><FormLabel>Category</FormLabel><FormControl><Input list="service-cats" {...field} /></FormControl></FormItem>
              )} />
              <datalist id="service-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea className="min-h-[64px]" {...field} value={field.value ?? ""} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="color" render={({ field }) => (
              <FormItem>
                <FormLabel>Calendar colour</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {SWATCHES.map((c) => (
                    <button key={c} type="button" onClick={() => field.onChange(c)} aria-label={c}
                      className={cn("h-8 w-8 rounded-full ring-offset-2 ring-offset-card transition", field.value === c && "ring-2 ring-primary")} style={{ background: c }} />
                  ))}
                </div>
              </FormItem>
            )} />
            <FormField control={form.control} name="is_active" render={({ field }) => (
              <label className="flex items-center gap-2.5 text-sm"><Switch checked={field.value} onCheckedChange={field.onChange} />Bookable</label>
            )} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" loading={pending}>{service ? "Save changes" : "Add service"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function RuleEditor({ rules, products, target }: { rules: ConsumptionRule[]; products: ProductOption[]; target: { service_id: string | null; addon: AddonKind | null } }) {
  const { run, pending } = useServerAction();
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  return (
    <div className="space-y-2">
      {rules.map((r) => (
        <div key={r.id} className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-1.5 text-sm">
          <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="flex-1 truncate">{r.product?.name ?? "Deleted product"}</span>
          <span className="text-muted-foreground tabular">{Number(r.quantity)} {r.product?.unit}</span>
          <button onClick={() => run(() => deleteConsumptionRule(r.id))} className="rounded-full p-1 text-muted-foreground hover:bg-accent" aria-label="Remove"><X className="h-3.5 w-3.5" /></button>
        </div>
      ))}
      <div className="flex gap-2">
        <Select value={productId} onValueChange={setProductId}>
          <SelectTrigger className="h-9 flex-1 text-xs"><SelectValue placeholder="Add a product…" /></SelectTrigger>
          <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.unit})</SelectItem>)}</SelectContent>
        </Select>
        <Input type="number" step="any" min={0} value={qty} onChange={(e) => setQty(e.target.value)} className="h-9 w-20 text-xs" aria-label="Quantity" />
        <Button size="sm" variant="secondary" className="h-9" loading={pending} disabled={!productId}
          onClick={() => run(() => addConsumptionRule({ ...target, product_id: productId, quantity: Number(qty) }), { onSuccess: () => { setProductId(""); setQty("1"); } })}>
          <Plus />
        </Button>
      </div>
    </div>
  );
}

export function ServicesView({ services, rules, products }: { services: Service[]; rules: ConsumptionRule[]; products: ProductOption[] }) {
  const salon = useSalon();
  const { run } = useServerAction();
  const [editing, setEditing] = useState<Service | null | undefined>(undefined);
  const [openRules, setOpenRules] = useState<string | null>(null);
  const categories = [...new Set(services.map((s) => s.category))];

  const move = (i: number, dir: -1 | 1) => {
    const ids = services.map((s) => s.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    void run(() => reorderServices(ids));
  };

  const addonPrice: Record<AddonKind, number> = {
    french: salon.price_french, nail_art: salon.price_nail_art, complex_art: salon.price_complex_art, strass: salon.price_strass,
  };

  return (
    <>
      <PageHeader title="Services" description="Your menu. Prices here are used for every new booking." actions={<Button onClick={() => setEditing(null)}><Plus />New service</Button>} />

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          {services.map((s, i) => {
            const sRules = rules.filter((r) => r.service_id === s.id);
            return (
              <Card key={s.id} className={cn("overflow-hidden", !s.is_active && "opacity-60")}>
                <div className="flex items-center gap-4 p-4">
                  <span className="h-12 w-1.5 shrink-0 rounded-full" style={{ background: s.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{s.name}</span>
                      <Badge variant="outline">{s.category}</Badge>
                      {!s.is_active && <Badge variant="outline">Hidden</Badge>}
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{formatDuration(s.duration_minutes)}</span>
                      <button onClick={() => setOpenRules(openRules === s.id ? null : s.id)} className="inline-flex items-center gap-1 hover:text-primary">
                        <FlaskConical className="h-3 w-3" />{sRules.length} product{sRules.length !== 1 ? "s" : ""} deducted
                      </button>
                    </div>
                  </div>
                  <div className="font-display text-2xl font-semibold tabular">{formatCurrency(s.price)}</div>
                  <div className="hidden flex-col sm:flex">
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button onClick={() => move(i, 1)} disabled={i === services.length - 1} className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={() => setEditing(s)} aria-label="Edit"><Pencil /></Button>
                  <ConfirmDialog title={`Delete ${s.name}?`} description="Past appointments keep their price. Hide it instead to keep it in statistics."
                    onConfirm={() => run(() => deleteService(s.id), { success: "Service deleted" })}
                    trigger={<Button variant="ghost" size="icon-sm" aria-label="Delete"><Trash2 /></Button>} />
                </div>
                {openRules === s.id && (
                  <div className="border-t bg-blush-50/50 p-4 dark:bg-secondary/30">
                    <p className="mb-2 text-xs text-muted-foreground">Deducted from stock each time this service is completed.</p>
                    <RuleEditor rules={sRules} products={products} target={{ service_id: s.id, addon: null }} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        <Card className="h-fit xl:sticky xl:top-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Nail art</CardTitle>
            <CardDescription>Added on top of the service. <Link href="/settings?tab=business" className="text-primary hover:underline">Change prices</Link></CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {ADDONS.map((a) => (
              <div key={a.key}>
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="font-medium">{a.label}</span>
                  <span className="text-sm tabular">{formatCurrency(addonPrice[a.key])} <span className="text-xs text-muted-foreground">{a.per}</span></span>
                </div>
                <RuleEditor rules={rules.filter((r) => r.addon === a.key)} products={products} target={{ service_id: null, addon: a.key }} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <ServiceDialog open={editing !== undefined} onOpenChange={(o) => !o && setEditing(undefined)} service={editing ?? null} categories={categories} />
    </>
  );
}
