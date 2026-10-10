"use client";

import { useState } from "react";
import { Banknote, CreditCard, Gift, Landmark, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useServerAction } from "@/hooks/use-server-action";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/types/domain";
import { completeAppointment, markAppointmentPaid } from "../actions";

const ICONS: Record<PaymentMethod, typeof CreditCard> = { card: CreditCard, cash: Banknote, transfer: Landmark, gift_card: Gift, other: MoreHorizontal };

export function PaymentDialog({
  open, onOpenChange, appointmentId, total, mode, hasGiftCard,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; appointmentId: string; total: number; mode: "complete" | "pay"; hasGiftCard: boolean;
}) {
  const { run, pending } = useServerAction();
  const [method, setMethod] = useState<PaymentMethod>(hasGiftCard ? "gift_card" : "card");
  const [paid, setPaid] = useState(true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "complete" ? "Complete appointment" : "Record payment"}</DialogTitle>
          <DialogDescription>
            {mode === "complete" ? "Products are deducted from stock, loyalty points added and an invoice created." : "Mark this appointment as paid."}
          </DialogDescription>
        </DialogHeader>
        <div className="text-center">
          <div className="text-xs text-muted-foreground">Amount</div>
          <div className="font-display text-5xl font-semibold tabular">{formatCurrency(total)}</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).filter((m) => m !== "gift_card" || hasGiftCard).map((m) => {
            const Icon = ICONS[m];
            return (
              <button key={m} type="button" onClick={() => setMethod(m)}
                className={cn("flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-xs transition",
                  method === m ? "border-primary bg-blush-50 text-foreground dark:bg-secondary" : "text-muted-foreground hover:border-primary/40")}>
                <Icon className="h-5 w-5" />{PAYMENT_METHODS[m]}
              </button>
            );
          })}
        </div>
        {mode === "complete" && (
          <label className="flex items-center justify-between text-sm">Paid now<Switch checked={paid} onCheckedChange={setPaid} /></label>
        )}
        <Button
          size="lg"
          loading={pending}
          onClick={() => run(
            () => mode === "complete" ? completeAppointment(appointmentId, { payment_method: method, mark_paid: paid }) : markAppointmentPaid(appointmentId, method),
            { success: mode === "complete" ? "Appointment completed 💅" : "Payment recorded", onSuccess: () => onOpenChange(false) },
          )}
        >
          {mode === "complete" ? "Complete appointment" : "Record payment"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
