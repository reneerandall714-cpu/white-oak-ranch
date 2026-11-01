begin;

-- Needed for equality comparisons on UUIDs inside the exclusion constraint.
create extension if not exists btree_gist;

create type public.camping_unit_type as enum (
  'RV_SITE',
  'TENT_SITE',
  'RENTAL_RV'
);

create type public.reservation_status as enum (
  'PENDING',
  'CONFIRMED',
  'CHECKED_IN',
  'COMPLETED',
  'CANCELLED'
);

create table public.camping_units (
  id uuid primary key default gen_random_uuid(),

  -- Stable machine-readable identifier.
  code text not null unique,

  -- Existing app-facing names retained for migration and display mapping.
  legacy_name text not null unique,
  display_name text not null,

  unit_type public.camping_unit_type not null,
  active boolean not null default true,

  capacity_min integer,
  capacity_max integer,

  full_hookup_capable boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint camping_units_capacity_valid check (
    capacity_min is null
    or capacity_min >= 1
  ),

  constraint camping_units_capacity_range_valid check (
    capacity_max is null
    or (
      capacity_max >= 1
      and (
        capacity_min is null
        or capacity_max >= capacity_min
      )
    )
  )
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),

  guest_name text not null,
  phone text,

  camping_unit_id uuid not null
    references public.camping_units(id)
    on update cascade
    on delete restrict,

  arrival_date date not null,
  departure_date date not null,

  -- Half-open range: [arrival, departure).
  -- A guest departing on October 12 does not block a guest arriving October 12.
  stay_range daterange generated always as (
    daterange(arrival_date, departure_date, '[)')
  ) stored,

  guests integer,
  atv_access boolean not null default false,

  -- Matches the current reservation choices while remaining independent
  -- of display labels and future pricing changes.
  rv_service_key text,

  -- Historical price snapshots for this reservation.
  nightly_rate numeric(10, 2),
  nights integer not null,
  total numeric(10, 2),

  status public.reservation_status not null default 'PENDING',

  -- Nullable until staff authentication is introduced.
  created_by uuid references auth.users(id)
    on update cascade
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Used later for optimistic concurrency control.
  version integer not null default 1,

  constraint reservations_dates_valid check (
    departure_date > arrival_date
  ),

  constraint reservations_nights_match_dates check (
    nights = (departure_date - arrival_date)
  ),

  constraint reservations_guests_valid check (
    guests is null or guests >= 1
  ),

  constraint reservations_rv_service_valid check (
    rv_service_key is null
    or rv_service_key in (
      'parking_only',
      'electric_water',
      'deluxe'
    )
  ),

  constraint reservations_nightly_rate_valid check (
    nightly_rate is null or nightly_rate >= 0
  ),

  constraint reservations_total_valid check (
    total is null or total >= 0
  ),

  constraint reservations_version_valid check (
    version >= 1
  ),

  -- PENDING, CONFIRMED, and CHECKED_IN reservations block inventory.
  -- COMPLETED and CANCELLED reservations do not.
  constraint reservations_no_overlapping_active_stays
    exclude using gist (
      camping_unit_id with =,
      stay_range with &&
    )
    where (
      status in (
        'PENDING',
        'CONFIRMED',
        'CHECKED_IN'
      )
    )
);

comment on column public.reservations.total is
  'Historical price snapshot. Server-side validation that total matches the rate, nights, fees, and discounts will be added later.';

comment on column public.reservations.status is
  'Pending-reservation expiration and release of abandoned holds will be implemented server-side in a later phase.';

create index reservations_unit_id_idx
  on public.reservations (camping_unit_id);

create index reservations_arrival_date_idx
  on public.reservations (arrival_date);

create index reservations_status_idx
  on public.reservations (status);

create index reservations_stay_range_idx
  on public.reservations using gist (stay_range);

-- RV sites: existing app names are "RV 01" through "RV 11".
insert into public.camping_units (
  code,
  legacy_name,
  display_name,
  unit_type,
  capacity_min,
  capacity_max,
  full_hookup_capable
)
select
  format('RV-%s', lpad(site_number::text, 2, '0')),
  format('RV %s', lpad(site_number::text, 2, '0')),
  format('RV Site %s', lpad(site_number::text, 2, '0')),
  'RV_SITE',
  null,
  null,
  true
from generate_series(1, 11) as units(site_number)
on conflict (code) do nothing;

-- Tent sites: existing app names are "Tent 01" through "Tent 10".
insert into public.camping_units (
  code,
  legacy_name,
  display_name,
  unit_type,
  capacity_min,
  capacity_max,
  full_hookup_capable
)
select
  format('TENT-%s', lpad(site_number::text, 2, '0')),
  format('Tent %s', lpad(site_number::text, 2, '0')),
  format('Tent Site %s', lpad(site_number::text, 2, '0')),
  'TENT_SITE',
  1,
  6,
  false
from generate_series(1, 10) as units(site_number)
on conflict (code) do nothing;

-- Rental RVs: preserve the existing app names exactly.
insert into public.camping_units (
  code,
  legacy_name,
  display_name,
  unit_type,
  capacity_min,
  capacity_max,
  full_hookup_capable
)
values
  (
    'RENTAL-RV-SMALL',
    'Small Rental RV',
    'Small Rental RV',
    'RENTAL_RV',
    4,
    5,
    false
  ),
  (
    'RENTAL-RV-LARGE',
    'Large Rental RV',
    'Large Rental RV',
    'RENTAL_RV',
    6,
    8,
    false
  )
on conflict (code) do nothing;

-- RLS is enabled with no policies yet. This denies access through the
-- Supabase API until staff authentication and role policies are added.
alter table public.camping_units enable row level security;
alter table public.reservations enable row level security;

commit;
