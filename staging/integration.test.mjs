// Explicitly run only against a disposable, independently identified Supabase target.
// Uses synthetic .invalid contacts; the service key never enters an Expo bundle.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { isIsolatedStagingTarget } from '../src/constants/staging-environment.ts';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
const stagingRef = process.env.EXPO_PUBLIC_STAGING_PROJECT_REF;
if (process.env.STAGING_TEST_RUN !== 'YES'
  || process.env.EXPO_PUBLIC_SUPABASE_ENV !== 'staging'
  || !isIsolatedStagingTarget(url, stagingRef)
  || !publishableKey || !serviceKey || publishableKey === serviceKey) {
  throw new Error('Refusing integration tests: isolated staging URL, distinct keys and STAGING_TEST_RUN=YES are required.');
}

const options = { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };
const anon = createClient(url, publishableKey, options);
const admin = createClient(url, serviceKey, options);
let staff;
let ordinary;
const users = [];
const requests = [];
const reservations = [];
const runId = randomUUID().slice(0, 8);
const contact = (label) => `wor-${runId}-${label}@example.invalid`;
function datePlus(days) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date()).map((part) => [part.type, part.value]));
  const day = `${parts.year}-${parts.month}-${parts.day}`;
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
const arrival = datePlus(40);
const departure = datePlus(47);
const laterArrival = datePlus(54);
const laterDeparture = datePlus(61);
function draft(overrides = {}) {
  return {
    p_idempotency_key: randomUUID(), p_guest_name: 'Synthetic Staging Guest',
    p_email: contact(randomUUID().slice(0, 8)), p_phone: null, p_note: 'STAGING TEST ONLY',
    p_unit: 'RV 05', p_stay_type: 'RV Site', p_rv_service: 'Deluxe',
    p_arrival: arrival, p_departure: departure, p_guests: 2, p_atv_access: false,
    ...overrides,
  };
}
async function submit(input) {
  const result = await anon.rpc('ranch_submit_booking_request', input);
  if (!result.error && result.data?.[0]?.request_id) requests.push(result.data[0].request_id);
  return result;
}
function code(result, expected) {
  assert.ok(result.error, `Expected ${expected}, got success`);
  assert.equal(result.error.code, expected, result.error.message);
}
async function createSyntheticUser(label) {
  const email = contact(label);
  const password = `T-${randomBytes(24).toString('base64url')}9!`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(created.error);
  const id = created.data.user.id;
  users.push(id);
  const client = createClient(url, publishableKey, options);
  const signed = await client.auth.signInWithPassword({ email, password });
  assert.ifError(signed.error);
  return { id, client };
}

before(async () => {
  const who = new URL(url).hostname;
  assert.notEqual(who, 'wagmelaupruptnzwjjta.supabase.co');
  const marker = await admin.from('ranch_staging_marker').select('id').single();
  assert.ifError(marker.error);
  assert.equal(marker.data.id, 'WHITE_OAK_STAGING_ONLY_2026', 'Refusing target without staging sentinel');
  // A disposable database starts empty; refuse a populated target rather than
  // assuming that a non-production hostname contains no real people.
  for (const table of ['ranch_staff', 'ranch_reservations', 'ranch_booking_requests']) {
    const existing = await admin.from(table).select('*', { count: 'exact', head: true });
    assert.ifError(existing.error);
    assert.equal(existing.count, 0, `Refusing populated staging table ${table}`);
  }
  const createdStaff = await createSyntheticUser('staff');
  staff = createdStaff.client;
  const grant = await admin.from('ranch_staff').insert({ user_id: createdStaff.id, role: 'staff', active: true });
  assert.ifError(grant.error);
  ordinary = (await createSyntheticUser('ordinary')).client;
});

after(async () => {
  // Exact synthetic IDs only; never bulk-delete or touch a production URL.
  for (const id of [...new Set(requests)]) {
    const row = await admin.from('ranch_booking_requests').select('reservation_id').eq('id', id).maybeSingle();
    if (row.data?.reservation_id) reservations.push(row.data.reservation_id);
  }
  if (requests.length) assert.ifError((await admin.from('ranch_booking_requests').delete().in('id', [...new Set(requests)])).error);
  if (reservations.length) assert.ifError((await admin.from('ranch_reservations').delete().in('id', [...new Set(reservations)])).error);
  for (const id of users) assert.ifError((await admin.auth.admin.deleteUser(id)).error);
});

test('anonymous availability exposes 23 public units and no private fields', async () => {
  const response = await anon.rpc('ranch_available_units', { p_arrival: arrival, p_departure: departure });
  assert.ifError(response.error);
  assert.equal(response.data.length, 23);
  for (const row of response.data) {
    assert.deepEqual(Object.keys(row).sort(), ['is_available', 'stay_type', 'unit_id']);
    assert.equal(row.is_available, true);
  }
  code(await anon.rpc('ranch_available_units', { p_arrival: departure, p_departure: arrival }), '22023');
});

test('anonymous and ordinary users cannot inspect or mutate private records', async () => {
  for (const table of ['ranch_booking_requests', 'ranch_reservations', 'ranch_staff', 'ranch_staging_marker']) {
    const read = await anon.from(table).select('*').limit(1);
    assert.ok(read.error || read.data.length === 0, `anonymous read exposed ${table}`);
    const nonstaff = await ordinary.from(table).select('*').limit(1);
    assert.ok(nonstaff.error || nonstaff.data.length === 0, `nonstaff read exposed ${table}`);
  }
  const id = randomUUID();
  for (const client of [anon, ordinary]) {
    const decision = await client.rpc('ranch_decide_booking_request', {
      p_request_id: id, p_decision: 'REJECTED', p_decision_note: null,
    });
    assert.ok(decision.error, 'nonstaff decision was accepted');
    for (const table of ['ranch_booking_requests', 'ranch_reservations', 'ranch_staff']) {
      const key = table === 'ranch_staff' ? 'user_id' : 'id';
      const update = await client.from(table).update(table === 'ranch_staff' ? { active: false } : { status: 'REJECTED' }).eq(key, id).select();
      assert.ok(update.error || update.data.length === 0);
      const deletion = await client.from(table).delete().eq(key, id).select();
      assert.ok(deletion.error || deletion.data.length === 0);
    }
  }
});

test('server rejects invalid dates, unit/type, guests, contacts, oversized fields and client totals', async () => {
  const invalid = [
    draft({ p_arrival: departure, p_departure: arrival }),
    draft({ p_unit: 'Tent 01', p_stay_type: 'RV Site' }),
    draft({ p_guests: 9 }),
    draft({ p_email: 'not-an-email' }),
    draft({ p_email: null, p_phone: 'abc' }),
    draft({ p_email: null, p_phone: null }),
    draft({ p_guest_name: 'x'.repeat(201) }),
    draft({ p_note: 'x'.repeat(1001) }),
  ];
  for (const input of invalid) assert.ok((await submit(input)).error, `invalid input accepted: ${Object.keys(input)}`);
  const tampered = await submit({ ...draft(), p_total: 1 });
  assert.ok(tampered.error, 'RPC accepted a client-supplied total');
});

test('submission is pending, quoted by server, idempotent and does not hold inventory', async () => {
  const input = draft({ p_email: contact('primary'), p_atv_access: true });
  const first = await submit(input);
  assert.ifError(first.error);
  assert.equal(Number(first.data[0].quoted_total), 275);
  assert.equal(first.data[0].request_status, 'PENDING');
  assert.deepEqual(Object.keys(first.data[0]).sort(), ['quoted_total', 'request_id', 'request_status']);
  const replay = await submit(input);
  assert.ifError(replay.error);
  assert.equal(replay.data[0].request_id, first.data[0].request_id);
  code(await submit({ ...input, p_guest_name: 'Changed Staging Guest' }), 'WR409');
  const requestRows = await admin.from('ranch_booking_requests').select('id').eq('idempotency_key', input.p_idempotency_key);
  assert.ifError(requestRows.error);
  assert.equal(requestRows.data.length, 1);
  const reservationRows = await admin.from('ranch_reservations').select('id').eq('unit', input.p_unit)
    .eq('arrival', input.p_arrival).eq('departure', input.p_departure);
  assert.ifError(reservationRows.error);
  assert.equal(reservationRows.data.length, 0);
  const avail = await anon.rpc('ranch_available_units', { p_arrival: arrival, p_departure: departure });
  assert.ifError(avail.error);
  assert.equal(avail.data.find((row) => row.unit_id === 'RV 05').is_available, true);
  const inbox = await staff.from('ranch_booking_requests').select('id,status,quoted_total').eq('id', first.data[0].request_id);
  assert.ifError(inbox.error);
  assert.equal(inbox.data.length, 1);
  code(await staff.rpc('ranch_decide_booking_request', {
    p_request_id: first.data[0].request_id, p_decision: 'PENDING', p_decision_note: null,
  }), 'WR400');
  const approved = await staff.rpc('ranch_decide_booking_request', {
    p_request_id: first.data[0].request_id, p_decision: 'APPROVED', p_decision_note: 'Synthetic approval',
  });
  assert.ifError(approved.error);
  assert.equal(approved.data[0].request_status, 'APPROVED');
  assert.ok(approved.data[0].reservation_id);
  const booking = await admin.from('ranch_reservations').select('id,total,status,nightly_rate').eq('id', approved.data[0].reservation_id).single();
  assert.ifError(booking.error);
  assert.equal(Number(booking.data.total), 275);
  assert.equal(Number(booking.data.nightly_rate), 50);
  assert.equal(booking.data.status, 'CONFIRMED');
  const afterApproval = await anon.rpc('ranch_available_units', { p_arrival: arrival, p_departure: departure });
  assert.ifError(afterApproval.error);
  assert.equal(afterApproval.data.find((row) => row.unit_id === 'RV 05').is_available, false);
  code(await staff.rpc('ranch_decide_booking_request', {
    p_request_id: first.data[0].request_id, p_decision: 'APPROVED', p_decision_note: null,
  }), 'WR409');
  code(await submit(draft({ p_email: contact('occupied') })), 'WR409');
});

test('rejection preserves history and creates no reservation', async () => {
  const pending = await submit(draft({ p_unit: 'Tent 01', p_stay_type: 'Tent Site', p_rv_service: null,
    p_arrival: laterArrival, p_departure: laterDeparture, p_email: contact('rejected') }));
  assert.ifError(pending.error);
  assert.equal(Number(pending.data[0].quoted_total), 175);
  const rejected = await staff.rpc('ranch_decide_booking_request', {
    p_request_id: pending.data[0].request_id, p_decision: 'REJECTED', p_decision_note: 'Synthetic rejection',
  });
  assert.ifError(rejected.error);
  const row = await admin.from('ranch_booking_requests').select('status,decided_at,decided_by,reservation_id')
    .eq('id', pending.data[0].request_id).single();
  assert.ifError(row.error);
  assert.equal(row.data.status, 'REJECTED');
  assert.ok(row.data.decided_at && row.data.decided_by);
  assert.equal(row.data.reservation_id, null);
  code(await staff.rpc('ranch_decide_booking_request', {
    p_request_id: pending.data[0].request_id, p_decision: 'APPROVED', p_decision_note: null,
  }), 'WR409');
});

test('staff approval rejects a changed stored quote without creating a booking', async () => {
  const pending = await submit(draft({ p_unit: 'RV 10', p_email: contact('stale-price'),
    p_arrival: laterArrival, p_departure: laterDeparture }));
  assert.ifError(pending.error);
  const changed = await admin.from('ranch_booking_requests').update({ quoted_total: 1 })
    .eq('id', pending.data[0].request_id);
  assert.ifError(changed.error);
  code(await staff.rpc('ranch_decide_booking_request', {
    p_request_id: pending.data[0].request_id, p_decision: 'APPROVED', p_decision_note: null,
  }), 'WR412');
  const row = await admin.from('ranch_booking_requests').select('status,reservation_id')
    .eq('id', pending.data[0].request_id).single();
  assert.ifError(row.error);
  assert.equal(row.data.status, 'PENDING');
  assert.equal(row.data.reservation_id, null);
});

test('same-contact fourth accepted submission is throttled', async () => {
  const email = contact('throttle');
  for (const unit of ['RV 01', 'RV 02', 'RV 03']) assert.ifError((await submit(draft({ p_unit: unit, p_email: email }))).error);
  code(await submit(draft({ p_unit: 'RV 04', p_email: email })), 'WR429');
});

test('concurrent approvals cannot double-book one site; losing request remains pending', async () => {
  const a = await submit(draft({ p_unit: 'RV 07', p_email: contact('race-a'), p_arrival: laterArrival, p_departure: laterDeparture }));
  const b = await submit(draft({ p_unit: 'RV 07', p_email: contact('race-b'), p_arrival: laterArrival, p_departure: laterDeparture }));
  assert.ifError(a.error); assert.ifError(b.error);
  const ids = [a.data[0].request_id, b.data[0].request_id];
  const outcomes = await Promise.all(ids.map((id) => staff.rpc('ranch_decide_booking_request', {
    p_request_id: id, p_decision: 'APPROVED', p_decision_note: null,
  })));
  assert.equal(outcomes.filter((result) => !result.error).length, 1);
  assert.equal(outcomes.filter((result) => !!result.error).length, 1);
  const bookings = await admin.from('ranch_reservations').select('id').eq('unit', 'RV 07')
    .eq('arrival', laterArrival).eq('departure', laterDeparture);
  assert.ifError(bookings.error);
  assert.equal(bookings.data.length, 1);
  const decisions = await admin.from('ranch_booking_requests').select('status,reservation_id').in('id', ids);
  assert.ifError(decisions.error);
  assert.deepEqual(decisions.data.map((row) => row.status).sort(), ['APPROVED', 'PENDING']);
});
