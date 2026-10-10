"use client";

import { useUIStore } from "@/stores/ui-store";
import { AppointmentFormDialog } from "@/features/appointments/components/appointment-form-dialog";
import { ClientFormDialog } from "@/features/clients/components/client-form-dialog";
import { ExpenseFormDialog } from "@/features/finance/components/expense-form-dialog";
import { StockAdjustDialog } from "@/features/stock/components/stock-adjust-dialog";

/** Global dialogs opened from anywhere: quick actions, keyboard shortcuts, command palette, mobile FAB. */
export function QuickDialogs() {
  const { quickDialog, appointmentDraft, closeQuick } = useUIStore();
  const onOpenChange = (open: boolean) => { if (!open) closeQuick(); };
  return (
    <>
      <AppointmentFormDialog open={quickDialog === "appointment"} onOpenChange={onOpenChange} draft={appointmentDraft} />
      <ClientFormDialog open={quickDialog === "client"} onOpenChange={onOpenChange} />
      <ExpenseFormDialog open={quickDialog === "expense"} onOpenChange={onOpenChange} />
      <StockAdjustDialog open={quickDialog === "stock"} onOpenChange={onOpenChange} />
    </>
  );
}
