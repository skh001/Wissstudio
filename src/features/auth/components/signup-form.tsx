"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { signUp } from "../actions";
import { signUpSchema, type SignUpInput } from "../schemas";

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  const form = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema), defaultValues: { name: "", email: "", password: "" } });

  if (sent) {
    return (
      <div className="rounded-2xl bg-blush-50 p-6 text-center dark:bg-secondary">
        <MailCheck className="mx-auto h-8 w-8 text-primary" />
        <p className="mt-3 font-medium">Check your inbox</p>
        <p className="mt-1 text-sm text-muted-foreground">Open the confirmation link we sent to finish creating your studio.</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        noValidate
        className="space-y-5"
        onSubmit={form.handleSubmit((v) => start(async () => {
          setError(null);
          const res = await signUp(v);
          if (!res.ok) return setError(res.error);
          if (res.data.needsConfirmation) return setSent(true);
          router.replace("/dashboard");
          router.refresh();
        }))}
      >
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Your first name</FormLabel><FormControl><Input className="h-12" placeholder="Wiss" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem><FormLabel>Email</FormLabel><FormControl><Input className="h-12" type="email" autoComplete="email" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem><FormLabel>Password</FormLabel><FormControl><Input className="h-12" type="password" autoComplete="new-password" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        {error && <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-200">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={pending}>Create my studio</Button>
      </form>
    </Form>
  );
}
