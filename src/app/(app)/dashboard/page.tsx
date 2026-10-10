import type { Metadata } from "next";
import { getDashboardData } from "@/features/dashboard/repository";
import { getSettings } from "@/features/settings/repository";
import { DashboardView } from "@/features/dashboard/components/dashboard-view";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [data, settings] = await Promise.all([getDashboardData(), getSettings()]);
  return <DashboardView data={data} objective={Number(settings.monthly_objective)} ownerName={settings.owner_name} />;
}
