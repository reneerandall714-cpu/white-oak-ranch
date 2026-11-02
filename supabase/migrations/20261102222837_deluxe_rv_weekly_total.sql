begin;

-- Only Deluxe RV sites receive the new $200 price for each complete
-- seven-night block. nightly_rate remains the existing $50 standard rate;
-- all other stay types and RV service levels retain nightly pricing.
-- Recheck existing long Deluxe reservations before applying: changing a
-- validated CHECK would reject any rows still priced under the old formula.
alter table public.ranch_reservations
  drop constraint ranch_total_matches,
  add constraint ranch_total_matches check (
    total = (
      case
        when stay_type = 'RV Site' and rv_service = 'Deluxe' then
          ((departure - arrival) / 7) * 200
          + ((departure - arrival) % 7) * nightly_rate
        else nightly_rate * (departure - arrival)
      end
      + case when atv_access then 75 else 0 end
    )
  );

commit;
