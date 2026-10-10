import { format, formatDistanceToNowStrict, isToday, isTomorrow } from "date-fns";
import { enGB, fr } from "date-fns/locale";

let currentLocale: "fr" | "en" = "fr";
let currentCurrency = "EUR";

/** Called once from the app shell with the salon settings (language + currency). */
export function configureFormatting(opts: { language?: string; currency?: string }) {
  if (opts.language === "en" || opts.language === "fr") currentLocale = opts.language;
  if (opts.currency) currentCurrency = opts.currency;
}

const dfLocale = () => (currentLocale === "fr" ? fr : enGB);
const intlLocale = () => (currentLocale === "fr" ? "fr-FR" : "en-GB");

export function formatCurrency(value: number | string | null | undefined, opts?: { compact?: boolean }) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat(intlLocale(), {
    style: "currency",
    currency: currentCurrency,
    maximumFractionDigits: opts?.compact ? 0 : 2,
    minimumFractionDigits: opts?.compact || Number.isInteger(n) ? 0 : 2,
  }).format(n);
}

export function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat(intlLocale(), { maximumFractionDigits: digits }).format(value);
}

export function formatPercent(value: number) {
  return `${formatNumber(value, 0)} %`;
}

export function formatDate(date: string | Date | null | undefined, pattern = "d MMM yyyy") {
  if (!date) return "—";
  return format(typeof date === "string" ? new Date(date) : date, pattern, { locale: dfLocale() });
}

export function formatTime(date: string | Date) {
  return format(typeof date === "string" ? new Date(date) : date, "HH:mm");
}

export function formatRelativeDay(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isToday(d)) return `Today, ${formatTime(d)}`;
  if (isTomorrow(d)) return `Tomorrow, ${formatTime(d)}`;
  return format(d, "EEE d MMM, HH:mm", { locale: dfLocale() });
}

export function timeAgo(date: string | Date) {
  return formatDistanceToNowStrict(typeof date === "string" ? new Date(date) : date, {
    addSuffix: true,
    locale: dfLocale(),
  });
}

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m.toString().padStart(2, "0")}` : `${h} h`;
}
