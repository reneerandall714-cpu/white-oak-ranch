-- REVIEW ONLY: do not apply without owner approval. The function returns only
-- public unit identifiers/types and availability for a bounded date range.
-- It does not grant anon access to ranch_units or ranch_reservations.
-- Public traffic and rate limits should be reviewed before enabling the UI.

begin;

-- A dedicated new schema keeps the definer function out of the exposed API.
-- CREATE (not IF NOT EXISTS) fails closed if this namespace already exists.
create schema ranch_availability_private;
revoke all on schema ranch_availability_private from public;
grant usage on schema ranch_availability_private to anon, authenticated;

create function ranch_availability_private.ranch_available_units_internal(
  p_arrival date,
  p_departure date
)
returns table (unit_id text, stay_type text, is_available boolean)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if p_arrival is null or p_departure is null
    or p_arrival < (current_timestamp at time zone 'America/Chicago')::date
    or p_departure <= p_arrival
    or p_departure > p_arrival + 365
    or p_arrival > ((current_timestamp at time zone 'America/Chicago')::date + interval '18 months')::date
  then
    raise exception 'Invalid stay dates' using errcode = '22023';
  end if;

  return query
  select u.id, u.stay_type,
    not exists (
      select 1
      from public.ranch_reservations r
      where r.unit = u.id
        and r.status in ('PENDING', 'CONFIRMED', 'CHECKED_IN')
        and daterange(r.arrival, r.departure, '[)') && daterange(p_arrival, p_departure, '[)')
    ) as is_available
  from public.ranch_units u
  order by u.stay_type, u.id;
end;
$function$;

revoke all on function ranch_availability_private.ranch_available_units_internal(date, date) from public;
grant execute on function ranch_availability_private.ranch_available_units_internal(date, date) to anon, authenticated;

-- Only this invoker wrapper is exposed through the public Data API schema.
create function public.ranch_available_units(p_arrival date, p_departure date)
returns table (unit_id text, stay_type text, is_available boolean)
language sql
stable
security invoker
set search_path = ''
as $function$
  select unit_id, stay_type, is_available
  from ranch_availability_private.ranch_available_units_internal(p_arrival, p_departure);
$function$;

revoke all on function public.ranch_available_units(date, date) from public;
grant execute on function public.ranch_available_units(date, date) to anon, authenticated;

commit;

-- Approval-time checks, read-only after applying this migration:
-- select unit_id, is_available from public.ranch_available_units('2026-11-15', '2026-11-22') where unit_id = 'RV 05';
-- Expected: one row, is_available = false while the confirmed stay exists.
-- select has_table_privilege('anon', 'public.ranch_reservations', 'SELECT'),
--        has_table_privilege('anon', 'public.ranch_reservations', 'INSERT');
-- Expected: false, false. Also verify anon cannot read public.ranch_units.
