"use server";

import { revalidatePath } from "next/cache";
import { addMinutes } from "date-fns";
import { fromZonedTime } from "./lib/timezone";
import { requireUser, runAction, unwrap, AppError } from "@/lib/action";
import { scheduleCalendarSync } from "@/features/integrations/sync";
import { computePricing } from "./lib/pricing";
import { getAppointmentDetail, getAppointmentFormOptions, listAppointments } from "./repository";
import { appointmentSchema, completeSchema, type AppointmentInput } from "./schemas";
import type { Appointment, PaymentMethod } from "@/types/domain";

function revalidateAppointments(id?: string) {
  for (const p of ["/dashboard", "/appointments", "/calendar", "/finance", "/clients", "/stock"]) revalidatePath(p);
  if (id) revalidatePath(`/appointments/${id}`);
}

export async function fetchAppointmentFormOptions() {
  return runAction(() => getAppointmentFormOptions());
}

export async function fetchCalendarRange(fromISO: string, toISO: string) {
  return runAction(() => listAppointments({ from: fromISO, to: toISO }));
}

export async function fetchAppointment(id: string) {
  return runAction(async () => {
    const { appointment } = await getAppointmentDetail(id);
    if (!appointment) throw new AppError("This appointment no longer exists.");
    return appointment;
  });
}

export async function upsertAppointment(input: AppointmentInput, id?: string) {
  return runAction(async () => {
    const { supabase, user } = await requireUser();
    const data = appointmentSchema.parse(input);

    const [{ data: service }, { data: prices }] = await Promise.all([
      supabase.from("services").select("price").eq("id", data.service_id).single(),
      supabase.from("salon_settings").select("price_french, price_nail_art, price_complex_art, price_strass").eq("owner_id", user.id).single(),
    ]);
    if (!service || !prices) throw new AppError("This service no longer exists. Choose another one.");

    // Existing appointments keep the price they were booked at, unless the service changed.
    let servicePrice = Number(service.price);
    if (id) {
      const { data: prev } = await supabase.from("appointments").select("service_id, service_price, status").eq("id", id).single();
      if (prev?.status === "completed") throw new AppError("Completed appointments can't be edited. Duplicate it instead.");
      if (prev && prev.service_id === data.service_id) servicePrice = Number(prev.service_price);
    }

    const pricing = computePricing(
      {
        servicePrice,
        french: data.french,
        nailArtCount: data.nail_art_count,
        complexArtCount: data.complex_art_count,
        strassCount: data.strass_count,
        discount: data.discount,
      },
      prices,
    );

    const start = fromZonedTime(`${data.date}T${data.time}:00`);
    const row = {
      client_id: data.client_id,
      service_id: data.service_id,
      start_at: start.toISOString(),
      end_at: addMinutes(start, data.duration_minutes).toISOString(),
      status: data.status === "completed" ? "confirmed" : data.status, // completion goes through completeAppointment
      technician: data.technician || null,
      french: data.french,
      nail_art_count: data.nail_art_count,
      complex_art_count: data.complex_art_count,
      strass_count: data.strass_count,
      service_price: servicePrice,
      extras_total: pricing.extras,
      discount: pricing.discount,
      total_price: pricing.total,
      gift_card_id: data.gift_card_id || null,
      notes: data.notes || null,
      cancelled_at: data.status === "cancelled" ? new Date().toISOString() : null,
    };

    const saved = (id
      ? unwrap(await supabase.from("appointments").update(row).eq("id", id).select("id, calendly_event_uri, status").single())
      : unwrap(await supabase.from("appointments").insert(row).select("id, calendly_event_uri, status").single())) as Pick<Appointment, "id" | "calendly_event_uri" | "status">;

    scheduleCalendarSync(user.id, saved.id, {
      cancelCalendlyUri: saved.status === "cancelled" ? saved.calendly_event_uri : null,
    });
    revalidateAppointments(saved.id);
    return { id: saved.id };
  });
}

/** Calendar drag & drop / resize. */
export async function moveAppointment(id: string, startISO: string, endISO: string) {
  return runAction(async () => {
    const { supabase, user } = await requireUser();
    const { data } = await supabase.from("appointments").select("status").eq("id", id).single();
    if (data?.status === "completed" || data?.status === "cancelled") throw new AppError("Only upcoming appointments can be moved.");
    unwrap(await supabase.from("appointments").update({ start_at: startISO, end_at: endISO }).eq("id", id).select("id").single());
    scheduleCalendarSync(user.id, id);
    revalidateAppointments(id);
    return null;
  });
}

export async function setAppointmentStatus(id: string, status: "pending" | "confirmed") {
  return runAction(async () => {
    const { supabase, user } = await requireUser();
    unwrap(await supabase.from("appointments").update({ status }).eq("id", id).in("status", ["pending", "confirmed"]).select("id").single());
    scheduleCalendarSync(user.id, id);
    revalidateAppointments(id);
    return null;
  });
}

export async function completeAppointment(id: string, input: { payment_method: PaymentMethod; mark_paid: boolean }) {
  return runAction(async () => {
    const { supabase, user } = await requireUser();
    const { payment_method, mark_paid } = completeSchema.parse(input);
    const { error } = await supabase.rpc("complete_appointment", {
      p_appointment_id: id,
      p_payment_method: payment_method,
      p_mark_paid: mark_paid,
    });
    if (error) throw new AppError(error.message);
    scheduleCalendarSync(user.id, id);
    revalidateAppointments(id);
    return null;
  });
}

export async function cancelAppointment(id: string) {
  return runAction(async () => {
    const { supabase, user } = await requireUser();
    const saved = unwrap(
      await supabase.from("appointments")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", id).in("status", ["pending", "confirmed"])
        .select("id, calendly_event_uri").single(),
    ) as Pick<Appointment, "id" | "calendly_event_uri">;
    scheduleCalendarSync(user.id, id, { cancelCalendlyUri: saved.calendly_event_uri });
    revalidateAppointments(id);
    return null;
  });
}

export async function markAppointmentPaid(id: string, method: PaymentMethod) {
  return runAction(async () => {
    const { supabase } = await requireUser();
    const { data: appt } = await supabase.from("appointments").select("payment_status, gift_card_id, total_price").eq("id", id).single();
    if (!appt) throw new AppError("This appointment no longer exists.");
    if (appt.payment_status === "paid") throw new AppError("This appointment is already paid.");
    if (method === "gift_card") {
      if (!appt.gift_card_id) throw new AppError("No gift card is attached to this appointment.");
      const { data: card } = await supabase.from("gift_cards").select("balance").eq("id", appt.gift_card_id).single();
      if (!card) throw new AppError("The gift card no longer exists.");
      unwrap(await supabase.from("gift_cards")
        .update({ balance: Math.max(0, Math.round((Number(card.balance) - Number(appt.total_price)) * 100) / 100) })
        .eq("id", appt.gift_card_id).select("id").single());
    }
    unwrap(await supabase.from("appointments")
      .update({ payment_status: "paid", payment_method: method, paid_at: new Date().toISOString() })
      .eq("id", id).select("id").single());
    await supabase.from("invoices").update({ paid: true, payment_method: method }).eq("appointment_id", id);
    revalidateAppointments(id);
    return null;
  });
}

export async function deleteAppointment(id: string) {
  return runAction(async () => {
    const { supabase, user } = await requireUser();
    // mark cancelled first so Google deletes the event, then remove the row
    const { data } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id).select("calendly_event_uri").single();
    const { syncAppointmentToGoogle } = await import("@/features/integrations/google-calendar");
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) await syncAppointmentToGoogle(user.id, id);
    if (data?.calendly_event_uri) {
      const { cancelOnCalendly } = await import("@/features/integrations/calendly");
      await cancelOnCalendly(user.id, data.calendly_event_uri);
    }
    unwrap(await supabase.from("appointments").delete().eq("id", id).select("id"));
    revalidateAppointments();
    return null;
  });
}

/** Log a product used by hand during the appointment (deducts stock, adds to cost). */
export async function addAppointmentProduct(appointmentId: string, productId: string, quantity: number) {
  return runAction(async () => {
    const { supabase } = await requireUser();
    if (!(quantity > 0)) throw new AppError("Enter a quantity above 0.");
    const { data: p } = await supabase.from("products").select("name, purchase_price").eq("id", productId).single();
    if (!p) throw new AppError("Product not found.");
    unwrap(await supabase.from("appointment_products").insert({
      appointment_id: appointmentId, product_id: productId, product_name: p.name, quantity, unit_cost: p.purchase_price,
    }).select("id"));
    const { error } = await supabase.rpc("adjust_stock", { p_product_id: productId, p_delta: -quantity, p_reason: "appointment", p_note: "Used during appointment" });
    if (error) throw new AppError(error.message);
    const { data: appt } = await supabase.from("appointments").select("product_cost, status").eq("id", appointmentId).single();
    if (appt?.status === "completed") {
      await supabase.from("appointments")
        .update({ product_cost: Math.round((Number(appt.product_cost) + quantity * Number(p.purchase_price)) * 100) / 100 })
        .eq("id", appointmentId);
    }
    revalidateAppointments(appointmentId);
    return null;
  });
}
