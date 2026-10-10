"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type QuickDialog = "appointment" | "client" | "expense" | "stock" | null;

interface UIState {
  sidebarCollapsed: boolean;
  commandOpen: boolean;
  shortcutsOpen: boolean;
  quickDialog: QuickDialog;
  /** Prefill for the appointment dialog (calendar click, duplicate, client profile…) */
  appointmentDraft: { start?: string; clientId?: string; duplicateOf?: string; editId?: string } | null;
  notificationsSeenAt: string | null;
  toggleSidebar: () => void;
  setCommandOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  openQuick: (dialog: Exclude<QuickDialog, null>, draft?: UIState["appointmentDraft"]) => void;
  closeQuick: () => void;
  markNotificationsSeen: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      commandOpen: false,
      shortcutsOpen: false,
      quickDialog: null,
      appointmentDraft: null,
      notificationsSeenAt: null,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setCommandOpen: (commandOpen) => set({ commandOpen }),
      setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
      openQuick: (quickDialog, draft = null) => set({ quickDialog, appointmentDraft: draft, commandOpen: false }),
      closeQuick: () => set({ quickDialog: null, appointmentDraft: null }),
      markNotificationsSeen: () => set({ notificationsSeenAt: new Date().toISOString() }),
    }),
    {
      name: "wissnails-ui",
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed, notificationsSeenAt: s.notificationsSeenAt }),
    },
  ),
);
