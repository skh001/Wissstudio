"use client";

import { useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";
import { formatCurrency, formatNumber } from "@/lib/format";

export type CounterFormat = "currency" | "number" | "percent" | "decimal";

const fmt = (v: number, f: CounterFormat) =>
  f === "currency" ? formatCurrency(v, { compact: Math.abs(v) >= 1000 })
  : f === "percent" ? `${formatNumber(v)} %`
  : f === "decimal" ? formatNumber(v, 1)
  : formatNumber(v);

export function AnimatedCounter({ value, format = "number", className }: { value: number; format?: CounterFormat; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!inView || reduce) { node.textContent = fmt(value, format); return; }
    const controls = animate(0, value, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => { node.textContent = fmt(format === "currency" || format === "decimal" ? v : Math.round(v), format); },
    });
    return () => controls.stop();
  }, [value, format, inView, reduce]);

  return <span ref={ref} className={className}>{fmt(value, format)}</span>;
}
