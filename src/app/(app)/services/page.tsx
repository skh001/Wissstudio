import type { Metadata } from "next";
import { listConsumptionRules, listServices } from "@/features/services/repository";
import { listProducts } from "@/features/stock/repository";
import { ServicesView } from "@/features/services/components/services-view";

export const metadata: Metadata = { title: "Services" };

export default async function ServicesPage() {
  const [services, rules, products] = await Promise.all([listServices(), listConsumptionRules(), listProducts()]);
  return <ServicesView services={services} rules={rules} products={products.map((p) => ({ id: p.id, name: p.name, unit: p.unit }))} />;
}
