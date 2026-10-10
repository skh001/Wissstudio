"use server";

import { revalidatePath } from "next/cache";
import { requireUser, runAction, unwrap, AppError } from "@/lib/action";
import { emptyToNull } from "@/lib/utils";
import { listMovements, listProducts } from "./repository";
import { adjustSchema, productSchema, type AdjustInput, type ProductInput } from "./schemas";

const revalidate = () => { revalidatePath("/stock"); revalidatePath("/dashboard"); };

export async function fetchProducts() {
  return runAction(() => listProducts());
}

export async function fetchMovements(productId: string) {
  return runAction(() => listMovements(productId));
}

export async function upsertProduct(input: ProductInput, id?: string) {
  return runAction(async () => {
    const { supabase } = await requireUser();
    const row = emptyToNull(productSchema.parse(input));
    if (id) {
      const { quantity: _q, ...rest } = row; // quantity changes go through adjust_stock for history
      void _q;
      unwrap(await supabase.from("products").update(rest).eq("id", id).select("id").single());
    } else {
      const saved = unwrap(await supabase.from("products").insert(row).select("id").single()) as { id: string };
      if (row.quantity > 0) {
        await supabase.from("stock_movements").insert({ product_id: saved.id, delta: row.quantity, reason: "purchase", note: "Initial stock" });
      }
    }
    revalidate();
    return null;
  });
}

export async function deleteProduct(id: string) {
  return runAction(async () => {
    const { supabase } = await requireUser();
    unwrap(await supabase.from("products").delete().eq("id", id).select("id"));
    revalidate();
    return null;
  });
}

export async function adjustStock(input: AdjustInput) {
  return runAction(async () => {
    const { supabase } = await requireUser();
    const data = adjustSchema.parse(input);
    const { data: product } = await supabase.from("products").select("name, quantity, purchase_price, supplier").eq("id", data.product_id).single();
    if (!product) throw new AppError("Product not found.");

    const delta =
      data.mode === "add" ? data.quantity
      : data.mode === "remove" ? -data.quantity
      : data.quantity - Number(product.quantity);
    if (delta === 0) return null;

    const { error } = await supabase.rpc("adjust_stock", {
      p_product_id: data.product_id, p_delta: delta, p_reason: data.reason, p_note: data.note || null,
    });
    if (error) throw new AppError(error.message);

    if (data.log_expense && data.reason === "purchase" && delta > 0) {
      await supabase.from("expenses").insert({
        category: "products",
        label: `Restock · ${product.name}`,
        amount: Math.round(delta * Number(product.purchase_price) * 100) / 100,
        supplier: product.supplier,
      });
      revalidatePath("/finance");
    }
    revalidate();
    return null;
  });
}

export async function addStockCategory(name: string) {
  return runAction(async () => {
    const { supabase } = await requireUser();
    if (!name.trim()) throw new AppError("Enter a category name.");
    const { count } = await supabase.from("stock_categories").select("id", { count: "exact", head: true });
    unwrap(await supabase.from("stock_categories").insert({ name: name.trim(), sort_order: (count ?? 0) + 1 }).select("id"));
    revalidate();
    return null;
  });
}
