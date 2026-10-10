"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePassword } from "../actions";

export function ResetForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await updatePassword({ password, confirm });
          if (!res.ok) return setError(res.error);
          toast.success("Password updated");
          router.replace("/dashboard");
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="pw">New password</Label>
        <Input id="pw" type="password" autoComplete="new-password" className="h-12" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pw2">Confirm password</Label>
        <Input id="pw2" type="password" autoComplete="new-password" className="h-12" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" className="w-full" loading={pending}>Save new password</Button>
    </form>
  );
}
