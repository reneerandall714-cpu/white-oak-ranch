import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  availableUnitsForStay, maxGuestsForStay, normalizePublicUnits, staysOverlap, validateStayDates,
} from '../src/data/customerAvailability.ts';
import { calculateLiveStayPricing } from '../src/data/liveReservationPricing.ts';
import { PUBLIC_AVAILABILITY_ENABLED } from '../src/constants/feature-flags.ts';

const units = [
  { unitId: 'RV 05', stayType: 'RV Site', isAvailable: false },
  { unitId: 'RV 06', stayType: 'RV Site', isAvailable: true },
  { unitId: 'T 01', stayType: 'Tent Site', isAvailable: true },
];

test('availability filters by stay type and never offers occupied RV 05', () => {
  assert.deepEqual(availableUnitsForStay(units, 'RV Site').map((unit) => unit.unitId), ['RV 06']);
  assert.deepEqual(availableUnitsForStay(units, 'Tent Site').map((unit) => unit.unitId), ['T 01']);
  assert.deepEqual(availableUnitsForStay(units, 'Small Rental RV'), []);
});

test('half-open stay overlap includes Nov 15–22 but permits adjacent check-in/out', () => {
  assert.equal(staysOverlap('2026-11-15', '2026-11-22', '2026-11-16', '2026-11-21'), true);
  assert.equal(staysOverlap('2026-11-15', '2026-11-22', '2026-11-22', '2026-11-25'), false);
  assert.equal(staysOverlap('2026-11-15', '2026-11-22', '2026-11-10', '2026-11-15'), false);
});

test('dates are real, future, ordered and bounded', () => {
  assert.deepEqual(validateStayDates('2026-11-15', '2026-11-22', '2026-11-02'), { nights: 7, error: null });
  for (const [arrival, departure] of [
    ['2026-02-30', '2026-03-02'], ['2026-11-01', '2026-11-03'],
    ['2026-11-22', '2026-11-15'], ['2026-11-15', '2027-12-01'],
    ['2028-06-01', '2028-06-03'],
  ]) {
    assert.notEqual(validateStayDates(arrival, departure, '2026-11-02').error, null);
  }
});

test('customer capacity is bounded by accommodation', () => {
  assert.equal(maxGuestsForStay('Tent Site'), 6);
  assert.equal(maxGuestsForStay('Small Rental RV'), 5);
  assert.equal(maxGuestsForStay('Large Rental RV'), 8);
});

test('public response projection strips private fields and rejects malformed data', () => {
  assert.deepEqual(normalizePublicUnits([{ unit_id: 'RV 05', stay_type: 'RV Site', is_available: false,
    guest_name: 'private', phone: 'private', reservation_id: 'private', created_by: 'private' }]),
    [{ unitId: 'RV 05', stayType: 'RV Site', isAvailable: false }]);
  assert.equal(normalizePublicUnits([{ unit_id: 'RV 05', stay_type: 'RV Site' }]), null);
  assert.equal(normalizePublicUnits({ unit_id: 'RV 05' }), null);
});

test('customer quote uses only Deluxe complete weekly blocks and one ATV fee', () => {
  for (const [nights, total] of [[6, 300], [7, 200], [8, 250], [13, 500], [14, 400]]) {
    assert.equal(calculateLiveStayPricing({ stayType: 'RV Site', rvService: 'Deluxe', nights }).total, total);
  }
  assert.equal(calculateLiveStayPricing({ stayType: 'RV Site', rvService: 'Deluxe', nights: 8, atvAccess: true }).total, 325);
  assert.equal(calculateLiveStayPricing({ stayType: 'RV Site', rvService: 'Parking Only', nights: 7 }).total, 175);
  assert.equal(calculateLiveStayPricing({ stayType: 'RV Site', rvService: 'Electric + Water', nights: 7 }).total, 280);
  assert.equal(calculateLiveStayPricing({ stayType: 'Tent Site', nights: 7 }).total, 175);
});

test('public repository uses the narrow RPC only; migration does not grant private table reads or writes', () => {
  const repo = readFileSync(new URL('../src/repositories/customer-availability-repository.ts', import.meta.url), 'utf8');
  const migration = readFileSync(new URL('../supabase/migrations/20261103005539_public_unit_availability.sql', import.meta.url), 'utf8');
  assert.equal(PUBLIC_AVAILABILITY_ENABLED, true);
  assert.match(repo, /supabase\.rpc\('ranch_available_units'/);
  assert.doesNotMatch(repo, /supabase\.from\(/);
  assert.doesNotMatch(repo, /guest_name|phone|created_by/);
  assert.match(migration, /returns table \(unit_id text, stay_type text, is_available boolean\)/g);
  assert.match(migration, /security definer/);
  assert.match(migration, /security invoker/);
  assert.match(migration, /p_departure > p_arrival \+ 365/);
  assert.match(migration, /r\.status in \('PENDING', 'CONFIRMED', 'CHECKED_IN'\)/);
  assert.doesNotMatch(migration, /grant\s+(select|insert|update|delete)\s+on\s+public\.ranch_reservations/i);
  assert.doesNotMatch(migration, /grant\s+(select|insert|update|delete)\s+on\s+public\.ranch_units/i);
  assert.doesNotMatch(migration, /create policy|alter table/i);
});

test('customer route remains request-only and staff routes stay protected', () => {
  const booking = readFileSync(new URL('../src/app/booking.tsx', import.meta.url), 'utf8');
  const layout = readFileSync(new URL('../src/app/_layout.tsx', import.meta.url), 'utf8');
  assert.match(booking, /REQUEST PREVIEW ONLY/);
  assert.match(booking, /does not save a request, hold a site or charge you/);
  assert.doesNotMatch(booking, /supabase\.from\(|insert\(|createStaffReservation\(/);
  assert.match(layout, /Stack\.Protected guard=\{isStaff\}/);
});
