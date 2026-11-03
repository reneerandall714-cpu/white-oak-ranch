-- REVIEW ONLY. Do not apply until the owner approves the intake and staff
-- decision workflow. Pending requests do not hold inventory. No payment or
-- notification is sent by this migration. Do not run supabase db push.
begin;

create schema ranch_booking_private;
revoke all on schema ranch_booking_private from public;
grant usage on schema ranch_booking_private to anon, authenticated;

create table public.ranch_booking_requests (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null unique,
  guest_name text not null check (char_length(btrim(guest_name)) between 1 and 200),
  email text check (email is null or char_length(email) <= 254),
  phone text check (phone is null or char_length(phone) between 7 and 15),
  note text check (note is null or char_length(note) <= 1000),
  unit text not null,
  stay_type text not null,
  rv_service text,
  arrival date not null,
  departure date not null,
  guests smallint not null,
  atv_access boolean not null,
  nightly_rate numeric(10, 2) not null check (nightly_rate >= 0),
  quoted_total numeric(10, 2) not null check (quoted_total >= 0),
  status text not null default 'PENDING'
    check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  submitted_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users(id),
  decision_note text check (decision_note is null or char_length(decision_note) <= 500),
  reservation_id uuid unique references public.ranch_reservations(id),
  constraint ranch_booking_request_contact check (email is not null or phone is not null),
  constraint ranch_booking_request_dates check (departure > arrival),
  constraint ranch_booking_request_unit_type
    foreign key (unit, stay_type) references public.ranch_units(id, stay_type),
  constraint ranch_booking_request_service check (
    (stay_type = 'RV Site' and rv_service is not null
      and rv_service in ('Parking Only', 'Electric + Water', 'Deluxe'))
    or (stay_type <> 'RV Site' and rv_service is null)
  ),
  constraint ranch_booking_request_capacity check (
    (stay_type = 'Tent Site' and guests between 1 and 6)
    or (stay_type = 'Small Rental RV' and guests between 1 and 5)
    or (stay_type = 'Large Rental RV' and guests between 1 and 8)
    or (stay_type = 'RV Site' and guests between 1 and 8)
  ),
  constraint ranch_booking_request_decision check (
    (status = 'PENDING' and decided_at is null and decided_by is null and reservation_id is null)
    or (status = 'REJECTED' and decided_at is not null and decided_by is not null and reservation_id is null)
    or (status = 'APPROVED' and decided_at is not null and decided_by is not null and reservation_id is not null)
  )
);

create index ranch_booking_requests_inbox_idx
  on public.ranch_booking_requests (status, submitted_at desc);
create index ranch_booking_requests_recent_idx
  on public.ranch_booking_requests (submitted_at desc);
create index ranch_booking_requests_email_limit_idx
  on public.ranch_booking_requests (email, submitted_at desc) where email is not null;
create index ranch_booking_requests_phone_limit_idx
  on public.ranch_booking_requests (phone, submitted_at desc) where phone is not null;

alter table public.ranch_booking_requests enable row level security;
revoke all on table public.ranch_booking_requests from public, anon, authenticated;
grant select on table public.ranch_booking_requests to authenticated;
create policy ranch_booking_requests_staff_read
  on public.ranch_booking_requests for select to authenticated
  using (
    (select auth.uid()) is not null and exists (
      select 1 from public.ranch_staff s
      where s.user_id = (select auth.uid()) and s.active
    )
  );

-- Same standard rates and Deluxe-only weekly formula as ranch_reservations.
-- This function cannot write anything and is not exposed to API roles.
create function ranch_booking_private.quote(
  p_stay_type text, p_rv_service text, p_arrival date,
  p_departure date, p_atv_access boolean
)
returns table (nightly_rate numeric, total numeric)
language sql immutable security invoker set search_path = ''
as $function$
  select q.rate,
    (case when p_stay_type = 'RV Site' and p_rv_service = 'Deluxe'
      then ((p_departure - p_arrival) / 7) * 200
        + ((p_departure - p_arrival) % 7) * q.rate
      else (p_departure - p_arrival) * q.rate
    end) + (case when p_atv_access then 75 else 0 end)
  from (
    select case
      when p_stay_type = 'Tent Site' then 25::numeric
      when p_stay_type = 'Small Rental RV' then 75::numeric
      when p_stay_type = 'Large Rental RV' then 99::numeric
      when p_rv_service = 'Parking Only' then 25::numeric
      when p_rv_service = 'Electric + Water' then 40::numeric
      when p_rv_service = 'Deluxe' then 50::numeric
      else null::numeric
    end as rate
  ) q;
$function$;
revoke all on function ranch_booking_private.quote(text, text, date, date, boolean)
  from public, anon, authenticated;

-- The public API has no request-table grant. This bounded definer is the only
-- anonymous write path. A transaction advisory lock serializes the small
-- launch-volume rate limits and idempotency-key check.
create function ranch_booking_private.submit_internal(
  p_idempotency_key uuid, p_guest_name text, p_email text, p_phone text,
  p_note text, p_unit text, p_stay_type text, p_rv_service text,
  p_arrival date, p_departure date, p_guests integer, p_atv_access boolean
)
returns table(request_id uuid, request_status text, quoted_total numeric)
language plpgsql volatile security definer set search_path = ''
as $function$
declare
  v_name text;
  v_email text;
  v_phone_input text;
  v_phone text;
  v_note text;
  v_unit text;
  v_stay_type text;
  v_service text;
  v_existing public.ranch_booking_requests%rowtype;
  v_rate numeric;
  v_total numeric;
begin
  if p_idempotency_key is null then
    raise exception 'A request key is required' using errcode = 'WR400';
  end if;
  -- Bound raw inputs before normalization, including whitespace-only and
  -- invalid attempts. The client limits are not an authorization boundary.
  if p_guest_name is null or char_length(p_guest_name) > 200
    or (p_email is not null and char_length(p_email) > 254)
    or (p_phone is not null and char_length(p_phone) > 40)
    or (p_note is not null and char_length(p_note) > 1000)
    or (p_unit is not null and char_length(p_unit) > 30)
    or (p_stay_type is not null and char_length(p_stay_type) > 30)
    or (p_rv_service is not null and char_length(p_rv_service) > 30)
  then
    raise exception 'Invalid request details' using errcode = 'WR400';
  end if;
  v_name := nullif(btrim(p_guest_name), '');
  v_email := nullif(lower(btrim(p_email)), '');
  v_phone_input := nullif(btrim(p_phone), '');
  v_note := nullif(btrim(p_note), '');
  v_unit := nullif(btrim(p_unit), '');
  v_stay_type := nullif(btrim(p_stay_type), '');
  v_service := nullif(btrim(p_rv_service), '');
  if v_phone_input is not null then
    if v_phone_input !~ '^[+0-9(). -]+$' then
      raise exception 'Invalid phone' using errcode = 'WR400';
    end if;
    v_phone := regexp_replace(v_phone_input, '[^0-9]', '', 'g');
  end if;

  perform pg_catalog.pg_advisory_xact_lock(49302, 1);
  select b.* into v_existing from public.ranch_booking_requests b
    where b.idempotency_key = p_idempotency_key for update;
  if found then
    if v_existing.guest_name is distinct from v_name
      or v_existing.email is distinct from v_email
      or v_existing.phone is distinct from v_phone
      or v_existing.note is distinct from v_note
      or v_existing.unit is distinct from v_unit
      or v_existing.stay_type is distinct from v_stay_type
      or v_existing.rv_service is distinct from v_service
      or v_existing.arrival is distinct from p_arrival
      or v_existing.departure is distinct from p_departure
      or v_existing.guests is distinct from p_guests
      or v_existing.atv_access is distinct from p_atv_access then
      raise exception 'Request key already used for different details' using errcode = 'WR409';
    end if;
    request_id := v_existing.id;
    request_status := v_existing.status;
    quoted_total := v_existing.quoted_total;
    return next;
    return;
  end if;

  if v_name is null or char_length(v_name) > 200
    or (v_email is null and v_phone is null)
    or (v_email is not null and (char_length(v_email) > 254
      or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'))
    or (v_phone is not null and char_length(v_phone) not between 7 and 15)
    or (v_note is not null and char_length(v_note) > 1000)
    or v_unit is null or char_length(v_unit) > 30
    or v_stay_type is null
    or v_stay_type not in ('RV Site', 'Tent Site', 'Small Rental RV', 'Large Rental RV')
    or p_atv_access is null
  then
    raise exception 'Invalid request details' using errcode = 'WR400';
  end if;
  if p_arrival is null or p_departure is null
    or p_arrival < (current_timestamp at time zone 'America/Chicago')::date
    or p_departure <= p_arrival or p_departure > p_arrival + 365
    or p_arrival > ((current_timestamp at time zone 'America/Chicago')::date + interval '18 months')::date
  then
    raise exception 'Invalid stay dates' using errcode = 'WR400';
  end if;
  if p_guests is null or p_guests < 1
    or (v_stay_type = 'Tent Site' and p_guests > 6)
    or (v_stay_type = 'Small Rental RV' and p_guests > 5)
    or (v_stay_type in ('Large Rental RV', 'RV Site') and p_guests > 8)
    or (v_stay_type = 'RV Site' and (v_service is null
      or v_service not in ('Parking Only', 'Electric + Water', 'Deluxe')))
    or (v_stay_type <> 'RV Site' and v_service is not null)
  then
    raise exception 'Invalid capacity or service' using errcode = 'WR400';
  end if;
  if not exists (select 1 from public.ranch_units u
    where u.id = v_unit and u.stay_type = v_stay_type) then
    raise exception 'Site is unavailable' using errcode = 'WR409';
  end if;
  if exists (select 1 from public.ranch_reservations r
    where r.unit = v_unit and r.status in ('PENDING', 'CONFIRMED', 'CHECKED_IN')
      and pg_catalog.daterange(r.arrival, r.departure, '[)')
        && pg_catalog.daterange(p_arrival, p_departure, '[)')) then
    raise exception 'Site is unavailable' using errcode = 'WR409';
  end if;
  select q.nightly_rate, q.total into v_rate, v_total
    from ranch_booking_private.quote(v_stay_type, v_service, p_arrival, p_departure, p_atv_access) q;
  if v_rate is null or v_total is null then
    raise exception 'Invalid price' using errcode = 'WR400';
  end if;
  if (select count(*) from public.ranch_booking_requests b
      where b.submitted_at >= now() - interval '1 hour') >= 100
    or (select count(*) from public.ranch_booking_requests b
      where b.submitted_at >= now() - interval '24 hours'
        and ((v_email is not null and b.email = v_email)
          or (v_phone is not null and b.phone = v_phone))) >= 3
  then
    raise exception 'Too many requests; try later' using errcode = 'WR429';
  end if;

  insert into public.ranch_booking_requests as b
    (idempotency_key, guest_name, email, phone, note, unit, stay_type,
      rv_service, arrival, departure, guests, atv_access, nightly_rate, quoted_total)
  values (p_idempotency_key, v_name, v_email, v_phone, v_note, v_unit, v_stay_type,
    v_service, p_arrival, p_departure, p_guests, p_atv_access, v_rate, v_total)
  returning b.id, b.status, b.quoted_total into request_id, request_status, quoted_total;
  return next;
end;
$function$;
revoke all on function ranch_booking_private.submit_internal(uuid, text, text, text, text, text, text, text, date, date, integer, boolean) from public;
grant execute on function ranch_booking_private.submit_internal(uuid, text, text, text, text, text, text, text, date, date, integer, boolean) to anon, authenticated;

create function public.ranch_submit_booking_request(
  p_idempotency_key uuid, p_guest_name text, p_email text, p_phone text,
  p_note text, p_unit text, p_stay_type text, p_rv_service text,
  p_arrival date, p_departure date, p_guests integer, p_atv_access boolean
)
returns table(request_id uuid, request_status text, quoted_total numeric)
language sql volatile security invoker set search_path = ''
as $function$
  select * from ranch_booking_private.submit_internal(
    p_idempotency_key, p_guest_name, p_email, p_phone, p_note, p_unit,
    p_stay_type, p_rv_service, p_arrival, p_departure, p_guests, p_atv_access);
$function$;
revoke all on function public.ranch_submit_booking_request(uuid, text, text, text, text, text, text, text, date, date, integer, boolean) from public;
grant execute on function public.ranch_submit_booking_request(uuid, text, text, text, text, text, text, text, date, date, integer, boolean) to anon, authenticated;

-- Staff-only decision: one transaction locks the request, checks today's
-- availability and price, inserts a real reservation, then records history.
-- The existing ranch_no_overlapping_stays exclusion constraint is the final
-- arbiter if another transaction books the same unit concurrently.
create function ranch_booking_private.decide_internal(
  p_request_id uuid, p_decision text, p_decision_note text
)
returns table(request_id uuid, request_status text, reservation_id uuid, decided_at timestamptz)
language plpgsql volatile security definer set search_path = ''
as $function$
declare
  v_staff_id uuid := (select auth.uid());
  v_request public.ranch_booking_requests%rowtype;
  v_rate numeric;
  v_total numeric;
  v_reservation_id uuid;
  v_note text;
begin
  if v_staff_id is null or not exists (select 1 from public.ranch_staff s
    where s.user_id = v_staff_id and s.active) then
    raise exception 'Active staff access required' using errcode = '42501';
  end if;
  if p_decision_note is not null and char_length(p_decision_note) > 500 then
    raise exception 'Invalid decision' using errcode = 'WR400';
  end if;
  v_note := nullif(btrim(p_decision_note), '');
  if p_request_id is null or p_decision is null
    or p_decision not in ('APPROVED', 'REJECTED')
    or (v_note is not null and char_length(v_note) > 500) then
    raise exception 'Invalid decision' using errcode = 'WR400';
  end if;
  select b.* into v_request from public.ranch_booking_requests b
    where b.id = p_request_id for update;
  if not found then
    raise exception 'Request not found' using errcode = 'WR404';
  end if;
  if v_request.status <> 'PENDING' then
    raise exception 'Request has already been decided' using errcode = 'WR409';
  end if;

  if p_decision = 'APPROVED' then
    if v_request.arrival < (current_timestamp at time zone 'America/Chicago')::date then
      raise exception 'Stay dates have passed' using errcode = 'WR409';
    end if;
    if not exists (select 1 from public.ranch_units u
      where u.id = v_request.unit and u.stay_type = v_request.stay_type)
      or exists (select 1 from public.ranch_reservations r
        where r.unit = v_request.unit and r.status in ('PENDING', 'CONFIRMED', 'CHECKED_IN')
          and pg_catalog.daterange(r.arrival, r.departure, '[)')
            && pg_catalog.daterange(v_request.arrival, v_request.departure, '[)')) then
      raise exception 'Site is no longer available' using errcode = 'WR409';
    end if;
    select q.nightly_rate, q.total into v_rate, v_total
      from ranch_booking_private.quote(v_request.stay_type, v_request.rv_service,
        v_request.arrival, v_request.departure, v_request.atv_access) q;
    if v_rate is distinct from v_request.nightly_rate
      or v_total is distinct from v_request.quoted_total then
      raise exception 'Price changed; review before approval' using errcode = 'WR412';
    end if;
    insert into public.ranch_reservations
      (guest_name, phone, unit, stay_type, rv_service, arrival, departure,
        guests, atv_access, nightly_rate, total, status, created_by)
    values (v_request.guest_name, v_request.phone, v_request.unit, v_request.stay_type,
      v_request.rv_service, v_request.arrival, v_request.departure,
      v_request.guests, v_request.atv_access, v_rate, v_total, 'CONFIRMED', v_staff_id)
    returning id into v_reservation_id;
  end if;

  update public.ranch_booking_requests as b set
    status = p_decision, decided_at = now(), decided_by = v_staff_id,
    decision_note = v_note, reservation_id = v_reservation_id
  where b.id = p_request_id
  returning b.id, b.status, b.reservation_id, b.decided_at
    into request_id, request_status, reservation_id, decided_at;
  return next;
end;
$function$;
revoke all on function ranch_booking_private.decide_internal(uuid, text, text) from public;
grant execute on function ranch_booking_private.decide_internal(uuid, text, text) to authenticated;

create function public.ranch_decide_booking_request(
  p_request_id uuid, p_decision text, p_decision_note text
)
returns table(request_id uuid, request_status text, reservation_id uuid, decided_at timestamptz)
language sql volatile security invoker set search_path = ''
as $function$
  select * from ranch_booking_private.decide_internal(p_request_id, p_decision, p_decision_note);
$function$;
revoke all on function public.ranch_decide_booking_request(uuid, text, text) from public;
grant execute on function public.ranch_decide_booking_request(uuid, text, text) to authenticated;

commit;

-- Approval-time checks: execute in an isolated staging clone first. Confirm
-- anon has no table privileges on either private table and cannot call the
-- staff decision RPC. Exercise malformed input, rate limits, replay, stale
-- price, and concurrent approvals; never use the existing RV 05 booking.
