import Link from "next/link";
import type { Metadata } from "next";
import { SignupForm } from "@/features/auth/components/signup-form";

export const metadata: Metadata = { title: "Create your studio" };

export default function SignupPage() {
  return (
    <>
      <h1 className="font-display text-4xl font-semibold">Create your studio</h1>
      <p className="mb-8 mt-2 text-sm text-muted-foreground">Your 10 services and stock categories are added automatically.</p>
      <SignupForm />
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account? <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
      </p>
    </>
  );
}
