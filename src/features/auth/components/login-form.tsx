"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { signIn } from "../actions";
import { signInSchema, type SignInInput } from "../schemas";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(params.get("error") === "link" ? "This link has expired. Request a new one." : null);
  const [show, setShow] = useState(false);
  const [pending, start] = useTransition();
  const form = useForm<SignInInput>({ resolver: zodResolver(signInSchema), defaultValues: { email: "", password: "", remember: true } });

  const onSubmit = form.handleSubmit((values) =>
    start(async () => {
      setError(null);
      const res = await signIn(values);
      if (!res.ok) return setError(res.error);
      const next = params.get("next");
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
      router.refresh();
    }),
  );

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl><Input type="email" autoComplete="email" placeholder="wiss@wissnails.fr" className="h-12" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>Password</FormLabel>
              <Link href="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
            </div>
            <div className="relative">
              <FormControl><Input type={show ? "text" : "password"} autoComplete="current-password" className="h-12 pr-11" {...field} /></FormControl>
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={show ? "Hide password" : "Show password"}>
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="remember" render={({ field }) => (
          <FormItem className="flex items-center gap-2.5 space-y-0">
            <FormControl><Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} /></FormControl>
            <FormLabel className="font-normal text-muted-foreground">Keep me signed in</FormLabel>
          </FormItem>
        )} />
        {error && <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-200">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={pending}>Sign in</Button>
      </form>
    </Form>
  );
}
