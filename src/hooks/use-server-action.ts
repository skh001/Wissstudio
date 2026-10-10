"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/action";

/**
 * Runs a server action with a pending state, toasts, router refresh and React Query invalidation.
 * Every mutation in the app goes through this hook so feedback is consistent everywhere.
 */
export function useServerAction() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const queryClient = useQueryClient();

  function run<T>(
    action: () => Promise<ActionResult<T>>,
    opts: { success?: string; onSuccess?: (data: T) => void; refresh?: boolean } = {},
  ) {
    return new Promise<T | null>((resolve) => {
      startTransition(async () => {
        const res = await action();
        if (!res.ok) {
          toast.error(res.error);
          resolve(null);
          return;
        }
        if (opts.success) toast.success(opts.success);
        opts.onSuccess?.(res.data);
        if (opts.refresh !== false) router.refresh();
        void queryClient.invalidateQueries();
        resolve(res.data);
      });
    });
  }

  return { run, pending };
}
