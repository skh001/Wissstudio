// Domain types mirroring supabase/migrations. Run `npm run db:types` to generate the raw DB types too.

export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled";
export type PaymentStatus = "unpaid" | "paid" | "refunded";
export type PaymentMethod = "cash" | "card" | "transfer" | "gift_card" | "other";
export type AppointmentSource = "dashboard" | "calendly" | "google";
export type ExpenseCategory =
  | "products" | "furniture" | "rent" | "electricity" | "advertising"
  | "training" | "subscriptions" | "equipment" | "miscellaneous";
export type StockReason = "purchase" | "appointment" | "adjustment" | "loss" | "return";
export type ReviewSource = "google" | "manual" | "instagram";
export type AddonKind = "french" | "nail_art" | "complex_art" | "strass";

export interface OpeningDay { open: string; close: string; closed: boolean }
export type OpeningHours = Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", OpeningDay>;

export interface SalonSettings {
  owner_id: string;
  name: string;
  owner_name: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  siret: string | null;
  opening_hours: OpeningHours;
  socials: { instagram?: string; tiktok?: string; facebook?: string; website?: string };
  currency: string;
  language: "fr" | "en";
  theme: "light" | "dark" | "system";
  tax_rate: number;
  tax_label: string;
  vat_applicable: boolean;
  monthly_objective: number;
  loyalty_points_per_euro: number;
  loyalty_reward_threshold: number;
  loyalty_reward_value: number;
  price_french: number;
  price_nail_art: number;
  price_complex_art: number;
  price_strass: number;
  technicians: string[];
  invoice_prefix: string;
  next_invoice_number: number;
  google_place_id: string | null;
  inactive_after_days: number;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  duration_minutes: number;
  color: string;
  is_active: boolean;
  sort_order: number;
}

export interface Client {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  birthday: string | null;
  notes: string | null;
  allergies: string | null;
  favorite_color: string | null;
  favorite_shape: string | null;
  favorite_length: string | null;
  favorite_style: string | null;
  preferred_technician: string | null;
  avatar_url: string | null;
  is_favorite: boolean;
  is_vip: boolean;
  tags: string[];
  loyalty_points: number;
  created_at: string;
}

export interface ClientStats {
  client_id: string;
  total_spent: number;
  appointments_count: number;
  last_visit: string | null;
  next_visit: string | null;
}

export type ClientWithStats = Client & { stats: ClientStats };

export interface Appointment {
  id: string;
  client_id: string | null;
  service_id: string | null;
  start_at: string;
  end_at: string;
  status: AppointmentStatus;
  technician: string | null;
  french: boolean;
  nail_art_count: number;
  complex_art_count: number;
  strass_count: number;
  service_price: number;
  extras_total: number;
  discount: number;
  total_price: number;
  product_cost: number;
  profit: number;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  paid_at: string | null;
  gift_card_id: string | null;
  notes: string | null;
  source: AppointmentSource;
  google_event_id: string | null;
  calendly_event_uri: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

export type AppointmentWithRelations = Appointment & {
  client: Pick<Client, "id" | "first_name" | "last_name" | "phone" | "avatar_url" | "is_vip"> | null;
  service: Pick<Service, "id" | "name" | "color" | "duration_minutes"> | null;
};

export interface StockCategory { id: string; name: string; sort_order: number }

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  brand: string | null;
  supplier: string | null;
  purchase_price: number;
  unit: string;
  quantity: number;
  min_quantity: number;
  barcode: string | null;
  location: string | null;
  photo_url: string | null;
  is_favorite: boolean;
  notes: string | null;
  updated_at: string;
}

export type ProductWithCategory = Product & { category: Pick<StockCategory, "id" | "name"> | null };

export interface ConsumptionRule {
  id: string;
  service_id: string | null;
  addon: AddonKind | null;
  product_id: string;
  quantity: number;
  product?: Pick<Product, "id" | "name" | "unit"> | null;
}

export interface StockMovement {
  id: string;
  product_id: string;
  delta: number;
  reason: StockReason;
  appointment_id: string | null;
  note: string | null;
  created_at: string;
}

export interface AppointmentProduct {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_cost: number;
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  label: string;
  amount: number;
  date: string;
  supplier: string | null;
  notes: string | null;
  receipt_url: string | null;
}

export interface InvoiceItem { label: string; quantity: number; unit_price: number; total: number }

export interface Invoice {
  id: string;
  appointment_id: string | null;
  client_id: string | null;
  number: string;
  issued_at: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  total: number;
  payment_method: PaymentMethod | null;
  paid: boolean;
  client?: Pick<Client, "id" | "first_name" | "last_name" | "email" | "phone"> | null;
}

export interface GiftCard {
  id: string;
  code: string;
  initial_amount: number;
  balance: number;
  purchaser_name: string | null;
  recipient_name: string | null;
  client_id: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface GalleryItem {
  id: string;
  client_id: string | null;
  appointment_id: string | null;
  title: string | null;
  before_url: string | null;
  after_url: string;
  categories: string[];
  is_featured: boolean;
  created_at: string;
  client?: Pick<Client, "id" | "first_name" | "last_name"> | null;
}

export interface Review {
  id: string;
  source: ReviewSource;
  author_name: string;
  author_photo_url: string | null;
  rating: number;
  comment: string | null;
  review_date: string;
  client_id: string | null;
}

export interface Activity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

export interface IntegrationStatus {
  provider: "google" | "calendly";
  account_email: string | null;
  connected_at: string;
  settings: Record<string, unknown>;
}
