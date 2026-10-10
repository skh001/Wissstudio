"use client";

import { useState, useTransition } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "../actions";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (sent) {
    return (
      <div className="rounded-2xl bg-blush-50 p-6 text-center dark:bg-secondary">
        <MailCheck className="mx-auto h-8 w-8 text-primary" />
        <p className="mt-3 font-medium">Check your inbox</p>
        <p className="mt-1 text-sm text-muted-foreground">If an account exists for {email}, a reset link is on its way.</p>
      </div>
    );
  }
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await requestPasswordReset({ email });
          if (!res.ok) setError(res.error); else setSent(true);
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required autoComplete="email" className="h-12" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" className="w-full" loading={pending}>Send reset link</Button>
    </form>
  );
}
