import type { Metadata } from "next";
import { ResetForm } from "@/features/auth/components/reset-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="font-display text-4xl font-semibold">Choose a new password</h1>
      <p className="mb-8 mt-2 text-sm text-muted-foreground">Use at least 8 characters.</p>
      <ResetForm />
    </>
  );
}
