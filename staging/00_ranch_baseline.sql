-- STAGING ONLY. Apply to a new, empty, independently identified Supabase project.
-- Never add this file to supabase/migrations or apply it to production.
-- Reconstructed from read-only production catalog metadata on 2026-11-02.
-- No production users, reservation rows, contact details or credentials are copied.
begin;

create extension if not exists btree_gist with schema extensions;

-- A defense-in-depth sentinel: the integration runner refuses a database
-- without this exact staging-only marker before creating any test identity.
create table public.ranch_staging_marker (id text primary key);
alter table public.ranch_staging_marker enable row level security;
revoke all on public.ranch_staging_marker from public, anon, authenticated;
grant select on public.ranch_staging_marker to service_role;
insert into public.ranch_staging_marker(id) values ('WHITE_OAK_STAGING_ONLY_2026');

create table public.ranch_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'staff')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.ranch_units (
  id text primary key,
  stay_type text not null check (stay_type in ('Tent Site', 'RV Site', 'Small Rental RV', 'Large Rental RV')),
  unique (id, stay_type)
);

create table public.ranch_reservations (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null check (char_length(btrim(guest_name)) between 1 and 200),
  phone text check (phone is null or char_length(phone) <= 40),
  unit text not null,
  stay_type text not null,
  rv_service text,
  arrival date not null,
  departure date not null check (departure > arrival),
  guests smallint not null default 1 check (guests > 0),
  atv_access boolean not null default false,
  nightly_rate numeric(10,2) not null check (nightly_rate >= 0),
  nights integer generated always as (departure - arrival) stored,
  total numeric(10,2) not null check (total >= 0),
  status text not null default 'CONFIRMED'
    check (status in ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED')),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ranch_reservations_unit_stay_type_fkey foreign key (unit, stay_type)
    references public.ranch_units(id, stay_type),
  constraint ranch_capacity check (
    (stay_type = 'Tent Site' and guests <= 6) or
    (stay_type = 'Small Rental RV' and guests <= 5) or
    (stay_type = 'Large Rental RV' and guests <= 8) or stay_type = 'RV Site'
  ),
  constraint ranch_rv_service check (
    (stay_type = 'RV Site' and rv_service is not null
      and rv_service in ('Parking Only', 'Electric + Water', 'Deluxe'))
    or (stay_type <> 'RV Site' and rv_service is null)
  ),
  constraint ranch_standard_rate check (nightly_rate = case
    when stay_type = 'Tent Site' then 25
    when stay_type = 'Small Rental RV' then 75
    when stay_type = 'Large Rental RV' then 99
    when rv_service = 'Parking Only' then 25
    when rv_service = 'Electric + Water' then 40
    when rv_service = 'Deluxe' then 50
  end),
  -- Deliberately the pre-weekly rule; apply the reviewed weekly migration next.
  constraint ranch_total_matches check (
    total = nightly_rate * (departure - arrival) + case when atv_access then 75 else 0 end
  ),
  constraint ranch_no_overlapping_stays exclude using gist
    (unit with =, daterange(arrival, departure, '[)') with &&)
    where (status in ('PENDING', 'CONFIRMED', 'CHECKED_IN'))
);

create index ranch_reservations_created_by_idx on public.ranch_reservations(created_by);
create index ranch_reservations_unit_stay_type_idx on public.ranch_reservations(unit, stay_type);

create function public.ranch_check_reservation_update() returns trigger
language plpgsql set search_path = '' as $function$
begin
  if new.status = 'CHECKED_IN' and old.status <> new.status and not (
    new.arrival <= (current_timestamp at time zone 'America/Chicago')::date and
    new.departure > (current_timestamp at time zone 'America/Chicago')::date
  ) then
    raise exception 'Check-in requires a current reserved stay' using errcode = '23514';
  end if;
  if new.status <> old.status and not (
    (old.status = 'PENDING' and new.status in ('CONFIRMED', 'CANCELLED')) or
    (old.status = 'CONFIRMED' and new.status in ('CHECKED_IN', 'CANCELLED')) or
    (old.status = 'CHECKED_IN' and new.status = 'COMPLETED')
  ) then
    raise exception 'Reservation status transition is not allowed' using errcode = '23514';
  end if;
  new.updated_at := now();
  return new;
end;
$function$;
create trigger ranch_reservation_update before update on public.ranch_reservations
  for each row execute function public.ranch_check_reservation_update();

alter table public.ranch_staff enable row level security;
alter table public.ranch_units enable row level security;
alter table public.ranch_reservations enable row level security;
revoke all on public.ranch_staff, public.ranch_units, public.ranch_reservations from public, anon, authenticated;
grant select on public.ranch_staff, public.ranch_units, public.ranch_reservations to authenticated;
grant all on public.ranch_staff, public.ranch_units, public.ranch_reservations to service_role;

create policy ranch_staff_read_own on public.ranch_staff for select to authenticated
  using (user_id = (select auth.uid()));
create policy ranch_units_staff on public.ranch_units for select to authenticated
  using (exists (select 1 from public.ranch_staff s where s.user_id = (select auth.uid()) and s.active));
create policy ranch_reservations_staff_read on public.ranch_reservations for select to authenticated
  using (exists (select 1 from public.ranch_staff s where s.user_id = (select auth.uid()) and s.active));
create policy ranch_reservations_staff_create on public.ranch_reservations for insert to authenticated
  with check (created_by = (select auth.uid()) and status in ('PENDING', 'CONFIRMED')
    and exists (select 1 from public.ranch_staff s where s.user_id = (select auth.uid()) and s.active));
create policy ranch_reservations_staff_update on public.ranch_reservations for update to authenticated
  using (exists (select 1 from public.ranch_staff s where s.user_id = (select auth.uid()) and s.active))
  with check (exists (select 1 from public.ranch_staff s where s.user_id = (select auth.uid()) and s.active));

insert into public.ranch_units(id, stay_type) values
  ('Large Rental RV','Large Rental RV'), ('Small Rental RV','Small Rental RV'),
  ('RV 01','RV Site'), ('RV 02','RV Site'), ('RV 03','RV Site'),
  ('RV 04','RV Site'), ('RV 05','RV Site'), ('RV 06','RV Site'),
  ('RV 07','RV Site'), ('RV 08','RV Site'), ('RV 09','RV Site'),
  ('RV 10','RV Site'), ('RV 11','RV Site'),
  ('Tent 01','Tent Site'), ('Tent 02','Tent Site'), ('Tent 03','Tent Site'),
  ('Tent 04','Tent Site'), ('Tent 05','Tent Site'), ('Tent 06','Tent Site'),
  ('Tent 07','Tent Site'), ('Tent 08','Tent Site'), ('Tent 09','Tent Site'),
  ('Tent 10','Tent Site');

commit;
