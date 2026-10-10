import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getClientProfile } from "@/features/clients/repository";
import { ClientProfile } from "@/features/clients/components/client-profile";

export const metadata: Metadata = { title: "Client" };

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const profile = await getClientProfile(id);
  if (!profile) notFound();
  return <ClientProfile profile={profile} />;
}
