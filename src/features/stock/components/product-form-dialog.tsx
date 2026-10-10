"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/shared/image-upload";
import { useServerAction } from "@/hooks/use-server-action";
import type { Product, StockCategory } from "@/types/domain";
import { upsertProduct } from "../actions";
import { productSchema, type ProductInput } from "../schemas";

const EMPTY: ProductInput = {
  name: "", category_id: null, brand: "", supplier: "", purchase_price: 0, unit: "unit", quantity: 0, min_quantity: 1,
  barcode: "", location: "", photo_url: null, is_favorite: false, notes: "",
};

export function ProductFormDialog({
  open, onOpenChange, product, categories,
}: { open: boolean; onOpenChange: (o: boolean) => void; product?: Product | null; categories: StockCategory[] }) {
  const { run, pending } = useServerAction();
  const form = useForm<ProductInput>({ resolver: zodResolver(productSchema), defaultValues: EMPTY });

  useEffect(() => {
    if (!open) return;
    form.reset(product ? {
      ...EMPTY, ...product,
      unit: (["unit", "ml", "g"].includes(product.unit) ? product.unit : "unit") as ProductInput["unit"],
      purchase_price: Number(product.purchase_price), quantity: Number(product.quantity), min_quantity: Number(product.min_quantity),
      brand: product.brand ?? "", supplier: product.supplier ?? "", barcode: product.barcode ?? "", location: product.location ?? "", notes: product.notes ?? "",
    } : EMPTY);
  }, [open, product, form]);

  const text = (name: "brand" | "supplier" | "barcode" | "location", label: string) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem><FormLabel>{label}</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
    )} />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>{product ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form noValidate className="space-y-5" onSubmit={form.handleSubmit((v) => run(() => upsertProduct(v, product?.id), {
            success: product ? "Product updated" : "Product added", onSuccess: () => onOpenChange(false),
          }))}>
            <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
              <FormField control={form.control} name="photo_url" render={({ field }) => (
                <ImageUpload value={field.value} onChange={field.onChange} folder="products" label="Photo" />
              )} />
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem className="sm:col-span-2"><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="category_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger></FormControl>
                      <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
                )} />
                {text("brand", "Brand")}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <FormField control={form.control} name="unit" render={({ field }) => (
                <FormItem>
                  <FormLabel>Counted in</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="unit">Units</SelectItem><SelectItem value="ml">ml</SelectItem><SelectItem value="g">grams</SelectItem></SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="purchase_price" render={({ field }) => (
                <FormItem><FormLabel>Cost per {form.watch("unit") === "unit" ? "unit" : form.watch("unit")} (€)</FormLabel><FormControl><Input type="number" step="0.01" min={0} {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem><FormLabel>In stock</FormLabel><FormControl><Input type="number" step="any" min={0} disabled={!!product} {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="min_quantity" render={({ field }) => (
                <FormItem><FormLabel>Alert below</FormLabel><FormControl><Input type="number" step="any" min={0} {...field} /></FormControl></FormItem>
              )} />
            </div>
            {product && <p className="-mt-3 text-xs text-muted-foreground">Change quantities with “Update stock” so the history stays accurate.</p>}

            <div className="grid gap-3 sm:grid-cols-3">
              {text("supplier", "Supplier")}
              {text("location", "Storage location")}
              {text("barcode", "Barcode")}
            </div>
            <FormField control={form.control} name="is_favorite" render={({ field }) => (
              <label className="flex items-center gap-2.5 text-sm"><Switch checked={field.value} onCheckedChange={field.onChange} />Favourite product</label>
            )} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" loading={pending}>{product ? "Save changes" : "Add product"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
