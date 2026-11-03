import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { chicagoToday } from '../src/data/customerAvailability.ts';
import { normalizeBookingRequestReceipt, validateBookingRequest } from '../src/data/bookingRequests.ts';
import { calculateLiveStayPricing } from '../src/data/liveReservationPricing.ts';
import { CUSTOMER_REQUEST_SUBMISSION_ENABLED, STAFF_BOOKING_REQUESTS_ENABLED } from '../src/constants/feature-flags.ts';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const sql = source('../supabase/migrations/20261103012314_booking_requests.sql');
function offsetDate(days) {
  const date = new Date(`${chicagoToday()}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
const draft = () => ({
  guestName: 'Test Guest', email: 'guest@example.invalid', phone: '', note: '',
  unit: 'RV 06', stayType: 'RV Site', rvService: 'Deluxe',
  arrival: offsetDate(7), departure: offsetDate(14), guests: 2, atvAccess: false,
});

test('customer draft validates contacts, dates, capacity and RV service before submission', () => {
  assert.equal(validateBookingRequest(draft()), null);
  assert.match(validateBookingRequest({ ...draft(), email: '', phone: '' }), /email address or phone/);
  assert.match(validateBookingRequest({ ...draft(), email: 'invalid' }), /valid email/);
  assert.match(validateBookingRequest({ ...draft(), guests: 9 }), /Guest count/);
  assert.match(validateBookingRequest({ ...draft(), rvService: null }), /RV service/);
  assert.match(validateBookingRequest({ ...draft(), arrival: offsetDate(14), departure: offsetDate(7) }), /stay/);
  assert.match(validateBookingRequest({ ...draft(), note: 'x'.repeat(1001) }), /note/);
});

test('receipt projection never returns guest or staff fields', () => {
  assert.deepEqual(normalizeBookingRequestReceipt([{ request_id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
    request_status: 'PENDING', quoted_total: '200.00', guest_name: 'private', email: 'private', decided_by: 'private' }]),
    { requestId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', status: 'PENDING', quotedTotal: 200 });
  assert.equal(normalizeBookingRequestReceipt([{ request_id: 'no', request_status: 'PENDING', quoted_total: 200 }]), null);
});

test('server SQL prices Deluxe blocks and other services without accepting client totals', () => {
  assert.match(sql, /p_departure - p_arrival\) \/ 7\) \* 200/);
  assert.match(sql, /p_departure - p_arrival\) % 7\) \* q\.rate/);
  assert.match(sql, /when p_atv_access then 75/);
  assert.doesNotMatch(sql, /p_total|p_nightly_rate|p_quoted_total/);
  for (const [nights, total] of [[6, 300], [7, 200], [8, 250], [13, 500], [14, 400]]) {
    assert.equal(calculateLiveStayPricing({ stayType: 'RV Site', rvService: 'Deluxe', nights }).total, total);
  }
  assert.equal(calculateLiveStayPricing({ stayType: 'RV Site', rvService: 'Deluxe', nights: 7, atvAccess: true }).total, 275);
  assert.equal(calculateLiveStayPricing({ stayType: 'RV Site', rvService: 'Electric + Water', nights: 7 }).total, 280);
});

test('request table remains private and decisions require active staff', () => {
  assert.match(sql, /alter table public\.ranch_booking_requests enable row level security/);
  assert.match(sql, /revoke all on table public\.ranch_booking_requests from public, anon, authenticated/);
  assert.match(sql, /grant select on table public\.ranch_booking_requests to authenticated/);
  assert.match(sql, /create policy ranch_booking_requests_staff_read[\s\S]*?s\.active/);
  assert.match(sql, /v_staff_id is null or not exists/);
  assert.match(sql, /grant execute on function public\.ranch_decide_booking_request\(uuid, text, text\) to authenticated/);
  assert.doesNotMatch(sql, /grant\s+(select|insert|update|delete)\s+on\s+.*to\s+anon/i);
  assert.doesNotMatch(sql, /grant\s+insert\s+on\s+.*ranch_reservations/i);
  assert.doesNotMatch(sql, /delete\s+from\s+public\./i);
  assert.match(sql, /create schema ranch_booking_private/);
  assert.match(sql, /security definer set search_path = ''/g);
  assert.match(sql, /security invoker set search_path = ''/g);
  assert.match(sql, /revoke all on function ranch_booking_private\.quote\(text, text, date, date, boolean\)/);
  assert.match(sql, /grant execute on function public\.ranch_submit_booking_request\([\s\S]*?\) to anon, authenticated/);
  assert.doesNotMatch(sql, /execute\s+format\s*\(|execute\s+'\s*(select|insert|update|delete)/i);
  assert.match(sql, /returns table\(request_id uuid, request_status text, quoted_total numeric\)/);
  assert.doesNotMatch(sql, /returns table\([^)]*(guest_name|email|phone|created_by)/i);
});

test('server bounds raw fields and validates independently of client controls', () => {
  for (const field of ['p_guest_name', 'p_email', 'p_phone', 'p_note', 'p_unit', 'p_stay_type', 'p_rv_service']) {
    assert.match(sql, new RegExp(`char_length\\(${field}\\) >`));
  }
  assert.match(sql, /p_departure > p_arrival \+ 365/);
  assert.match(sql, /p_arrival > \(\(current_timestamp at time zone 'America\/Chicago'\)::date \+ interval '18 months'\)::date/);
  assert.match(sql, /p_guests > 6/);
  assert.match(sql, /p_guests > 5/);
  assert.match(sql, /p_guests > 8/);
  assert.match(sql, /v_service not in \('Parking Only', 'Electric \+ Water', 'Deluxe'\)/);
});

test('idempotency, rate bounds and approval race guards are present (runtime test pending migration)', () => {
  assert.match(sql, /idempotency_key uuid not null unique/);
  assert.match(sql, /pg_advisory_xact_lock\(49302, 1\)/);
  assert.match(sql, /where b\.idempotency_key = p_idempotency_key for update/);
  assert.match(sql, /errcode = 'WR409'/);
  assert.match(sql, /interval '1 hour'\) >= 100/);
  assert.match(sql, /interval '24 hours'/);
  assert.match(sql, /where b\.id = p_request_id for update/);
  assert.match(sql, /insert into public\.ranch_reservations/);
  assert.match(sql, /update public\.ranch_booking_requests as b set/);
  assert.match(sql, /pg_catalog\.daterange\(r\.arrival, r\.departure, '\[\)'\)/);
  assert.match(sql, /v_request\.status <> 'PENDING'/);
  assert.match(sql, /v_rate is distinct from v_request\.nightly_rate/);
  assert.match(sql, /v_total is distinct from v_request\.quoted_total/);
  assert.match(sql, /'CONFIRMED', v_staff_id/);
});

test('customer and staff paths stay disabled until migration approval', () => {
  const repo = source('../src/repositories/booking-request-repository.ts');
  const layout = source('../src/app/_layout.tsx');
  assert.equal(CUSTOMER_REQUEST_SUBMISSION_ENABLED, false);
  assert.equal(STAFF_BOOKING_REQUESTS_ENABLED, false);
  assert.match(repo, /supabase\.rpc\('ranch_submit_booking_request'/);
  assert.match(repo, /supabase\.rpc\('ranch_decide_booking_request'/);
  assert.match(repo, /decision === 'APPROVED' \? typeof row\?\.reservation_id === 'string'/);
  assert.match(repo, /We could not confirm whether the request reached the ranch/);
  assert.doesNotMatch(repo, /from\('ranch_reservations'\)/);
  assert.match(layout, /Stack\.Protected guard=\{isStaff\}[\s\S]*staff-booking-requests/);
  const customer = source('../src/app/booking.tsx');
  assert.match(customer, /Submission status unknown/);
  assert.match(customer, /PENDING REVIEW/);
  assert.match(customer, /not a confirmed reservation, site hold or payment/);
  assert.match(customer, /CUSTOMER_REQUEST_SUBMISSION_ENABLED/);
});
