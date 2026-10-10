"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/shared/image-upload";
import { useServerAction } from "@/hooks/use-server-action";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import type { Expense } from "@/types/domain";
import { upsertExpense } from "../actions";
import { expenseSchema, type ExpenseInput } from "../schemas";

const empty = (): ExpenseInput => ({
  category: "products", label: "", amount: 0, date: format(new Date(), "yyyy-MM-dd"), supplier: "", notes: "", receipt_url: null,
});

export function ExpenseFormDialog({ open, onOpenChange, expense }: { open: boolean; onOpenChange: (o: boolean) => void; expense?: Expense | null }) {
  const { run, pending } = useServerAction();
  const form = useForm<ExpenseInput>({ resolver: zodResolver(expenseSchema), defaultValues: empty() });

  useEffect(() => {
    if (open) form.reset(expense ? { ...expense, amount: Number(expense.amount), supplier: expense.supplier ?? "", notes: expense.notes ?? "" } : empty());
  }, [open, expense, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{expense ? "Edit expense" : "Add expense"}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form
            noValidate
            className="space-y-4"
            onSubmit={form.handleSubmit((v) => run(() => upsertExpense(v, expense?.id), {
              success: expense ? "Expense updated" : "Expense added",
              onSuccess: () => onOpenChange(false),
            }))}
          >
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem><FormLabel>Amount (€)</FormLabel><FormControl><Input type="number" inputMode="decimal" step="0.01" min={0} className="h-12 text-lg" autoFocus {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" className="h-12" {...field} /></FormControl></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(EXPENSE_CATEGORIES).map(([value, meta]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => field.onChange(value)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${field.value === value ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40"}`}
                    >
                      {meta.label}
                    </button>
                  ))}
                </div>
              </FormItem>
            )} />
            <FormField control={form.control} name="label" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel><FormControl><Input placeholder="Gel restock, rent October…" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="supplier" render={({ field }) => (
              <FormItem><FormLabel>Supplier</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
            )} />
            <div className="grid grid-cols-[96px_1fr] gap-3">
              <FormField control={form.control} name="receipt_url" render={({ field }) => (
                <FormItem><FormLabel>Receipt</FormLabel><ImageUpload value={field.value} onChange={field.onChange} folder="receipts" label="Photo or PDF" allowPdf /></FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea className="h-24" {...field} value={field.value ?? ""} /></FormControl></FormItem>
              )} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" loading={pending}>{expense ? "Save changes" : "Add expense"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function ExpenseCategorySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-44 rounded-full"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All categories</SelectItem>
        {Object.entries(EXPENSE_CATEGORIES).map(([v, m]) => <SelectItem key={v} value={v}>{m.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
