-- Website base rates. Apply after the Square Sandbox migration in staging.
begin;

create or replace function ranch_booking_private.quote(
  p_stay_type text, p_rv_service text, p_arrival date,
  p_departure date, p_atv_access boolean
)
returns table (nightly_rate numeric, total numeric)
language sql immutable security invoker set search_path = ''
as $function$
  select q.rate,
    case when q.weekly_rate is null then (p_departure - p_arrival) * q.rate
      else ((p_departure - p_arrival) / 7) * q.weekly_rate
        + ((p_departure - p_arrival) % 7) * q.rate
    end + case when p_atv_access then 75 else 0 end
  from (
    select case
      when p_stay_type = 'Tent Site' then 25::numeric
      when p_stay_type = 'Small Rental RV' then 99::numeric
      when p_stay_type = 'Large Rental RV' then 125::numeric
      when p_stay_type = 'RV Site' and p_rv_service = 'Parking Only' then 25::numeric
      when p_stay_type = 'RV Site' and p_rv_service = 'Electric + Water' then 40::numeric
      when p_stay_type = 'RV Site' and p_rv_service = 'Deluxe' then 45::numeric
    end as rate,
    case when p_stay_type = 'RV Site' and p_rv_service = 'Parking Only' then 100
      when p_stay_type = 'RV Site' and p_rv_service = 'Deluxe' then 200
    end as weekly_rate
  ) q;
$function$;

-- Preserve saved quotes and compatibility with staff clients on the previous rate
-- schedule. The public request and approval functions always use the new quote.
alter table public.ranch_reservations
  drop constraint ranch_standard_rate,
  drop constraint ranch_total_matches,
  add constraint ranch_total_matches check (
    (
      nightly_rate = case
        when stay_type = 'Tent Site' then 25
        when stay_type = 'Small Rental RV' then 99
        when stay_type = 'Large Rental RV' then 125
        when rv_service = 'Parking Only' then 25
        when rv_service = 'Electric + Water' then 40
        when rv_service = 'Deluxe' then 45
        else -1
      end
      and total = case
        when stay_type = 'RV Site' and rv_service in ('Parking Only', 'Deluxe') then
          ((departure - arrival) / 7) * (case when rv_service = 'Parking Only' then 100 else 200 end)
            + ((departure - arrival) % 7) * nightly_rate
        else (departure - arrival) * nightly_rate
      end + case when atv_access then 75 else 0 end
    ) or (
      nightly_rate = case
        when stay_type = 'Tent Site' then 25
        when stay_type = 'Small Rental RV' then 75
        when stay_type = 'Large Rental RV' then 99
        when rv_service = 'Parking Only' then 25
        when rv_service = 'Electric + Water' then 40
        when rv_service = 'Deluxe' then 50
        else -1
      end
      and total = case
        when stay_type = 'RV Site' and rv_service = 'Deluxe' then
          ((departure - arrival) / 7) * 200 + ((departure - arrival) % 7) * nightly_rate
        else (departure - arrival) * nightly_rate
      end + case when atv_access then 75 else 0 end
    )
  );

alter table public.ranch_payment_settings
  alter column day_pass_primary_cents set default 1000,
  alter column day_pass_additional_cents set default 1000;

update public.ranch_payment_settings
  set day_pass_primary_cents = 1000, day_pass_additional_cents = 1000, updated_at = now()
  where day_pass_primary_cents <> 1000 or day_pass_additional_cents <> 1000;

commit;
