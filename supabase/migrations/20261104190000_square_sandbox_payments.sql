-- REVIEW ONLY. Apply after the synthetic baseline and the three reviewed
-- migrations in staging. Never run db push against production.
begin;

create table public.ranch_payment_settings (
  id boolean primary key default true check (id),
  deposit_type text not null default 'FULL'
    check (deposit_type in ('FULL', 'FIXED', 'PERCENT')),
  deposit_value numeric(10,2) not null default 0 check (deposit_value >= 0),
  balance_due_days_before_arrival integer not null default 0
    check (balance_due_days_before_arrival between 0 and 365),
  day_pass_enabled boolean not null default false,
  day_pass_primary_cents integer not null default 1500 check (day_pass_primary_cents > 0),
  day_pass_additional_cents integer not null default 1000 check (day_pass_additional_cents >= 0),
  atv_day_cents integer not null default 5000 check (atv_day_cents >= 0),
  updated_at timestamptz not null default now(),
  constraint ranch_deposit_value_valid check (
    (deposit_type = 'FULL' and deposit_value = 0)
    or (deposit_type = 'FIXED' and deposit_value > 0)
    or (deposit_type = 'PERCENT' and deposit_value > 0 and deposit_value < 100)
  )
);
insert into public.ranch_payment_settings(id) values (true);
alter table public.ranch_payment_settings enable row level security;
revoke all on public.ranch_payment_settings from public, anon, authenticated;
grant select on public.ranch_payment_settings to authenticated;
create policy ranch_payment_settings_staff_read on public.ranch_payment_settings
  for select to authenticated using (exists (
    select 1 from public.ranch_staff s where s.user_id = (select auth.uid()) and s.active
  ));
grant update on public.ranch_payment_settings to authenticated;
create policy ranch_payment_settings_owner_update on public.ranch_payment_settings
  for update to authenticated
  using (exists (select 1 from public.ranch_staff s
    where s.user_id = (select auth.uid()) and s.active and s.role = 'owner'))
  with check (exists (select 1 from public.ranch_staff s
    where s.user_id = (select auth.uid()) and s.active and s.role = 'owner'));

alter table public.ranch_booking_requests
  drop constraint ranch_booking_requests_status_check,
  drop constraint ranch_booking_request_decision;
alter table public.ranch_booking_requests
  add column hold_expires_at timestamptz,
  add column checkout_token uuid unique,
  add column payment_choice text check (payment_choice in ('FULL', 'DEPOSIT')),
  add column initial_due_cents integer check (initial_due_cents > 0),
  add column balance_due_cents integer check (balance_due_cents >= 0),
  add column balance_due_on date,
  add constraint ranch_booking_requests_status_check
    check (status in ('PENDING', 'AWAITING_PAYMENT', 'APPROVED', 'REJECTED', 'EXPIRED', 'PAYMENT_REVIEW', 'CANCELLED')),
  add constraint ranch_booking_request_decision check (
    (status = 'PENDING' and decided_at is null and decided_by is null and reservation_id is null)
    or (status = 'REJECTED' and decided_at is not null and decided_by is not null and reservation_id is null)
    or (status in ('AWAITING_PAYMENT', 'APPROVED', 'EXPIRED', 'PAYMENT_REVIEW', 'CANCELLED')
      and decided_at is not null and decided_by is not null and reservation_id is not null
      and hold_expires_at is not null and checkout_token is not null)
  );

create table public.ranch_day_pass_orders (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null unique,
  checkout_token uuid not null unique default gen_random_uuid(),
  guest_name text not null check (char_length(btrim(guest_name)) between 1 and 200),
  email text not null check (char_length(email) between 3 and 254),
  visit_date date not null,
  additional_passes integer not null check (additional_passes between 0 and 20),
  atv_access boolean not null,
  total_cents integer not null check (total_cents > 0),
  status text not null default 'UNPAID'
    check (status in ('UNPAID', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED', 'REVIEW')),
  created_at timestamptz not null default now()
);
alter table public.ranch_day_pass_orders enable row level security;
revoke all on public.ranch_day_pass_orders from public, anon, authenticated;
grant select on public.ranch_day_pass_orders to authenticated;
create policy ranch_day_pass_staff_read on public.ranch_day_pass_orders
  for select to authenticated using (exists (
    select 1 from public.ranch_staff s where s.user_id = (select auth.uid()) and s.active
  ));

create table public.ranch_payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.ranch_booking_requests(id),
  day_pass_id uuid references public.ranch_day_pass_orders(id),
  phase text not null check (phase in ('INITIAL', 'BALANCE', 'DAY_PASS')),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'USD' check (currency = 'USD'),
  status text not null default 'CREATED'
    check (status in ('CREATED', 'OPEN', 'PAID', 'FAILED', 'EXPIRED',
      'REFUND_PENDING', 'PARTIAL_REFUND', 'REFUNDED', 'REVIEW')),
  square_link_id text unique,
  square_order_id text unique,
  square_payment_id text unique,
  checkout_url text,
  receipt_url text,
  receipt_number text,
  refunded_cents integer not null default 0 check (refunded_cents >= 0),
  requires_review boolean not null default false,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  closed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (request_id, phase),
  unique (day_pass_id, phase),
  constraint ranch_payment_owner check (
    (request_id is not null and day_pass_id is null and phase in ('INITIAL', 'BALANCE'))
    or (request_id is null and day_pass_id is not null and phase = 'DAY_PASS')
  ),
  constraint ranch_payment_refund_limit check (refunded_cents <= amount_cents)
);
create index ranch_payments_status_idx on public.ranch_payments(status, created_at desc);
alter table public.ranch_payments enable row level security;
revoke all on public.ranch_payments from public, anon, authenticated;
grant select on public.ranch_payments to authenticated;
create policy ranch_payments_staff_read on public.ranch_payments
  for select to authenticated using (exists (
    select 1 from public.ranch_staff s where s.user_id = (select auth.uid()) and s.active
  ));

create table public.ranch_payment_events (
  event_id text primary key,
  event_type text not null,
  square_object_id text,
  result text not null,
  received_at timestamptz not null default now()
);
create table public.ranch_payment_refunds (
  square_refund_id text primary key,
  payment_id uuid not null references public.ranch_payments(id),
  amount_cents integer not null check (amount_cents > 0),
  status text not null,
  reason text,
  updated_at timestamptz not null default now()
);
create table public.ranch_refund_intents (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.ranch_payments(id),
  amount_cents integer not null check (amount_cents > 0),
  reason text not null check (char_length(reason) between 1 and 192),
  requested_by uuid not null references auth.users(id),
  square_refund_id text unique,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'COMPLETED', 'FAILED')),
  created_at timestamptz not null default now()
);
create table public.ranch_payment_cancellations (
  request_id uuid primary key references public.ranch_booking_requests(id),
  cancelled_by uuid not null references auth.users(id),
  reason text not null check (char_length(reason) between 1 and 500),
  cancelled_at timestamptz not null default now()
);
create unique index ranch_one_pending_refund_per_payment
  on public.ranch_refund_intents(payment_id) where status = 'PENDING';
alter table public.ranch_payment_events enable row level security;
alter table public.ranch_payment_refunds enable row level security;
alter table public.ranch_refund_intents enable row level security;
alter table public.ranch_payment_cancellations enable row level security;
revoke all on public.ranch_payment_events, public.ranch_payment_refunds, public.ranch_refund_intents,
  public.ranch_payment_cancellations from public, anon, authenticated;
grant select on public.ranch_payment_events, public.ranch_payment_refunds, public.ranch_refund_intents,
  public.ranch_payment_cancellations to authenticated;
create policy ranch_payment_events_staff_read on public.ranch_payment_events
  for select to authenticated using (exists (
    select 1 from public.ranch_staff s where s.user_id = (select auth.uid()) and s.active
  ));
create policy ranch_payment_refunds_staff_read on public.ranch_payment_refunds
  for select to authenticated using (exists (
    select 1 from public.ranch_staff s where s.user_id = (select auth.uid()) and s.active
  ));
create policy ranch_refund_intents_staff_read on public.ranch_refund_intents
  for select to authenticated using (exists (
    select 1 from public.ranch_staff s where s.user_id = (select auth.uid()) and s.active
  ));
create policy ranch_payment_cancellations_staff_read on public.ranch_payment_cancellations
  for select to authenticated using (exists (
    select 1 from public.ranch_staff s where s.user_id = (select auth.uid()) and s.active
  ));
grant all on public.ranch_payment_settings, public.ranch_day_pass_orders,
  public.ranch_payments, public.ranch_payment_events, public.ranch_payment_refunds,
  public.ranch_refund_intents, public.ranch_payment_cancellations to service_role;

-- The existing PENDING reservation participates in the GiST exclusion constraint.
-- Only a verified payment may change it to CONFIRMED. Old direct staff writes
-- are already ungranted in the reviewed baseline; keep that boundary.
create or replace function ranch_booking_private.decide_internal(
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
  if p_request_id is null or p_decision not in ('APPROVED', 'REJECTED') then
    raise exception 'Invalid decision' using errcode = 'WR400';
  end if;
  select b.* into v_request from public.ranch_booking_requests b
    where b.id = p_request_id for update;
  if not found then raise exception 'Request not found' using errcode = 'WR404'; end if;
  if v_request.status <> 'PENDING' then
    raise exception 'Request has already been decided' using errcode = 'WR409';
  end if;
  if p_decision = 'APPROVED' then
    if v_request.arrival < (current_timestamp at time zone 'America/Chicago')::date then
      raise exception 'Stay dates have passed' using errcode = 'WR409';
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
      v_request.guests, v_request.atv_access, v_rate, v_total, 'PENDING', v_staff_id)
    returning id into v_reservation_id;
  end if;
  update public.ranch_booking_requests b set
    status = case when p_decision = 'APPROVED' then 'AWAITING_PAYMENT' else 'REJECTED' end,
    decided_at = now(), decided_by = v_staff_id, decision_note = v_note,
    reservation_id = v_reservation_id,
    hold_expires_at = case when p_decision = 'APPROVED' then now() + interval '30 minutes' end,
    checkout_token = case when p_decision = 'APPROVED' then gen_random_uuid() end
  where b.id = p_request_id
  returning b.id, b.status, b.reservation_id, b.decided_at
    into request_id, request_status, reservation_id, decided_at;
  return next;
end;
$function$;

-- Bounded service-only operations. The Edge Functions enforce Square Sandbox,
-- user authentication, and signed webhook verification before calling these.
create function ranch_booking_private.prepare_initial_payment(
  p_token uuid, p_choice text
) returns table(payment_id uuid, amount_cents integer, total_cents integer,
  balance_cents integer, balance_due_on date, email text, label text,
  checkout_url text, square_order_id text)
language plpgsql security definer set search_path = ''
as $function$
declare v public.ranch_booking_requests%rowtype; cfg public.ranch_payment_settings%rowtype;
  n integer; deposit integer; due date; p public.ranch_payments%rowtype;
begin
  if p_choice is null or p_choice not in ('FULL', 'DEPOSIT') then raise exception 'Invalid choice'; end if;
  select * into v from public.ranch_booking_requests where checkout_token = p_token for update;
  if not found or v.status <> 'AWAITING_PAYMENT' or v.hold_expires_at <= now() then
    raise exception 'Checkout is unavailable' using errcode = 'WR409';
  end if;
  if v.payment_choice is not null then
    if v.payment_choice <> p_choice then
      raise exception 'Payment choice already set' using errcode = 'WR409';
    end if;
    select * into p from public.ranch_payments where request_id = v.id and phase = 'INITIAL';
    if not found then raise exception 'Payment record missing'; end if;
    payment_id := p.id; amount_cents := p.amount_cents;
    total_cents := (v.quoted_total * 100)::integer;
    balance_cents := v.balance_due_cents; balance_due_on := v.balance_due_on;
    email := v.email; label := 'Reservation ' || v.unit;
    checkout_url := p.checkout_url; square_order_id := p.square_order_id;
    return next; return;
  end if;
  select * into cfg from public.ranch_payment_settings where id = true;
  n := (v.quoted_total * 100)::integer;
  due := v.arrival - cfg.balance_due_days_before_arrival;
  if p_choice = 'DEPOSIT' then
    if cfg.deposit_type = 'FULL' or due <= (current_timestamp at time zone 'America/Chicago')::date then
      raise exception 'Deposit is unavailable' using errcode = 'WR409';
    end if;
    deposit := case when cfg.deposit_type = 'FIXED' then (cfg.deposit_value * 100)::integer
      else pg_catalog.ceil(n * cfg.deposit_value / 100)::integer end;
    if deposit < 1 or deposit >= n then raise exception 'Deposit settings are invalid'; end if;
  else deposit := n; due := null; end if;
  update public.ranch_booking_requests set payment_choice = p_choice,
    initial_due_cents = deposit, balance_due_cents = n - deposit, balance_due_on = due
    where id = v.id;
  insert into public.ranch_payments(request_id, phase, amount_cents)
    values (v.id, 'INITIAL', deposit)
    on conflict (request_id, phase) do nothing;
  select * into p from public.ranch_payments where request_id = v.id and phase = 'INITIAL';
  if p.amount_cents <> deposit then raise exception 'Payment amount changed'; end if;
  payment_id := p.id; amount_cents := deposit; total_cents := n;
  balance_cents := n - deposit; balance_due_on := due;
  email := v.email; label := 'Reservation ' || v.unit;
  checkout_url := p.checkout_url; square_order_id := p.square_order_id;
  return next;
end;
$function$;

create function ranch_booking_private.prepare_balance_payment(p_request_id uuid)
returns table(payment_id uuid, amount_cents integer, email text, label text,
  checkout_url text, square_order_id text)
language plpgsql security definer set search_path = ''
as $function$
declare v public.ranch_booking_requests%rowtype; p public.ranch_payments%rowtype;
begin
  select * into v from public.ranch_booking_requests where id = p_request_id for update;
  if not found or v.status <> 'APPROVED' or v.balance_due_cents <= 0 then
    raise exception 'Balance is unavailable' using errcode = 'WR409';
  end if;
  insert into public.ranch_payments(request_id, phase, amount_cents)
    values (v.id, 'BALANCE', v.balance_due_cents)
    on conflict (request_id, phase) do nothing;
  select * into p from public.ranch_payments where request_id = v.id and phase = 'BALANCE';
  if p.status not in ('CREATED','OPEN','FAILED') then
    raise exception 'Balance payment requires review' using errcode = 'WR409';
  end if;
  payment_id := p.id; amount_cents := p.amount_cents; email := v.email;
  label := 'Reservation balance ' || v.unit;
  checkout_url := p.checkout_url; square_order_id := p.square_order_id;
  return next;
end;
$function$;

create function ranch_booking_private.prepare_day_pass(
  p_key uuid, p_name text, p_email text, p_visit_date date,
  p_additional integer, p_atv boolean
) returns table(payment_id uuid, amount_cents integer, email text, label text,
  checkout_url text, square_order_id text)
language plpgsql security definer set search_path = ''
as $function$
declare cfg public.ranch_payment_settings%rowtype; d public.ranch_day_pass_orders%rowtype;
  p public.ranch_payments%rowtype; n integer;
begin
  select * into cfg from public.ranch_payment_settings where id = true;
  if not cfg.day_pass_enabled or p_key is null or p_name is null or char_length(btrim(p_name)) not between 1 and 200
    or p_email is null or char_length(p_email) > 254
    or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    or p_visit_date < (current_timestamp at time zone 'America/Chicago')::date
    or p_visit_date > (current_timestamp at time zone 'America/Chicago')::date + 365
    or p_additional not between 0 and 20 or p_atv is null then
    raise exception 'Invalid day pass' using errcode = 'WR400';
  end if;
  n := cfg.day_pass_primary_cents + cfg.day_pass_additional_cents * p_additional
    + case when p_atv then cfg.atv_day_cents else 0 end;
  insert into public.ranch_day_pass_orders
    (idempotency_key, guest_name, email, visit_date, additional_passes, atv_access, total_cents)
    values (p_key, btrim(p_name), lower(btrim(p_email)), p_visit_date, p_additional, p_atv, n)
    on conflict (idempotency_key) do nothing;
  select * into d from public.ranch_day_pass_orders where idempotency_key = p_key for update;
  if d.guest_name <> btrim(p_name) or d.email <> lower(btrim(p_email))
    or d.visit_date <> p_visit_date or d.additional_passes <> p_additional
    or d.atv_access <> p_atv then
    raise exception 'Key already used for different details' using errcode = 'WR409';
  end if;
  insert into public.ranch_payments(day_pass_id, phase, amount_cents)
    values (d.id, 'DAY_PASS', n) on conflict (day_pass_id, phase) do nothing;
  select * into p from public.ranch_payments where day_pass_id = d.id;
  if d.status not in ('UNPAID','FAILED') or p.status not in ('CREATED','OPEN','FAILED') then
    raise exception 'Day pass checkout is closed' using errcode = 'WR409';
  end if;
  payment_id := p.id; amount_cents := p.amount_cents; email := d.email;
  label := 'Day pass ' || d.visit_date::text; checkout_url := p.checkout_url;
  square_order_id := p.square_order_id; return next;
end;
$function$;

create function ranch_booking_private.attach_square_link(
  p_payment_id uuid, p_link_id text, p_order_id text, p_url text
) returns void language plpgsql security definer set search_path = ''
as $function$
begin
  update public.ranch_payments set square_link_id = p_link_id,
    square_order_id = p_order_id, checkout_url = p_url, status = 'OPEN', updated_at = now()
  where id = p_payment_id and status in ('CREATED', 'OPEN', 'FAILED')
    and (square_link_id is null or square_link_id = p_link_id)
    and (square_order_id is null or square_order_id = p_order_id);
  if not found then raise exception 'Payment link conflict' using errcode = 'WR409'; end if;
end;
$function$;

create function ranch_booking_private.record_square_payment(
  p_event_id text, p_event_type text, p_order_id text, p_square_payment_id text,
  p_amount_cents integer, p_status text, p_receipt_url text, p_receipt_number text
) returns text language plpgsql security definer set search_path = ''
as $function$
declare p public.ranch_payments%rowtype; b public.ranch_booking_requests%rowtype;
  result text := 'ignored';
begin
  if exists (select 1 from public.ranch_payment_events where event_id = p_event_id) then
    return 'duplicate';
  end if;
  select * into p from public.ranch_payments where square_order_id = p_order_id for update;
  if exists (select 1 from public.ranch_payment_events where event_id = p_event_id) then
    return 'duplicate';
  end if;
  if not found then result := 'unknown_order';
  elsif p_amount_cents is distinct from p.amount_cents then
    update public.ranch_payments set status = 'REVIEW', requires_review = true,
      updated_at = now() where id = p.id;
    result := 'amount_mismatch';
  elsif p_status = 'COMPLETED' then
    if p.status = 'REVIEW' then
      result := 'review_blocked';
    elsif p.status in ('REFUND_PENDING', 'PARTIAL_REFUND', 'REFUNDED') then
      result := 'refund_already_recorded';
    elsif p.square_payment_id is not null and p.square_payment_id <> p_square_payment_id then
      update public.ranch_payments set status = 'REVIEW', requires_review = true where id = p.id;
      result := 'different_payment';
    else
      update public.ranch_payments set status = 'PAID', square_payment_id = p_square_payment_id,
        receipt_url = p_receipt_url, receipt_number = p_receipt_number,
        paid_at = coalesce(paid_at, now()), updated_at = now() where id = p.id;
      if p.phase = 'INITIAL' then
        select * into b from public.ranch_booking_requests where id = p.request_id for update;
        if b.status = 'AWAITING_PAYMENT' then
          update public.ranch_reservations set status = 'CONFIRMED' where id = b.reservation_id and status = 'PENDING';
          if found then
            update public.ranch_booking_requests set status = 'APPROVED' where id = b.id;
            if b.hold_expires_at < now() then
              update public.ranch_payments set requires_review = true where id = p.id;
            end if;
            result := 'confirmed';
          else
            update public.ranch_payments set status = 'REVIEW', requires_review = true where id = p.id;
            result := 'reservation_missing';
          end if;
        elsif b.status = 'APPROVED' then result := 'already_confirmed';
        else
          update public.ranch_payments set status = 'REVIEW', requires_review = true where id = p.id;
          result := 'late_payment';
        end if;
      elsif p.phase = 'BALANCE' then
        select * into b from public.ranch_booking_requests where id = p.request_id for update;
        if b.status <> 'APPROVED' then
          update public.ranch_payments set status = 'REVIEW', requires_review = true where id = p.id;
          result := 'late_balance_for_cancelled_booking';
        else
          update public.ranch_booking_requests set balance_due_cents = 0 where id = p.request_id;
          if b.balance_due_on < (current_timestamp at time zone 'America/Chicago')::date then
            update public.ranch_payments set requires_review = true where id = p.id;
          end if;
          result := 'balance_paid';
        end if;
      else
        if exists (select 1 from public.ranch_day_pass_orders d
          where d.id = p.day_pass_id and d.status = 'CANCELLED') then
          update public.ranch_payments set status = 'REVIEW', requires_review = true where id = p.id;
          update public.ranch_day_pass_orders set status = 'REVIEW' where id = p.day_pass_id;
          result := 'late_day_pass_payment';
        else
          update public.ranch_day_pass_orders set status = 'PAID' where id = p.day_pass_id;
          result := 'day_pass_paid';
        end if;
      end if;
    end if;
  elsif p_status in ('FAILED', 'CANCELED') and p.status in ('CREATED', 'OPEN', 'FAILED') then
    update public.ranch_payments set status = 'FAILED', updated_at = now() where id = p.id;
    if p.phase = 'DAY_PASS' then update public.ranch_day_pass_orders set status = 'FAILED' where id = p.day_pass_id; end if;
    result := 'failed';
  end if;
  insert into public.ranch_payment_events(event_id, event_type, square_object_id, result)
    values (p_event_id, p_event_type, p_square_payment_id, result);
  return result;
end;
$function$;

create function ranch_booking_private.record_square_refund(
  p_event_id text, p_type text, p_refund_id text, p_square_payment_id text,
  p_amount_cents integer, p_status text
) returns text language plpgsql security definer set search_path = ''
as $function$
declare p public.ranch_payments%rowtype; n integer;
begin
  if exists (select 1 from public.ranch_payment_events where event_id = p_event_id) then return 'duplicate'; end if;
  select * into p from public.ranch_payments where square_payment_id = p_square_payment_id for update;
  if not found then return 'unknown_payment'; end if;
  if p_amount_cents < 1 or p_amount_cents > p.amount_cents then raise exception 'Invalid refund amount'; end if;
  insert into public.ranch_payment_refunds(square_refund_id, payment_id, amount_cents, status)
    values (p_refund_id, p.id, p_amount_cents, p_status)
    on conflict (square_refund_id) do update set status = excluded.status, updated_at = now();
  update public.ranch_refund_intents set status = case
    when p_status = 'COMPLETED' then 'COMPLETED'
    when p_status in ('FAILED', 'REJECTED') then 'FAILED'
    else 'PENDING' end
    where square_refund_id = p_refund_id;
  select coalesce(sum(amount_cents),0) into n from public.ranch_payment_refunds
    where payment_id = p.id and status = 'COMPLETED';
  update public.ranch_payments set refunded_cents = n,
    status = case when n >= amount_cents then 'REFUNDED'
      when n > 0 then 'PARTIAL_REFUND'
      when p_status in ('FAILED','REJECTED') then 'PAID'
      else 'REFUND_PENDING' end,
    requires_review = true, updated_at = now() where id = p.id;
  if p.phase = 'DAY_PASS' and n >= p.amount_cents then
    update public.ranch_day_pass_orders set status = 'REFUNDED' where id = p.day_pass_id;
  end if;
  insert into public.ranch_payment_events(event_id, event_type, square_object_id, result)
    values (p_event_id, p_type, p_refund_id, 'recorded');
  return 'recorded';
end;
$function$;

create function ranch_booking_private.prepare_refund(
  p_payment_id uuid, p_amount_cents integer, p_reason text, p_staff_id uuid
) returns uuid language plpgsql security definer set search_path = ''
as $function$
declare p public.ranch_payments%rowtype; r public.ranch_refund_intents%rowtype;
begin
  if not exists (select 1 from public.ranch_staff s where s.user_id = p_staff_id
    and s.active and s.role in ('owner','admin')) then
    raise exception 'Owner or admin required' using errcode = '42501';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) not between 1 and 192 then
    raise exception 'Refund reason required' using errcode = 'WR400';
  end if;
  select * into p from public.ranch_payments where id = p_payment_id for update;
  if not found or p.status not in ('PAID','PARTIAL_REFUND')
    or p.square_payment_id is null or p_amount_cents is null
    or p_amount_cents < 1 or p_amount_cents > p.amount_cents - p.refunded_cents then
    raise exception 'Refund unavailable' using errcode = 'WR409';
  end if;
  select * into r from public.ranch_refund_intents where payment_id = p.id
    and status = 'PENDING' for update;
  if found then
    if r.amount_cents <> p_amount_cents or r.reason <> btrim(p_reason) then
      raise exception 'Another refund requires reconciliation' using errcode = 'WR409';
    end if;
    return r.id;
  end if;
  insert into public.ranch_refund_intents(payment_id,amount_cents,reason,requested_by)
    values (p.id,p_amount_cents,btrim(p_reason),p_staff_id) returning id into r.id;
  return r.id;
end;
$function$;

create function ranch_booking_private.attach_refund(
  p_intent_id uuid, p_square_refund_id text, p_status text
) returns void language plpgsql security definer set search_path = ''
as $function$
begin
  update public.ranch_refund_intents set square_refund_id = p_square_refund_id,
    status = case when p_status = 'COMPLETED' then 'COMPLETED'
      when p_status in ('FAILED','REJECTED') then 'FAILED' else 'PENDING' end
    where id = p_intent_id and (square_refund_id is null or square_refund_id = p_square_refund_id);
  if not found then raise exception 'Refund intent conflict' using errcode = 'WR409'; end if;
end;
$function$;

create function ranch_booking_private.flag_square_dispute(
  p_event_id text, p_type text, p_square_payment_id text
) returns text language plpgsql security definer set search_path = ''
as $function$
declare p public.ranch_payments%rowtype;
begin
  if exists (select 1 from public.ranch_payment_events where event_id = p_event_id) then return 'duplicate'; end if;
  select * into p from public.ranch_payments where square_payment_id = p_square_payment_id for update;
  if not found then return 'unknown_payment'; end if;
  update public.ranch_payments set requires_review = true, updated_at = now() where id = p.id;
  insert into public.ranch_payment_events(event_id,event_type,square_object_id,result)
    values (p_event_id,p_type,p_square_payment_id,'dispute_review');
  return 'dispute_review';
end;
$function$;

create function ranch_booking_private.expire_unpaid_hold(p_request_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $function$
declare b public.ranch_booking_requests%rowtype;
begin
  select * into b from public.ranch_booking_requests where id = p_request_id for update;
  if not found or b.status <> 'AWAITING_PAYMENT' or b.hold_expires_at > now() then return false; end if;
  if exists (select 1 from public.ranch_payments p where p.request_id = b.id
    and (p.status not in ('EXPIRED', 'FAILED')
      or p.closed_at is null
      or p.closed_at > now() - interval '5 minutes')) then
    return false;
  end if;
  update public.ranch_reservations set status = 'CANCELLED' where id = b.reservation_id and status = 'PENDING';
  if not found then return false; end if;
  update public.ranch_booking_requests set status = 'EXPIRED' where id = b.id;
  return true;
end;
$function$;

create function ranch_booking_private.mark_square_link_expired(p_payment_id uuid)
returns void language plpgsql security definer set search_path = ''
as $function$
begin
  update public.ranch_payments set status = 'EXPIRED', closed_at = now(), updated_at = now()
    where id = p_payment_id and status in ('OPEN', 'FAILED');
end;
$function$;

create function ranch_booking_private.expire_day_pass(p_day_pass_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $function$
declare d public.ranch_day_pass_orders%rowtype; p public.ranch_payments%rowtype;
begin
  select * into d from public.ranch_day_pass_orders where id = p_day_pass_id for update;
  if not found or d.status not in ('UNPAID','FAILED')
    or d.visit_date >= (current_timestamp at time zone 'America/Chicago')::date then return false; end if;
  select * into p from public.ranch_payments where day_pass_id = d.id for update;
  if not found or p.status not in ('EXPIRED','FAILED') or p.closed_at is null
    or p.closed_at > now() - interval '5 minutes' then return false; end if;
  update public.ranch_day_pass_orders set status = 'CANCELLED' where id = d.id;
  return true;
end;
$function$;

-- PostgREST exposes public, not the private schema. These thin wrappers are
-- callable only with the server's service role key.
create function public.ranch_prepare_initial_payment(p_token uuid, p_choice text)
returns table(payment_id uuid, amount_cents integer, total_cents integer,
  balance_cents integer, balance_due_on date, email text, label text,
  checkout_url text, square_order_id text)
language sql security invoker set search_path = ''
as $function$ select * from ranch_booking_private.prepare_initial_payment(p_token,p_choice); $function$;
create function public.ranch_prepare_balance_payment(p_request_id uuid)
returns table(payment_id uuid, amount_cents integer, email text, label text,
  checkout_url text, square_order_id text)
language sql security invoker set search_path = ''
as $function$ select * from ranch_booking_private.prepare_balance_payment(p_request_id); $function$;
create function public.ranch_prepare_day_pass(p_key uuid, p_name text, p_email text,
  p_visit_date date, p_additional integer, p_atv boolean)
returns table(payment_id uuid, amount_cents integer, email text, label text,
  checkout_url text, square_order_id text)
language sql security invoker set search_path = ''
as $function$
  select * from ranch_booking_private.prepare_day_pass(
    p_key,p_name,p_email,p_visit_date,p_additional,p_atv);
$function$;
create function public.ranch_attach_square_link(
  p_payment_id uuid, p_link_id text, p_order_id text, p_url text)
returns void language sql security invoker set search_path = ''
as $function$ select ranch_booking_private.attach_square_link(p_payment_id,p_link_id,p_order_id,p_url); $function$;
create function public.ranch_record_square_payment(
  p_event_id text, p_event_type text, p_order_id text, p_square_payment_id text,
  p_amount_cents integer, p_status text, p_receipt_url text, p_receipt_number text)
returns text language sql security invoker set search_path = ''
as $function$
  select ranch_booking_private.record_square_payment(p_event_id,p_event_type,p_order_id,
    p_square_payment_id,p_amount_cents,p_status,p_receipt_url,p_receipt_number);
$function$;
create function public.ranch_record_square_refund(
  p_event_id text,p_type text,p_refund_id text,p_square_payment_id text,
  p_amount_cents integer,p_status text)
returns text language sql security invoker set search_path = ''
as $function$
  select ranch_booking_private.record_square_refund(p_event_id,p_type,p_refund_id,
    p_square_payment_id,p_amount_cents,p_status);
$function$;
create function public.ranch_flag_square_dispute(
  p_event_id text,p_type text,p_square_payment_id text)
returns text language sql security invoker set search_path = ''
as $function$
  select ranch_booking_private.flag_square_dispute(p_event_id,p_type,p_square_payment_id);
$function$;
create function public.ranch_prepare_refund(
  p_payment_id uuid,p_amount_cents integer,p_reason text,p_staff_id uuid)
returns uuid language sql security invoker set search_path = ''
as $function$
  select ranch_booking_private.prepare_refund(p_payment_id,p_amount_cents,p_reason,p_staff_id);
$function$;
create function public.ranch_attach_refund(
  p_intent_id uuid,p_square_refund_id text,p_status text)
returns void language sql security invoker set search_path = ''
as $function$ select ranch_booking_private.attach_refund(p_intent_id,p_square_refund_id,p_status); $function$;
create function public.ranch_mark_square_link_expired(p_payment_id uuid)
returns void language sql security invoker set search_path = ''
as $function$ select ranch_booking_private.mark_square_link_expired(p_payment_id); $function$;
create function public.ranch_expire_unpaid_hold(p_request_id uuid)
returns boolean language sql security invoker set search_path = ''
as $function$ select ranch_booking_private.expire_unpaid_hold(p_request_id); $function$;
create function public.ranch_expire_day_pass(p_day_pass_id uuid)
returns boolean language sql security invoker set search_path = ''
as $function$ select ranch_booking_private.expire_day_pass(p_day_pass_id); $function$;

create function public.ranch_cancel_paid_booking(p_request_id uuid, p_reason text)
returns boolean language plpgsql security definer set search_path = ''
as $function$
declare b public.ranch_booking_requests%rowtype; v_staff uuid := (select auth.uid());
begin
  if v_staff is null or not exists (select 1 from public.ranch_staff s
    where s.user_id = v_staff and s.active and s.role in ('owner','admin')) then
    raise exception 'Owner or admin required' using errcode = '42501';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) not between 1 and 500 then
    raise exception 'Cancellation reason required' using errcode = 'WR400';
  end if;
  select * into b from public.ranch_booking_requests where id = p_request_id for update;
  if not found or b.status <> 'APPROVED' then
    raise exception 'Reservation cannot be cancelled here' using errcode = 'WR409';
  end if;
  perform 1 from public.ranch_payments where request_id = b.id for update;
  if exists (select 1 from public.ranch_payments p where p.request_id = b.id
    and (p.status not in ('REFUNDED','EXPIRED')
      or (p.phase = 'BALANCE' and p.status = 'EXPIRED'
        and (p.closed_at is null or p.closed_at > now() - interval '5 minutes')))) then
    raise exception 'Reconcile and refund payments first' using errcode = 'WR409';
  end if;
  update public.ranch_reservations set status = 'CANCELLED'
    where id = b.reservation_id and status = 'CONFIRMED';
  if not found then raise exception 'Reservation status changed' using errcode = 'WR409'; end if;
  update public.ranch_booking_requests set status = 'CANCELLED', balance_due_cents = 0 where id = b.id;
  insert into public.ranch_payment_cancellations(request_id,cancelled_by,reason)
    values (b.id,v_staff,btrim(p_reason));
  return true;
end;
$function$;

-- No public EXECUTE on internal payment operations, even though the private
-- schema has usage for the earlier request RPC.
revoke all on function ranch_booking_private.prepare_initial_payment(uuid,text) from public, anon, authenticated;
revoke all on function ranch_booking_private.prepare_balance_payment(uuid) from public, anon, authenticated;
revoke all on function ranch_booking_private.prepare_day_pass(uuid,text,text,date,integer,boolean) from public, anon, authenticated;
revoke all on function ranch_booking_private.attach_square_link(uuid,text,text,text) from public, anon, authenticated;
revoke all on function ranch_booking_private.record_square_payment(text,text,text,text,integer,text,text,text) from public, anon, authenticated;
revoke all on function ranch_booking_private.record_square_refund(text,text,text,text,integer,text) from public, anon, authenticated;
revoke all on function ranch_booking_private.flag_square_dispute(text,text,text) from public, anon, authenticated;
revoke all on function ranch_booking_private.prepare_refund(uuid,integer,text,uuid) from public, anon, authenticated;
revoke all on function ranch_booking_private.attach_refund(uuid,text,text) from public, anon, authenticated;
revoke all on function ranch_booking_private.expire_unpaid_hold(uuid) from public, anon, authenticated;
revoke all on function ranch_booking_private.mark_square_link_expired(uuid) from public, anon, authenticated;
revoke all on function ranch_booking_private.expire_day_pass(uuid) from public, anon, authenticated;
grant usage on schema ranch_booking_private to service_role;
grant execute on function ranch_booking_private.prepare_initial_payment(uuid,text) to service_role;
grant execute on function ranch_booking_private.prepare_balance_payment(uuid) to service_role;
grant execute on function ranch_booking_private.prepare_day_pass(uuid,text,text,date,integer,boolean) to service_role;
grant execute on function ranch_booking_private.attach_square_link(uuid,text,text,text) to service_role;
grant execute on function ranch_booking_private.record_square_payment(text,text,text,text,integer,text,text,text) to service_role;
grant execute on function ranch_booking_private.record_square_refund(text,text,text,text,integer,text) to service_role;
grant execute on function ranch_booking_private.flag_square_dispute(text,text,text) to service_role;
grant execute on function ranch_booking_private.prepare_refund(uuid,integer,text,uuid) to service_role;
grant execute on function ranch_booking_private.attach_refund(uuid,text,text) to service_role;
grant execute on function ranch_booking_private.expire_unpaid_hold(uuid) to service_role;
grant execute on function ranch_booking_private.mark_square_link_expired(uuid) to service_role;
grant execute on function ranch_booking_private.expire_day_pass(uuid) to service_role;
revoke all on function public.ranch_prepare_initial_payment(uuid,text) from public, anon, authenticated;
revoke all on function public.ranch_prepare_balance_payment(uuid) from public, anon, authenticated;
revoke all on function public.ranch_prepare_day_pass(uuid,text,text,date,integer,boolean) from public, anon, authenticated;
revoke all on function public.ranch_attach_square_link(uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.ranch_record_square_payment(text,text,text,text,integer,text,text,text) from public, anon, authenticated;
revoke all on function public.ranch_record_square_refund(text,text,text,text,integer,text) from public, anon, authenticated;
revoke all on function public.ranch_flag_square_dispute(text,text,text) from public, anon, authenticated;
revoke all on function public.ranch_prepare_refund(uuid,integer,text,uuid) from public, anon, authenticated;
revoke all on function public.ranch_attach_refund(uuid,text,text) from public, anon, authenticated;
revoke all on function public.ranch_mark_square_link_expired(uuid) from public, anon, authenticated;
revoke all on function public.ranch_expire_unpaid_hold(uuid) from public, anon, authenticated;
revoke all on function public.ranch_expire_day_pass(uuid) from public, anon, authenticated;
grant execute on function public.ranch_prepare_initial_payment(uuid,text) to service_role;
grant execute on function public.ranch_prepare_balance_payment(uuid) to service_role;
grant execute on function public.ranch_prepare_day_pass(uuid,text,text,date,integer,boolean) to service_role;
grant execute on function public.ranch_attach_square_link(uuid,text,text,text) to service_role;
grant execute on function public.ranch_record_square_payment(text,text,text,text,integer,text,text,text) to service_role;
grant execute on function public.ranch_record_square_refund(text,text,text,text,integer,text) to service_role;
grant execute on function public.ranch_flag_square_dispute(text,text,text) to service_role;
grant execute on function public.ranch_prepare_refund(uuid,integer,text,uuid) to service_role;
grant execute on function public.ranch_attach_refund(uuid,text,text) to service_role;
grant execute on function public.ranch_mark_square_link_expired(uuid) to service_role;
grant execute on function public.ranch_expire_unpaid_hold(uuid) to service_role;
grant execute on function public.ranch_expire_day_pass(uuid) to service_role;
revoke all on function public.ranch_cancel_paid_booking(uuid,text) from public, anon, authenticated;
grant execute on function public.ranch_cancel_paid_booking(uuid,text) to authenticated;
commit;
