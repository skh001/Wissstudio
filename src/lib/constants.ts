import type { AppointmentStatus, ExpenseCategory, PaymentMethod } from "@/types/domain";

export const REMEMBER_COOKIE = "wn_remember";
export const SESSION_ALIVE_COOKIE = "wn_alive";
export const MEDIA_BUCKET = "media";

/** Public Calendly booking page, embedded on /booking. */
export const CALENDLY_URL = process.env.NEXT_PUBLIC_CALENDLY_URL || "https://calendly.com/wissnails00/wissnails";
export const CALENDLY_EMBED_URL = `${CALENDLY_URL}?hide_event_type_details=1&hide_gdpr_banner=1`;

export const STATUS_META: Record<AppointmentStatus, { label: string; color: string; text: string; badge: string }> = {
  confirmed: { label: "Confirmed", color: "#F4A6C6", text: "#6B2342", badge: "bg-pink-100 text-pink-800 dark:bg-pink-500/15 dark:text-pink-200" },
  pending: { label: "Pending", color: "#F5D77A", text: "#5C4A0B", badge: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200" },
  completed: { label: "Completed", color: "#8FD3A8", text: "#174A2A", badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200" },
  cancelled: { label: "Cancelled", color: "#EE8F8F", text: "#5E1616", badge: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-200" },
};

export const PAYMENT_METHODS: Record<PaymentMethod, string> = {
  card: "Card",
  cash: "Cash",
  transfer: "Bank transfer",
  gift_card: "Gift card",
  other: "Other",
};

export const EXPENSE_CATEGORIES: Record<ExpenseCategory, { label: string; color: string }> = {
  products: { label: "Products", color: "#B76E79" },
  furniture: { label: "Furniture", color: "#D9A3AB" },
  rent: { label: "Rent", color: "#7A434D" },
  electricity: { label: "Electricity", color: "#EBD3BC" },
  advertising: { label: "Advertising", color: "#F4A6C6" },
  training: { label: "Training", color: "#C9B6E4" },
  subscriptions: { label: "Subscriptions", color: "#A8C8E8" },
  equipment: { label: "Equipment", color: "#8FD3A8" },
  miscellaneous: { label: "Miscellaneous", color: "#CFC4C8" },
};

export const GALLERY_CATEGORIES = [
  "Wedding", "French", "Luxury", "Short", "Long", "Babyboomer",
  "Halloween", "Christmas", "Summer", "Spring",
] as const;

export const NAIL_SHAPES = ["Amande", "Carré", "Carré arrondi", "Ovale", "Coffin", "Stiletto", "Ballerine"];
export const NAIL_LENGTHS = ["Court", "Moyen", "Long", "Extra long"];
export const NAIL_STYLES = ["Classique", "Minimaliste", "French", "Babyboomer", "Nail art", "Luxe", "Cute"];

export const CHART_COLORS = ["#B76E79", "#F4A6C6", "#EBD3BC", "#D9A3AB", "#7A434D", "#C9B6E4", "#8FD3A8"];
