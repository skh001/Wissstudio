-- ═══════════════════════════════════════════════════════════════
-- WissNails Studio — core schema
-- Every business row belongs to one owner (auth.users.id).
-- ═══════════════════════════════════════════════════════════════
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ── Enums ───────────────────────────────────────────────────────
create type appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled');
create type payment_status     as enum ('unpaid', 'paid', 'refunded');
create type payment_method     as enum ('cash', 'card', 'transfer', 'gift_card', 'other');
create type appointment_source as enum ('dashboard', 'calendly', 'google');
create type expense_category   as enum ('products', 'furniture', 'rent', 'electricity', 'advertising',
                                         'training', 'subscriptions', 'equipment', 'miscellaneous');
create type stock_reason       as enum ('purchase', 'appointment', 'adjustment', 'loss', 'return');
create type review_source      as enum ('google', 'manual', 'instagram');
create type addon_kind         as enum ('french', 'nail_art', 'complex_art', 'strass');
create type photo_kind         as enum ('before', 'after', 'single');

-- ── Helpers ─────────────────────────────────────────────────────
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ── Salon settings (1 row per owner) ────────────────────────────
create table public.salon_settings (
  owner_id            uuid primary key references auth.users(id) on delete cascade,
  name                text not null default 'WissNails',
  owner_name          text not null default 'Wiss',
  logo_url            text,
  address             text,
  phone               text,
  email               text,
  siret               text,
  opening_hours       jsonb not null default '{
    "mon": {"open": "09:00", "close": "19:00", "closed": false},
    "tue": {"open": "09:00", "close": "19:00", "closed": false},
    "wed": {"open": "09:00", "close": "19:00", "closed": false},
    "thu": {"open": "09:00", "close": "19:00", "closed": false},
    "fri": {"open": "09:00", "close": "19:00", "closed": false},
    "sat": {"open": "09:00", "close": "17:00", "closed": false},
    "sun": {"open": "10:00", "close": "16:00", "closed": true}
  }'::jsonb,
  socials             jsonb not null default '{"instagram": "", "tiktok": "", "facebook": "", "website": ""}'::jsonb,
  currency            text not null default 'EUR',
  language            text not null default 'fr',
  theme               text not null default 'system',
  tax_rate            numeric(5,2) not null default 21.20,
  tax_label           text not null default 'URSSAF',
  vat_applicable      boolean not null default false,
  monthly_objective   numeric(10,2) not null default 2500,
  loyalty_points_per_euro numeric(5,2) not null default 1,
  loyalty_reward_threshold integer not null default 200,
  loyalty_reward_value numeric(10,2) not null default 10,
  price_french        numeric(10,2) not null default 5,
  price_nail_art      numeric(10,2) not null default 1,
  price_complex_art   numeric(10,2) not null default 1.5,
  price_strass        numeric(10,2) not null default 1,
  technicians         text[] not null default array['Wiss'],
  invoice_prefix      text not null default 'WN',
  next_invoice_number integer not null default 1,
  google_place_id     text,
  inactive_after_days integer not null default 90,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create trigger trg_salon_settings_updated before update on public.salon_settings
  for each row execute function public.set_updated_at();

-- ── Services ────────────────────────────────────────────────────
create table public.services (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name             text not null,
  description      text,
  category         text not null default 'Semi-permanent',
  price            numeric(10,2) not null check (price >= 0),
  duration_minutes integer not null default 60 check (duration_minutes > 0),
  color            text not null default '#F4A6C6',
  is_active        boolean not null default true,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on public.services(owner_id, sort_order);
create trigger trg_services_updated before update on public.services
  for each row execute function public.set_updated_at();

-- ── Clients ─────────────────────────────────────────────────────
create table public.clients (
  id                   uuid primary key default gen_random_uuid(),
  owner_id             uuid not null default auth.uid() references auth.users(id) on delete cascade,
  first_name           text not null,
  last_name            text not null default '',
  phone                text,
  email                text,
  instagram            text,
  birthday             date,
  notes                text,
  allergies            text,
  favorite_color       text,
  favorite_shape       text,
  favorite_length      text,
  favorite_style       text,
  preferred_technician text,
  avatar_url           text,
  is_favorite          boolean not null default false,
  is_vip               boolean not null default false,
  tags                 text[] not null default '{}',
  loyalty_points       integer not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index on public.clients(owner_id);
create index clients_search_idx on public.clients
  using gin ((first_name || ' ' || last_name || ' ' || coalesce(phone,'') || ' ' || coalesce(email,'') || ' ' || coalesce(instagram,'')) gin_trgm_ops);
create unique index clients_owner_email_uq on public.clients(owner_id, lower(email)) where email is not null and email <> '';
create trigger trg_clients_updated before update on public.clients
  for each row execute function public.set_updated_at();

-- ── Appointments ────────────────────────────────────────────────
create table public.appointments (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id           uuid references public.clients(id) on delete set null,
  service_id          uuid references public.services(id) on delete set null,
  start_at            timestamptz not null,
  end_at              timestamptz not null,
  status              appointment_status not null default 'confirmed',
  technician          text,
  french              boolean not null default false,
  nail_art_count      integer not null default 0 check (nail_art_count between 0 and 20),
  complex_art_count   integer not null default 0 check (complex_art_count between 0 and 20),
  strass_count        integer not null default 0 check (strass_count >= 0),
  service_price       numeric(10,2) not null default 0,
  extras_total        numeric(10,2) not null default 0,
  discount            numeric(10,2) not null default 0,
  total_price         numeric(10,2) not null default 0,
  product_cost        numeric(10,2) not null default 0,
  profit              numeric(10,2) generated always as (total_price - product_cost) stored,
  payment_status      payment_status not null default 'unpaid',
  payment_method      payment_method,
  paid_at             timestamptz,
  gift_card_id        uuid,
  notes               text,
  source              appointment_source not null default 'dashboard',
  google_event_id     text,
  calendly_event_uri  text,
  calendly_invitee_uri text,
  completed_at        timestamptz,
  cancelled_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint appointments_time_ck check (end_at > start_at)
);
create index on public.appointments(owner_id, start_at);
create index on public.appointments(client_id, start_at desc);
create unique index appointments_calendly_uq on public.appointments(calendly_event_uri);
create unique index appointments_google_uq on public.appointments(owner_id, google_event_id);
create trigger trg_appointments_updated before update on public.appointments
  for each row execute function public.set_updated_at();

-- ── Stock ───────────────────────────────────────────────────────
create table public.stock_categories (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null,
  sort_order integer not null default 0,
  unique (owner_id, name)
);

create table public.products (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category_id    uuid references public.stock_categories(id) on delete set null,
  name           text not null,
  brand          text,
  supplier       text,
  purchase_price numeric(10,2) not null default 0,  -- price for ONE unit (unit = 'unit' | 'ml' | 'g')
  unit           text not null default 'unit',
  quantity       numeric(10,2) not null default 0,
  min_quantity   numeric(10,2) not null default 0,
  barcode        text,
  location       text,
  photo_url      text,
  is_favorite    boolean not null default false,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index on public.products(owner_id, name);
create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();

-- What is consumed automatically. Either a service OR a nail-art add-on (per unit: per nail / per strass).
create table public.consumption_rules (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  service_id uuid references public.services(id) on delete cascade,
  addon      addon_kind,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity   numeric(10,3) not null check (quantity > 0),
  constraint consumption_target_ck check ((service_id is not null) <> (addon is not null))
);
create index on public.consumption_rules(owner_id, service_id);

create table public.appointment_products (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  product_id     uuid references public.products(id) on delete set null,
  product_name   text not null,
  quantity       numeric(10,3) not null,
  unit_cost      numeric(10,2) not null default 0,
  created_at     timestamptz not null default now()
);
create index on public.appointment_products(appointment_id);

create table public.stock_movements (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product_id     uuid not null references public.products(id) on delete cascade,
  delta          numeric(10,3) not null,
  reason         stock_reason not null,
  appointment_id uuid references public.appointments(id) on delete set null,
  note           text,
  created_at     timestamptz not null default now()
);
create index on public.stock_movements(product_id, created_at desc);

-- ── Finance ─────────────────────────────────────────────────────
create table public.expenses (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category    expense_category not null,
  label       text not null,
  amount      numeric(10,2) not null check (amount >= 0),
  date        date not null default current_date,
  supplier    text,
  notes       text,
  receipt_url text,
  created_at  timestamptz not null default now()
);
create index on public.expenses(owner_id, date desc);

create table public.invoices (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  appointment_id uuid unique references public.appointments(id) on delete set null,
  client_id      uuid references public.clients(id) on delete set null,
  number         text not null,
  issued_at      timestamptz not null default now(),
  items          jsonb not null default '[]'::jsonb,   -- [{label, quantity, unit_price, total}]
  subtotal       numeric(10,2) not null default 0,
  discount       numeric(10,2) not null default 0,
  total          numeric(10,2) not null default 0,
  payment_method payment_method,
  paid           boolean not null default false,
  created_at     timestamptz not null default now(),
  unique (owner_id, number)
);
create index on public.invoices(owner_id, issued_at desc);

create table public.gift_cards (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  code           text not null,
  initial_amount numeric(10,2) not null check (initial_amount > 0),
  balance        numeric(10,2) not null check (balance >= 0),
  purchaser_name text,
  recipient_name text,
  client_id      uuid references public.clients(id) on delete set null,
  expires_at     date,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  unique (owner_id, code)
);
alter table public.appointments
  add constraint appointments_gift_card_fk foreign key (gift_card_id) references public.gift_cards(id) on delete set null;

-- ── Gallery ─────────────────────────────────────────────────────
create table public.gallery_items (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id      uuid references public.clients(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  title          text,
  before_url     text,
  after_url      text not null,
  categories     text[] not null default '{}',
  is_featured    boolean not null default false,
  created_at     timestamptz not null default now()
);
create index on public.gallery_items(owner_id, created_at desc);
create index on public.gallery_items using gin (categories);

-- ── Reviews ─────────────────────────────────────────────────────
create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source      review_source not null default 'manual',
  external_id text,
  author_name text not null,
  author_photo_url text,
  rating      integer not null check (rating between 1 and 5),
  comment     text,
  review_date date not null default current_date,
  client_id   uuid references public.clients(id) on delete set null,
  created_at  timestamptz not null default now()
);
create unique index reviews_external_uq on public.reviews(owner_id, source, external_id);

-- ── Activity / notifications ────────────────────────────────────
create table public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type        text not null, -- appointment_created | appointment_completed | appointment_cancelled | payment_received | low_stock | client_created | review_added
  title       text not null,
  description text,
  entity_type text,
  entity_id   uuid,
  created_at  timestamptz not null default now()
);
create index on public.activity_log(owner_id, created_at desc);

-- ── External integrations (tokens never leave the server) ───────
create table public.integrations (
  owner_id      uuid not null references auth.users(id) on delete cascade,
  provider      text not null check (provider in ('google', 'calendly')),
  access_token  text,
  refresh_token text,
  expires_at    timestamptz,
  account_email text,
  settings      jsonb not null default '{}'::jsonb,
  connected_at  timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (owner_id, provider)
);
create trigger trg_integrations_updated before update on public.integrations
  for each row execute function public.set_updated_at();

-- ── Derived client statistics ───────────────────────────────────
create or replace view public.client_stats with (security_invoker = true) as
select
  c.id as client_id,
  c.owner_id,
  coalesce(sum(a.total_price) filter (where a.status = 'completed'), 0)::numeric(10,2) as total_spent,
  count(a.id) filter (where a.status = 'completed')::int                            as appointments_count,
  max(a.start_at) filter (where a.status = 'completed')                             as last_visit,
  min(a.start_at) filter (where a.status in ('pending','confirmed') and a.start_at > now()) as next_visit
from public.clients c
left join public.appointments a on a.client_id = c.id
group by c.id, c.owner_id;
