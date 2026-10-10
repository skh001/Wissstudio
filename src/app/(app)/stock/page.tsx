import type { Metadata } from "next";
import { Suspense } from "react";
import { listProducts, listStockCategories } from "@/features/stock/repository";
import { StockView } from "@/features/stock/components/stock-view";

export const metadata: Metadata = { title: "Stock" };

export default async function StockPage() {
  const [products, categories] = await Promise.all([listProducts(), listStockCategories()]);
  return <Suspense><StockView products={products} categories={categories} /></Suspense>;
}
