"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/stores/ui-store";

export const SHORTCUTS = [
  { keys: ["⌘", "K"], label: "Search everything" },
  { keys: ["N"], label: "New appointment" },
  { keys: ["C"], label: "New client" },
  { keys: ["E"], label: "Add expense" },
  { keys: ["S"], label: "Update stock" },
  { keys: ["G", "D"], label: "Go to dashboard" },
  { keys: ["G", "C"], label: "Go to calendar" },
  { keys: ["G", "A"], label: "Go to appointments" },
  { keys: ["G", "L"], label: "Go to clients" },
  { keys: ["G", "F"], label: "Go to finance" },
  { keys: ["?"], label: "Show shortcuts" },
];

const GOTO: Record<string, string> = {
  d: "/dashboard", c: "/calendar", a: "/appointments", l: "/clients", f: "/finance",
  s: "/stock", g: "/gallery", r: "/reviews", p: "/reports", t: "/settings",
};

export function useKeyboardShortcuts() {
  const router = useRouter();
  const { setCommandOpen, openQuick, setShortcutsOpen } = useUIStore();

  useEffect(() => {
    let pendingG = false;
    let timer: ReturnType<typeof setTimeout>;

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(true);
        return;
      }
      const target = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (document.querySelector("[role=dialog]")) return;

      const key = e.key.toLowerCase();
      if (pendingG) {
        pendingG = false;
        const path = GOTO[key];
        if (path) { e.preventDefault(); router.push(path); }
        return;
      }
      switch (key) {
        case "g": pendingG = true; clearTimeout(timer); timer = setTimeout(() => (pendingG = false), 900); break;
        case "n": e.preventDefault(); openQuick("appointment"); break;
        case "c": e.preventDefault(); openQuick("client"); break;
        case "e": e.preventDefault(); openQuick("expense"); break;
        case "s": e.preventDefault(); openQuick("stock"); break;
        case "?": e.preventDefault(); setShortcutsOpen(true); break;
        case "/": e.preventDefault(); setCommandOpen(true); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); clearTimeout(timer); };
  }, [router, setCommandOpen, openQuick, setShortcutsOpen]);
}
