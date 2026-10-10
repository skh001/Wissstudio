import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";
import { configureFormatting } from "@/lib/format";
import { getSettings } from "@/features/settings/repository";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const settings = await getSettings();
  configureFormatting({ language: settings.language, currency: settings.currency });
  return <AppShell settings={settings} email={user.email ?? ""}>{children}</AppShell>;
}
