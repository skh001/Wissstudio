"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SHORTCUTS } from "@/hooks/use-keyboard-shortcuts";
import { useUIStore } from "@/stores/ui-store";

export function ShortcutsDialog() {
  const { shortcutsOpen, setShortcutsOpen } = useUIStore();
  return (
    <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Keyboard shortcuts</DialogTitle></DialogHeader>
        <ul className="divide-y">
          {SHORTCUTS.map((s) => (
            <li key={s.label} className="flex items-center justify-between py-2.5 text-sm">
              <span>{s.label}</span>
              <span className="flex gap-1">
                {s.keys.map((k) => <kbd key={k} className="min-w-6 rounded-md border bg-muted px-1.5 py-0.5 text-center text-xs">{k}</kbd>)}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
