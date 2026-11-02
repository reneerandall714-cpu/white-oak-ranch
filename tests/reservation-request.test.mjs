import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateStayPricing } from '../src/data/ranchConfig.ts';
import {
  buildReservationInsert,
  mapReservationAccessError,
  mapReservationSaveError,
} from '../src/repositories/reservation-request.ts';

test('live Deluxe weekly insert leaves generated nights and staff identity to the database', () => {
  const pricing = calculateStayPricing({ stayType: 'RV Site', rvService: 'Deluxe', nights: 7 });
  const row = buildReservationInsert({
    guestName: ' Sample Guest ',
    phone: '',
    unit: 'RV-01',
    stayType: 'RV Site',
    rvService: 'Deluxe',
    arrival: '2026-11-10',
    departure: '2026-11-17',
    guests: 2,
    atvAccess: false,
    nightlyRate: pricing.nightlyRate,
    nights: 7,
    total: pricing.total,
  });

  assert.equal(row.total, 200);
  assert.equal(row.nightly_rate, 50);
  assert.equal(row.guest_name, 'Sample Guest');
  assert.equal(row.status, 'CONFIRMED');
  assert.equal(Object.hasOwn(row, 'nights'), false);
  assert.equal(Object.hasOwn(row, 'created_by'), false);
});

test('database-generated-column and other constraint failures are validation errors', () => {
  assert.equal(mapReservationSaveError({ code: '428C9' }, 400), 'validation');
  assert.equal(mapReservationSaveError({ code: '23514' }, 400), 'validation');
  assert.equal(mapReservationSaveError({ code: '23502' }, 400), 'validation');
});

test('staff errors distinguish session, permission, connectivity, and service failure', () => {
  assert.equal(mapReservationAccessError({ code: 'PGRST301' }, 401), 'session_expired');
  assert.equal(mapReservationSaveError({}, 401), 'session_expired');
  assert.equal(mapReservationSaveError({ code: '42501' }, 403), 'permission');
  assert.equal(mapReservationSaveError({}, 0), 'connectivity');
  assert.equal(mapReservationSaveError({}, 503), 'unavailable');
});

test('overlaps and deleted units have distinct errors', () => {
  assert.equal(mapReservationSaveError({ code: '23P01' }, 409), 'conflict');
  assert.equal(mapReservationSaveError({
    code: '23503',
    message: 'violates foreign key constraint "ranch_reservations_unit_stay_type_fkey"',
  }, 409), 'unit_unavailable');
});
