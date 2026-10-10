"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle, ArrowLeft, Cake, CalendarPlus, Crown, Gift, Heart, Instagram, Mail, MessageCircle, MoreHorizontal, Pencil, Phone, Plus, Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientAvatar } from "@/components/shared/client-avatar";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { useSalon } from "@/components/layout/salon-context";
import { AppointmentRow } from "@/features/appointments/components/appointment-row";
import { InvoiceList } from "@/features/finance/components/invoice-list";
import { GalleryGrid } from "@/features/gallery/components/gallery-grid";
import { GalleryFormDialog } from "@/features/gallery/components/gallery-form-dialog";
import { useServerAction } from "@/hooks/use-server-action";
import { formatCurrency, formatDate, formatRelativeDay } from "@/lib/format";
import { fullName } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import { CircleDollarSign, Receipt, Repeat } from "lucide-react";
import type { getClientProfile } from "../repository";
import { deleteClient, redeemLoyalty, toggleClientFlag } from "../actions";
import { ClientFormDialog } from "./client-form-dialog";

type Profile = NonNullable<Awaited<ReturnType<typeof getClientProfile>>>;

export function ClientProfile({ profile }: { profile: Profile }) {
  const { client, stats, appointments, gallery, invoices, products, favoriteService } = profile;
  const salon = useSalon();
  const router = useRouter();
  const openQuick = useUIStore((s) => s.openQuick);
  const { run } = useServerAction();
  const [editing, setEditing] = useState(false);
  const [addingPhoto, setAddingPhoto] = useState(false);

  const name = fullName(client);
  const phoneDigits = client.phone?.replace(/[^\d+]/g, "");
  const avg = stats.appointments_count ? Number(stats.total_spent) / stats.appointments_count : 0;
  const upcoming = appointments.filter((a) => new Date(a.start_at) > new Date() && ["pending", "confirmed"].includes(a.status)).reverse();
  const loyaltyPct = Math.min(100, (client.loyalty_points / salon.loyalty_reward_threshold) * 100);
  const isBirthdaySoon = client.birthday && (() => {
    const now = new Date();
    const bd = new Date(now.getFullYear(), Number(client.birthday.slice(5, 7)) - 1, Number(client.birthday.slice(8, 10)));
    const diff = (bd.getTime() - now.setHours(0, 0, 0, 0)) / 86400000;
    return diff >= 0 && diff <= 14;
  })();

  const preferences = [
    ["Colour", client.favorite_color], ["Shape", client.favorite_shape], ["Length", client.favorite_length],
    ["Style", client.favorite_style], ["Technician", client.preferred_technician], ["Favourite service", favoriteService],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <div className="space-y-6">
      <Link href="/clients" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />Clients
      </Link>

      {/* Header */}
      <Card className="overflow-hidden">
        <div className="h-20 bg-lacquer dark:bg-lacquer-dark sm:h-24" />
        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:px-6">
          <ClientAvatar client={client} className="-mt-10 h-20 w-20 border-4 border-card text-xl sm:-mt-12 sm:h-24 sm:w-24" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl font-semibold sm:text-4xl">{name}</h1>
              {client.is_vip && <Badge variant="gold"><Crown />VIP</Badge>}
              {isBirthdaySoon && <Badge variant="secondary"><Cake />Birthday {formatDate(`${new Date().getFullYear()}${client.birthday!.slice(4)}`, "d MMM")}</Badge>}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {client.phone && <span>{client.phone}</span>}
              {client.instagram && <span>{client.instagram}</span>}
              {client.email && <span className="truncate">{client.email}</span>}
              <span>Client since {formatDate(client.created_at, "MMM yyyy")}</span>
            </div>
            {client.tags?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">{client.tags.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}</div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {phoneDigits && <Button variant="outline" size="icon" asChild><a href={`tel:${phoneDigits}`} aria-label="Call"><Phone /></a></Button>}
            {phoneDigits && <Button variant="outline" size="icon" asChild><a href={`sms:${phoneDigits}`} aria-label="Text message"><MessageCircle /></a></Button>}
            {client.instagram && <Button variant="outline" size="icon" asChild><a href={`https://instagram.com/${client.instagram.replace("@", "")}`} target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram /></a></Button>}
            {client.email && <Button variant="outline" size="icon" asChild><a href={`mailto:${client.email}`} aria-label="Email"><Mail /></a></Button>}
            <Button onClick={() => openQuick("appointment", { clientId: client.id })}><CalendarPlus />Book</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="More"><MoreHorizontal /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setEditing(true)}><Pencil />Edit client</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => run(() => toggleClientFlag(client.id, "is_favorite", !client.is_favorite))}>
                  <Heart />{client.is_favorite ? "Remove from favourites" : "Add to favourites"}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => run(() => toggleClientFlag(client.id, "is_vip", !client.is_vip))}>
                  <Crown />{client.is_vip ? "Remove VIP" : "Mark as VIP"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <ConfirmDialog
                  title={`Delete ${name}?`}
                  description="Their appointments and invoices are kept, without the client link. This can't be undone."
                  onConfirm={() => run(() => deleteClient(client.id), { success: "Client deleted", onSuccess: () => router.push("/clients") })}
                  trigger={<DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}><Trash2 />Delete client</DropdownMenuItem>}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>

      {client.allergies && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span><strong>Allergies:</strong> {client.allergies}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total spent" value={Number(stats.total_spent)} format="currency" icon={CircleDollarSign} />
        <StatCard label="Visits" value={stats.appointments_count} icon={Repeat} />
        <StatCard label="Average spend" value={avg} format="currency" icon={Receipt} />
        <Card className="p-4 sm:p-5">
          <div className="text-xs font-medium text-muted-foreground sm:text-sm">Last / next visit</div>
          <div className="mt-2 text-sm"><span className="text-muted-foreground">Last:</span> {formatDate(stats.last_visit, "d MMM yyyy")}</div>
          <div className="text-sm"><span className="text-muted-foreground">Next:</span> {stats.next_visit ? formatRelativeDay(stats.next_visit) : "—"}</div>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">History ({appointments.length})</TabsTrigger>
          <TabsTrigger value="gallery">Gallery ({gallery.length})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Preferences</CardTitle></CardHeader>
            <CardContent>
              {preferences.length ? (
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                  {preferences.map(([k, v]) => (
                    <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-0.5 font-medium">{v}</dd></div>
                  ))}
                </dl>
              ) : <p className="text-sm text-muted-foreground">No preferences saved yet.</p>}
              {client.notes && (
                <div className="mt-6 rounded-2xl bg-muted/60 p-4 text-sm leading-relaxed">
                  <div className="mb-1 text-xs text-muted-foreground">Notes</div>
                  <p className="whitespace-pre-line">{client.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle>Loyalty</CardTitle><Gift className="h-4 w-4 text-primary" /></CardHeader>
              <CardContent>
                <div className="font-display text-4xl font-semibold tabular">{client.loyalty_points} <span className="text-base font-normal text-muted-foreground">pts</span></div>
                <Progress value={loyaltyPct} className="mt-3" />
                <p className="mt-2 text-xs text-muted-foreground">
                  {client.loyalty_points >= salon.loyalty_reward_threshold
                    ? `Reward available: ${formatCurrency(salon.loyalty_reward_value)} off`
                    : `${salon.loyalty_reward_threshold - client.loyalty_points} pts to a ${formatCurrency(salon.loyalty_reward_value)} reward`}
                </p>
                {client.loyalty_points >= salon.loyalty_reward_threshold && (
                  <Button size="sm" variant="secondary" className="mt-3 w-full" onClick={() => run(() => redeemLoyalty(client.id), { success: "Reward redeemed — apply it as a discount on the next appointment" })}>
                    Redeem reward
                  </Button>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Upcoming</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {upcoming.length ? upcoming.map((a) => <AppointmentRow key={a.id} appointment={a} showClient={false} className="-mx-2" />)
                  : <p className="text-sm text-muted-foreground">No upcoming appointment.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Products usually used</CardTitle></CardHeader>
              <CardContent>
                {products.length ? (
                  <ul className="space-y-2 text-sm">
                    {products.map((p) => (
                      <li key={p.name} className="flex justify-between gap-2"><span className="truncate">{p.name}</span><span className="shrink-0 text-muted-foreground">{p.times}×</span></li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-muted-foreground">Recorded when appointments are completed.</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardContent className="pt-5 sm:pt-6">
              {appointments.length === 0 ? (
                <EmptyState title="No visits yet" description={`Book ${client.first_name}'s first appointment.`}
                  action={<Button onClick={() => openQuick("appointment", { clientId: client.id })}><CalendarPlus />Book</Button>} />
              ) : (
                <ol className="relative ml-2 space-y-1 border-l border-border pl-4">
                  {appointments.map((a) => (
                    <li key={a.id} className="relative">
                      <span className="absolute -left-[21px] top-7 h-2.5 w-2.5 rounded-full border-2 border-card" style={{ background: a.service?.color ?? "#F4A6C6" }} />
                      <AppointmentRow appointment={a} showClient={false} />
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gallery">
          <div className="mb-4 flex justify-end"><Button variant="outline" onClick={() => setAddingPhoto(true)}><Plus />Add photos</Button></div>
          {gallery.length ? <GalleryGrid items={gallery} /> : <EmptyState title="No photos yet" description="Add before and after photos of her sets." />}
        </TabsContent>

        <TabsContent value="invoices">
          <Card><CardContent className="pt-5 sm:pt-6"><InvoiceList invoices={invoices} showClient={false} /></CardContent></Card>
        </TabsContent>
      </Tabs>

      <ClientFormDialog open={editing} onOpenChange={setEditing} client={client} />
      <GalleryFormDialog open={addingPhoto} onOpenChange={setAddingPhoto} clientId={client.id} />
    </div>
  );
}
