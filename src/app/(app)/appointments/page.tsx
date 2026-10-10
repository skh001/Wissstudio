import type { Metadata } from "next";
import { subDays } from "date-fns";
import { listAppointments } from "@/features/appointments/repository";
import { AppointmentsView } from "@/features/appointments/components/appointments-view";

export const metadata: Metadata = { title: "Appointments" };

export default async function AppointmentsPage() {
  const appointments = await listAppointments({ from: subDays(new Date(), 180).toISOString(), limit: 3000 });
  return <AppointmentsView appointments={appointments} />;
}
