import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="font-display text-4xl font-semibold">Welcome back</h1>
      <p className="mb-8 mt-2 text-sm text-muted-foreground">Sign in to open your studio.</p>
      <Suspense>
        <LoginForm />
      </Suspense>
      {process.env.NEXT_PUBLIC_ALLOW_SIGNUP !== "false" && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          First time here? <Link href="/signup" className="font-medium text-primary hover:underline">Create your studio</Link>
        </p>
      )}
    </>
  );
}
