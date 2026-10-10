import { LogoMark } from "@/components/shared/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-lacquer p-12 lg:flex lg:flex-col lg:justify-between dark:bg-lacquer-dark">
        <div className="pointer-events-none absolute -right-24 top-1/4 h-[28rem] w-[28rem] rounded-full bg-white/30 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <LogoMark className="h-11 w-11" />
          <span className="font-display text-2xl font-semibold text-plum">WissNails Studio</span>
        </div>
        <div className="relative max-w-md">
          <p className="font-display text-6xl font-semibold leading-[0.95] text-plum">
            Every set,<br />every client,<br />beautifully kept.
          </p>
          <p className="mt-6 text-base text-plum/70">
            Your appointments, clients, stock and earnings in one calm place.
          </p>
        </div>
        <p className="relative text-xs text-plum/60">© {new Date().getFullYear()} WissNails</p>
      </aside>
      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <LogoMark />
            <span className="font-display text-2xl font-semibold">WissNails Studio</span>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
