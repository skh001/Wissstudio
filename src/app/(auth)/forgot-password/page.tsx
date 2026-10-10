import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { ForgotForm } from "@/features/auth/components/forgot-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <Link href="/login" className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>
      <h1 className="font-display text-4xl font-semibold">Forgot your password?</h1>
      <p className="mb-8 mt-2 text-sm text-muted-foreground">Enter your email and we&apos;ll send you a link to choose a new one.</p>
      <ForgotForm />
    </>
  );
}
