"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Download, History, MapPin, MoreHorizontal, Package, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChipFilter } from "@/components/shared/chip-filter";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StatCard } from "@/components/shared/stat-card";
import { useServerAction } from "@/hooks/use-server-action";
import { downloadFile, toCSV } from "@/lib/csv";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn, round2, sum } from "@/lib/utils";
import type { Product, ProductWithCategory, StockCategory } from "@/types/domain";
import { addStockCategory, deleteProduct, fetchMovements } from "../actions";
import { ProductFormDialog } from "./product-form-dialog";
import { StockAdjustDialog } from "./stock-adjust-dialog";
import { Boxes, CircleDollarSign, PackageX } from "lucide-react";

const REASON_LABEL = { purchase: "Purchase", appointment: "Appointment", adjustment: "Inventory", loss: "Loss", return: "Return" } as const;

function MovementsSheet({ product, onOpenChange }: { product: Product | null; onOpenChange: (o: boolean) => void }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["movements", product?.id],
    queryFn: async () => { const r = await fetchMovements(product!.id); if (!r.ok) throw new Error(r.error); return r.data; },
    enabled: !!product,
  });
  return (
    <Sheet open={!!product} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader><SheetTitle>{product?.name}</SheetTitle><SheetDescription>Last 50 stock movements</SheetDescription></SheetHeader>
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : data.length === 0 ? <p className="text-sm text-muted-foreground">No movement yet.</p> : (
          <ul className="divide-y">
            {data.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-3 text-sm">
                <span className={cn("w-16 shrink-0 text-right font-medium tabular", m.delta > 0 ? "text-emerald-600" : "text-red-500")}>{m.delta > 0 ? "+" : ""}{round2(m.delta)}</span>
                <div className="min-w-0 flex-1"><div>{REASON_LABEL[m.reason]}</div>{m.note && <div className="truncate text-xs text-muted-foreground">{m.note}</div>}</div>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDate(m.created_at, "d MMM, HH:mm")}</span>
              </li>
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function StockView({ products, categories }: { products: ProductWithCategory[]; categories: StockCategory[] }) {
  const params = useSearchParams();
  const { run } = useServerAction();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>(params.get("filter") === "low" ? "low" : "all");
  const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  const [adjusting, setAdjusting] = useState<string | null | undefined>(undefined);
  const [history, setHistory] = useState<Product | null>(null);
  const [newCat, setNewCat] = useState("");

  useEffect(() => {
    const id = params.get("product");
    if (id) setHistory(products.find((p) => p.id === id) ?? null);
  }, [params, products]);

  const isLow = (p: Product) => Number(p.quantity) <= Number(p.min_quantity);
  const lowCount = products.filter(isLow).length;
  const value = round2(sum(products, (p) => Number(p.quantity) * Number(p.purchase_price)));

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter((p) => cat === "all" || (cat === "low" ? isLow(p) : cat === "fav" ? p.is_favorite : p.category_id === cat))
      .filter((p) => !q || [p.name, p.brand, p.supplier, p.barcode, p.location].filter(Boolean).join(" ").toLowerCase().includes(q))
      .sort((a, b) => Number(isLow(b)) - Number(isLow(a)) || a.name.localeCompare(b.name, "fr"));
  }, [products, query, cat]);

  const usedCats = categories.filter((c) => products.some((p) => p.category_id === c.id));

  return (
    <>
      <PageHeader
        title="Stock"
        description="Products are deducted automatically when you complete an appointment."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => downloadFile(toCSV(list.map((p) => ({
              name: p.name, category: p.category?.name, brand: p.brand, supplier: p.supplier, quantity: p.quantity, unit: p.unit,
              min: p.min_quantity, cost: p.purchase_price, location: p.location, barcode: p.barcode,
            }))), "wissnails-stock.csv")}><Download />Export</Button>
            <Button variant="secondary" onClick={() => setAdjusting(null)}>Update stock</Button>
            <Button onClick={() => setEditing(null)}><Plus />New product</Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Products" value={products.length} icon={Boxes} />
        <StatCard label="Stock value" value={value} format="currency" icon={CircleDollarSign} />
        <StatCard label="Below minimum" value={lowCount} icon={PackageX} tone={lowCount ? "alert" : "default"} className="col-span-2 lg:col-span-1" />
      </div>

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ChipFilter
          value={cat}
          onChange={setCat}
          options={[
            { value: "all", label: "All", count: products.length },
            ...(lowCount ? [{ value: "low", label: "⚠ Low stock", count: lowCount }] : []),
            { value: "fav", label: "Favourites" },
            ...usedCats.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Name, brand, barcode…" />
      </div>

      {list.length === 0 ? (
        <EmptyState
          title={products.length ? "No product matches" : "Your shelf is empty"}
          description={products.length ? "Try another search or category." : "Add your gels, top coats and tips to track stock and real costs."}
          action={!products.length && <Button onClick={() => setEditing(null)}><Plus />Add a product</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => {
            const low = isLow(p);
            const pct = Number(p.min_quantity) > 0 ? Math.min(100, (Number(p.quantity) / (Number(p.min_quantity) * 3)) * 100) : 100;
            return (
              <Card key={p.id} className={cn("flex gap-4 p-4 transition hover:shadow-lift", low && "border-red-200 dark:border-red-500/30")}>
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-muted">
                  {p.photo_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={p.photo_url} alt="" className="h-full w-full object-cover" />
                    : <div className="grid h-full w-full place-items-center text-muted-foreground"><Package className="h-6 w-6" /></div>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate font-medium">{p.is_favorite && <Star className="h-3.5 w-3.5 shrink-0 fill-champagne text-[#C9A15B]" />}{p.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{[p.category?.name, p.brand].filter(Boolean).join(" · ")}</div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="Actions"><MoreHorizontal /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setAdjusting(p.id)}><Package />Update stock</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setHistory(p)}><History />History</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setEditing(p)}><Pencil />Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <ConfirmDialog title={`Delete ${p.name}?`} description="Its stock history is deleted too."
                          onConfirm={() => run(() => deleteProduct(p.id), { success: "Product deleted" })}
                          trigger={<DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}><Trash2 />Delete</DropdownMenuItem>} />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className={cn("font-display text-2xl font-semibold tabular", low && "text-red-500")}>{round2(Number(p.quantity))}</span>
                    <span className="text-xs text-muted-foreground">{p.unit} · min {p.min_quantity}</span>
                    {low && <Badge variant="destructive" className="ml-auto"><AlertTriangle />Low</Badge>}
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full", low ? "bg-red-400" : "bg-gradient-to-r from-blush-300 to-rosegold-400")} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 truncate">{p.location && <><MapPin className="h-3 w-3" />{p.location}</>}</span>
                    <span>{formatCurrency(p.purchase_price)}/{p.unit === "unit" ? "u" : p.unit}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="mt-8 p-5">
        <div className="font-display text-lg font-semibold">Categories</div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {categories.map((c) => <Badge key={c.id} variant="outline">{c.name}</Badge>)}
          <form className="flex gap-1.5" onSubmit={(e) => { e.preventDefault(); if (!newCat.trim()) return toast.error("Enter a name"); void run(() => addStockCategory(newCat), { success: "Category added", onSuccess: () => setNewCat("") }); }}>
            <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="New category" className="h-7 w-36 rounded-full text-xs" />
            <Button size="sm" variant="ghost" className="h-7" type="submit"><Plus />Add</Button>
          </form>
        </div>
      </Card>

      <ProductFormDialog open={editing !== undefined} onOpenChange={(o) => !o && setEditing(undefined)} product={editing} categories={categories} />
      <StockAdjustDialog open={adjusting !== undefined} onOpenChange={(o) => !o && setAdjusting(undefined)} productId={adjusting} />
      <MovementsSheet product={history} onOpenChange={(o) => !o && setHistory(null)} />
    </>
  );
}
