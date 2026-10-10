"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useServerAction } from "@/hooks/use-server-action";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { adjustStock, fetchProducts } from "../actions";
import { adjustSchema, type AdjustInput } from "../schemas";

export function StockAdjustDialog({ open, onOpenChange, productId }: { open: boolean; onOpenChange: (o: boolean) => void; productId?: string | null }) {
  const { run, pending } = useServerAction();
  const products = useQuery({
    queryKey: ["products"],
    queryFn: async () => { const r = await fetchProducts(); if (!r.ok) throw new Error(r.error); return r.data; },
    enabled: open,
  });
  const form = useForm<AdjustInput>({
    resolver: zodResolver(adjustSchema),
    defaultValues: { product_id: productId ?? "", mode: "add", quantity: 1, reason: "purchase", note: "", log_expense: true },
  });
  useEffect(() => {
    if (open) form.reset({ product_id: productId ?? "", mode: "add", quantity: 1, reason: "purchase", note: "", log_expense: true });
  }, [open, productId, form]);

  const v = useWatch({ control: form.control });
  const product = products.data?.find((p) => p.id === v.product_id);
  const after = product
    ? v.mode === "add" ? Number(product.quantity) + Number(v.quantity || 0)
    : v.mode === "remove" ? Math.max(0, Number(product.quantity) - Number(v.quantity || 0))
    : Number(v.quantity || 0)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update stock</DialogTitle>
          <DialogDescription>Every change is kept in the product history.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            noValidate
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => run(() => adjustStock(values), { success: "Stock updated", onSuccess: () => onOpenChange(false) }))}
          >
            <FormField control={form.control} name="product_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Product</FormLabel>
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger className="h-12"><SelectValue placeholder={products.isLoading ? "Loading…" : "Choose a product"} /></SelectTrigger></FormControl>
                  <SelectContent>
                    {products.data?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} <span className={cn("text-muted-foreground", Number(p.quantity) <= Number(p.min_quantity) && "text-red-500")}>· {p.quantity} {p.unit}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="mode" render={({ field }) => (
              <div className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1">
                {([["add", "Add"], ["remove", "Remove"], ["set", "Set to"]] as const).map(([value, label]) => (
                  <button key={value} type="button" onClick={() => {
                    field.onChange(value);
                    form.setValue("reason", value === "add" ? "purchase" : "adjustment");
                  }}
                    className={cn("rounded-full py-2 text-sm transition", field.value === value ? "bg-card font-medium shadow-soft" : "text-muted-foreground")}>
                    {label}
                  </button>
                ))}
              </div>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem><FormLabel>Quantity {product ? `(${product.unit})` : ""}</FormLabel><FormControl><Input type="number" min={0} step="any" className="h-12 text-lg" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="reason" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger className="h-12"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="purchase">Purchase</SelectItem>
                      <SelectItem value="adjustment">Inventory count</SelectItem>
                      <SelectItem value="loss">Loss / broken</SelectItem>
                      <SelectItem value="return">Return</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

            {product && (
              <div className="rounded-2xl bg-blush-50 px-4 py-3 text-sm dark:bg-secondary/50">
                {product.quantity} → <span className="font-semibold">{after}</span> {product.unit}
                {after !== null && after <= Number(product.min_quantity) && <span className="ml-2 text-red-500">below minimum ({product.min_quantity})</span>}
              </div>
            )}

            {v.mode === "add" && v.reason === "purchase" && product && (
              <FormField control={form.control} name="log_expense" render={({ field }) => (
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span>Add {formatCurrency(Number(v.quantity || 0) * Number(product.purchase_price))} to expenses</span>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </label>
              )} />
            )}

            <FormField control={form.control} name="note" render={({ field }) => (
              <FormItem><FormLabel>Note</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl></FormItem>
            )} />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" loading={pending}>Update stock</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
