import "server-only";
import { requireUser, unwrap } from "@/lib/action";
import type { ProductWithCategory, StockCategory, StockMovement } from "@/types/domain";

export async function listProducts(): Promise<ProductWithCategory[]> {
  const { supabase } = await requireUser();
  return unwrap(
    await supabase.from("products").select("*, category:stock_categories(id, name)").order("name"),
  ) as ProductWithCategory[];
}

export async function listStockCategories(): Promise<StockCategory[]> {
  const { supabase } = await requireUser();
  return unwrap(await supabase.from("stock_categories").select("*").order("sort_order")) as StockCategory[];
}

export async function listLowStock() {
  const products = await listProducts();
  return products.filter((p) => Number(p.quantity) <= Number(p.min_quantity));
}

export async function listMovements(productId: string): Promise<StockMovement[]> {
  const { supabase } = await requireUser();
  return unwrap(
    await supabase.from("stock_movements").select("*").eq("product_id", productId).order("created_at", { ascending: false }).limit(50),
  ) as StockMovement[];
}
