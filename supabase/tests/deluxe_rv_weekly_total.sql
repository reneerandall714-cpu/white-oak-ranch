-- Read-only expression test for the installed ranch_total_matches constraint.
-- It does not apply the migration or insert reservation rows.
with scenarios (scenario, stay_type, rv_service, nightly_rate, nights, atv_access, submitted_total, should_accept) as (
  values
    ('Deluxe 6', 'RV Site', 'Deluxe', 50, 6, false, 300, true),
    ('Deluxe 7', 'RV Site', 'Deluxe', 50, 7, false, 200, true),
    ('Deluxe 8', 'RV Site', 'Deluxe', 50, 8, false, 250, true),
    ('Deluxe 13', 'RV Site', 'Deluxe', 50, 13, false, 500, true),
    ('Deluxe 14', 'RV Site', 'Deluxe', 50, 14, false, 400, true),
    ('Deluxe 8 + ATV', 'RV Site', 'Deluxe', 50, 8, true, 325, true),
    ('Parking 7 nightly', 'RV Site', 'Parking Only', 25, 7, false, 175, true),
    ('Electric + Water 7 nightly', 'RV Site', 'Electric + Water', 40, 7, false, 280, true),
    ('Tent 7', 'Tent Site', null, 25, 7, false, 175, true),
    ('Small rental 7', 'Small Rental RV', null, 75, 7, false, 525, true),
    ('Large rental 7 + ATV', 'Large Rental RV', null, 99, 7, true, 768, true),
    ('Reject old Deluxe 7 total', 'RV Site', 'Deluxe', 50, 7, false, 350, false),
    ('Reject Parking weekly total', 'RV Site', 'Parking Only', 25, 7, false, 150, false),
    ('Reject Electric + Water weekly total', 'RV Site', 'Electric + Water', 40, 7, false, 225, false),
    ('Reject missing ATV fee', 'RV Site', 'Deluxe', 50, 8, true, 250, false)
), date_ranges as (
  select *, date '2026-11-01' as arrival, date '2026-11-01' + nights as departure
  from scenarios
), totals as (
  select scenario, submitted_total, should_accept,
    case when stay_type = 'RV Site' and rv_service = 'Deluxe'
      then ((departure - arrival) / 7) * 200
        + ((departure - arrival) % 7) * nightly_rate
      else (departure - arrival) * nightly_rate
    end + case when atv_access then 75 else 0 end as required_total
  from date_ranges
)
select scenario, submitted_total, required_total,
  (submitted_total = required_total) = should_accept as passed
from totals
order by scenario;
