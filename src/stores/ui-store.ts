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
  /** Per device: play a sound (and vibrate on phones) when a booking arrives or is cancelled. */
  soundEnabled: boolean;
  /** Per device: also show a system notification when the app is in the background. */
  browserNotifications: boolean;
  toggleSidebar: () => void;
  setCommandOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  openQuick: (dialog: Exclude<QuickDialog, null>, draft?: UIState["appointmentDraft"]) => void;
  closeQuick: () => void;
  markNotificationsSeen: () => void;
  setSoundEnabled: (on: boolean) => void;
  setBrowserNotifications: (on: boolean) => void;
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
      soundEnabled: true,
      browserNotifications: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setCommandOpen: (commandOpen) => set({ commandOpen }),
      setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
      openQuick: (quickDialog, draft = null) => set({ quickDialog, appointmentDraft: draft, commandOpen: false }),
      closeQuick: () => set({ quickDialog: null, appointmentDraft: null }),
      markNotificationsSeen: () => set({ notificationsSeenAt: new Date().toISOString() }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setBrowserNotifications: (browserNotifications) => set({ browserNotifications }),
    }),
    {
      name: "wissnails-ui",
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed, notificationsSeenAt: s.notificationsSeenAt,
        soundEnabled: s.soundEnabled, browserNotifications: s.browserNotifications,
      }),
    },
  ),
);

// Keep preferences identical in every open tab (a change in one tab is written to localStorage).
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "wissnails-ui") void useUIStore.persist.rehydrate();
  });
}
