import type { Metadata } from "next";
import { listClients } from "@/features/clients/repository";
import { ClientsView } from "@/features/clients/components/clients-view";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  const clients = await listClients();
  return <ClientsView clients={clients} />;
}
