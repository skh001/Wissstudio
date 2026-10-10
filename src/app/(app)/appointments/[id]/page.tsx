import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAppointmentDetail } from "@/features/appointments/repository";
import { AppointmentDetail } from "@/features/appointments/components/appointment-detail";

export const metadata: Metadata = { title: "Appointment" };

export default async function AppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const detail = await getAppointmentDetail(id);
  if (!detail.appointment) notFound();
  return <AppointmentDetail detail={detail} />;
}
