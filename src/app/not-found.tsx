import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/shared/logo";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <LogoMark className="mx-auto h-14 w-14" />
        <h1 className="mt-6 font-display text-5xl font-semibold">Page not found</h1>
        <p className="mt-2 text-muted-foreground">This page doesn&apos;t exist or was moved.</p>
        <Button asChild className="mt-6"><Link href="/dashboard">Back to dashboard</Link></Button>
      </div>
    </main>
  );
}
