"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, PackagePlus, ReceiptEuro, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency, formatDate } from "@/lib/format";
import { useUIStore } from "@/stores/ui-store";

function greeting(h: number) {
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardHero({ name, todayCount, expected, nextAt }: { name: string; todayCount: number; expected: number; nextAt: string | null }) {
  const openQuick = useUIStore((s) => s.openQuick);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  const summary =
    todayCount === 0
      ? "No appointments today — a good day to restock and plan."
      : `${todayCount} appointment${todayCount > 1 ? "s" : ""} today${expected > 0 ? ` · ${formatCurrency(expected)} still to come` : ""}${nextAt ? ` · next at ${nextAt}` : ""}.`;

  const actions = [
    { label: "New appointment", icon: CalendarPlus, onClick: () => openQuick("appointment") },
    { label: "New client", icon: UserPlus, onClick: () => openQuick("client") },
    { label: "Add expense", icon: ReceiptEuro, onClick: () => openQuick("expense") },
    { label: "Update stock", icon: PackagePlus, onClick: () => openQuick("stock") },
  ];

  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-lacquer px-6 py-8 text-plum shadow-soft dark:bg-lacquer-dark dark:text-blush-100 sm:px-10 sm:py-10">
      {/* glossy highlight, like light on fresh top coat */}
      <motion.div
        aria-hidden
        initial={{ x: "-30%", opacity: 0 }}
        animate={{ x: "0%", opacity: 1 }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none absolute -top-24 left-1/3 h-72 w-[38rem] -rotate-12 rounded-full bg-white/40 blur-2xl dark:bg-white/5"
      />
      <div className="relative">
        <p className="text-sm text-plum/70 dark:text-blush-100/70">{now ? formatDate(now, "EEEE d MMMM") : "\u00a0"}</p>
        <h1 className="mt-1 font-display text-[2.6rem] font-semibold leading-[1] sm:text-6xl">
          {now ? greeting(now.getHours()) : "Hello"} {name} 🌸
        </h1>
        <p className="mt-3 max-w-xl text-[15px] text-plum/80 dark:text-blush-100/80">{summary}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {actions.map((a, i) => (
            <button
              key={a.label}
              onClick={a.onClick}
              className={
                i === 0
                  ? "inline-flex h-10 items-center gap-2 rounded-full bg-plum px-4 text-sm font-medium text-white shadow-soft transition hover:bg-plum/90 dark:bg-blush-200 dark:text-plum"
                  : "inline-flex h-10 items-center gap-2 rounded-full bg-white/60 px-4 text-sm text-plum backdrop-blur transition hover:bg-white/85 dark:bg-white/10 dark:text-blush-100 dark:hover:bg-white/15"
              }
            >
              <a.icon className="h-4 w-4" />
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
