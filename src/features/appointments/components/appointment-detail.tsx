"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle, ArrowLeft, Ban, CalendarCheck2, CheckCircle2, Copy, CreditCard, FileText, MoreHorizontal, Package, Pencil, Phone, Plus, Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientAvatar } from "@/components/shared/client-avatar";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { useSalon } from "@/components/layout/salon-context";
import { GalleryGrid } from "@/features/gallery/components/gallery-grid";
import { GalleryFormDialog } from "@/features/gallery/components/gallery-form-dialog";
import { fetchProducts } from "@/features/stock/actions";
import { useServerAction } from "@/hooks/use-server-action";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatCurrency, formatDate, formatDuration, formatTime } from "@/lib/format";
import { fullName, round2 } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import type { getAppointmentDetail } from "../repository";
import { addAppointmentProduct, cancelAppointment, deleteAppointment, setAppointmentStatus } from "../actions";
import { PaymentDialog } from "./complete-dialog";

type Detail = Awaited<ReturnType<typeof getAppointmentDetail>>;

function AddProduct({ appointmentId }: { appointmentId: string }) {
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState<string>("");
  const [qty, setQty] = useState("1");
  const { run, pending } = useServerAction();
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => { const r = await fetchProducts(); if (!r.ok) throw new Error(r.error); return r.data; },
    enabled: open,
  });
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><Button variant="ghost" size="sm"><Plus />Add</Button></PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3">
        <Select value={productId} onValueChange={setProductId}>
          <SelectTrigger><SelectValue placeholder="Product" /></SelectTrigger>
          <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} · {p.quantity} {p.unit}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex gap-2">
          <Input type="number" min={0} step="any" value={qty} onChange={(e) => setQty(e.target.value)} />
          <Button loading={pending} disabled={!productId} onClick={() => run(() => addAppointmentProduct(appointmentId, productId, Number(qty)), {
            success: "Product recorded and deducted", onSuccess: () => { setOpen(false); setProductId(""); setQty("1"); },
          })}>Add</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AppointmentDetail({ detail }: { detail: Detail }) {
  const a = detail.appointment!;
  const salon = useSalon();
  const router = useRouter();
  const openQuick = useUIStore((s) => s.openQuick);
  const { run } = useServerAction();
  const [payMode, setPayMode] = useState<"complete" | "pay" | null>(null);
  const [addingPhoto, setAddingPhoto] = useState(false);

  const isOpen = a.status === "pending" || a.status === "confirmed";
  const duration = Math.round((new Date(a.end_at).getTime() - new Date(a.start_at).getTime()) / 60000);
  const lines = [
    { label: a.service?.name ?? "Service", value: Number(a.service_price) },
    a.french && { label: "French", value: Number(salon.price_french) },
    a.nail_art_count > 0 && { label: `Nail art × ${a.nail_art_count}`, value: a.nail_art_count * Number(salon.price_nail_art) },
    a.complex_art_count > 0 && { label: `Complex nail art × ${a.complex_art_count}`, value: a.complex_art_count * Number(salon.price_complex_art) },
    a.strass_count > 0 && { label: `Strass × ${a.strass_count}`, value: a.strass_count * Number(salon.price_strass) },
  ].filter(Boolean) as { label: string; value: number }[];
  const productCost = detail.products.reduce((s, p) => s + Number(p.quantity) * Number(p.unit_cost), 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/appointments" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />Appointments
      </Link>

      <Card className="overflow-hidden">
        <div className="h-2" style={{ background: a.service?.color ?? "#F4A6C6" }} />
        <div className="flex flex-col gap-5 p-5 sm:p-7 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={a.status} />
              {a.source !== "dashboard" && <Badge variant="outline">via {a.source === "calendly" ? "Calendly" : "Google Calendar"}</Badge>}
              {a.payment_status === "paid" && <Badge variant="success"><CreditCard />Paid · {a.payment_method ? PAYMENT_METHODS[a.payment_method] : ""}</Badge>}
            </div>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-tight sm:text-5xl">{a.service?.name ?? "Appointment"}</h1>
            <p className="mt-1 text-muted-foreground capitalize">
              {formatDate(a.start_at, "EEEE d MMMM yyyy")} · {formatTime(a.start_at)}–{formatTime(a.end_at)} · {formatDuration(duration)}
              {a.technician ? ` · ${a.technician}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isOpen && <Button onClick={() => setPayMode("complete")}><CheckCircle2 />Complete</Button>}
            {a.status === "completed" && a.payment_status !== "paid" && <Button onClick={() => setPayMode("pay")}><CreditCard />Record payment</Button>}
            {a.status === "pending" && <Button variant="secondary" onClick={() => run(() => setAppointmentStatus(a.id, "confirmed"), { success: "Confirmed" })}><CalendarCheck2 />Confirm</Button>}
            {isOpen && <Button variant="outline" onClick={() => openQuick("appointment", { editId: a.id })}><Pencil />Edit</Button>}
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" size="icon" aria-label="More actions"><MoreHorizontal /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => openQuick("appointment", { duplicateOf: a.id })}><Copy />Duplicate</DropdownMenuItem>
                {detail.invoice && <DropdownMenuItem asChild><Link href={`/invoices/${detail.invoice.id}`}><FileText />Invoice {detail.invoice.number}</Link></DropdownMenuItem>}
                {isOpen && (
                  <ConfirmDialog
                    title="Cancel this appointment?"
                    description={a.calendly_event_uri ? "It will also be cancelled on Calendly and removed from Google Calendar." : "It will be removed from Google Calendar."}
                    confirmLabel="Cancel appointment"
                    onConfirm={() => run(() => cancelAppointment(a.id), { success: "Appointment cancelled" })}
                    trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()}><Ban />Cancel appointment</DropdownMenuItem>}
                  />
                )}
                <DropdownMenuSeparator />
                <ConfirmDialog
                  title="Delete this appointment?"
                  description="It disappears from your history and statistics. Prefer cancelling to keep a trace."
                  onConfirm={() => run(() => deleteAppointment(a.id), { success: "Appointment deleted", onSuccess: () => router.push("/appointments") })}
                  trigger={<DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}><Trash2 />Delete</DropdownMenuItem>}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Price</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {lines.map((l) => (
                <div key={l.label} className="flex justify-between"><span className="text-muted-foreground">{l.label}</span><span className="tabular">{formatCurrency(l.value)}</span></div>
              ))}
              {Number(a.discount) > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span className="tabular">−{formatCurrency(a.discount)}</span></div>}
              <div className="flex items-baseline justify-between border-t pt-3">
                <span className="font-medium">Total</span>
                <span className="font-display text-3xl font-semibold tabular">{formatCurrency(a.total_price)}</span>
              </div>
              {a.status === "completed" && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Product cost {formatCurrency(a.product_cost)}</span>
                  <span>Margin <strong className="text-foreground">{formatCurrency(a.profit)}</strong></span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Products used</CardTitle>
              <AddProduct appointmentId={a.id} />
            </CardHeader>
            <CardContent>
              {detail.products.length ? (
                <ul className="divide-y divide-border/60 text-sm">
                  {detail.products.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 py-2.5">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 truncate">{p.product_name}</span>
                      <span className="text-muted-foreground tabular">{round2(Number(p.quantity))}</span>
                      <span className="w-16 text-right tabular">{formatCurrency(Number(p.quantity) * Number(p.unit_cost))}</span>
                    </li>
                  ))}
                  <li className="flex justify-between pt-2.5 text-xs text-muted-foreground"><span>Estimated product cost</span><span className="tabular">{formatCurrency(productCost)}</span></li>
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {isOpen ? "Products set up for this service are deducted automatically when you complete it." : "No products recorded."}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Photos</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setAddingPhoto(true)}><Plus />Add</Button>
            </CardHeader>
            <CardContent>
              {detail.photos.length ? <GalleryGrid items={detail.photos} className="columns-2 sm:columns-3 lg:columns-3" />
                : <p className="text-sm text-muted-foreground">Add before and after photos of this set.</p>}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Client</CardTitle></CardHeader>
            <CardContent>
              {a.client ? (
                <div className="space-y-4">
                  <Link href={`/clients/${a.client.id}`} className="flex items-center gap-3">
                    <ClientAvatar client={a.client} className="h-12 w-12" />
                    <div className="min-w-0"><div className="truncate font-medium hover:text-primary">{fullName(a.client)}</div>
                      {a.client.phone && <div className="text-sm text-muted-foreground">{a.client.phone}</div>}</div>
                  </Link>
                  {a.client.phone && (
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a href={`tel:${a.client.phone.replace(/[^\d+]/g, "")}`}><Phone />Call</a>
                    </Button>
                  )}
                </div>
              ) : <p className="text-sm text-muted-foreground">Walk-in client</p>}
            </CardContent>
          </Card>
          {a.notes && (
            <Card>
              <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
              <CardContent><p className="whitespace-pre-line text-sm leading-relaxed">{a.notes}</p></CardContent>
            </Card>
          )}
          {a.status === "cancelled" && a.cancelled_at && (
            <div className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-200">
              <AlertTriangle className="h-4 w-4" />Cancelled on {formatDate(a.cancelled_at, "d MMM yyyy, HH:mm")}
            </div>
          )}
        </div>
      </div>

      <PaymentDialog
        open={!!payMode}
        onOpenChange={(o) => !o && setPayMode(null)}
        appointmentId={a.id}
        total={Number(a.total_price)}
        mode={payMode ?? "complete"}
        hasGiftCard={!!a.gift_card_id}
      />
      <GalleryFormDialog open={addingPhoto} onOpenChange={setAddingPhoto} clientId={a.client_id} appointmentId={a.id} />
    </div>
  );
}

