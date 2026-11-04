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
const dayPasses = [];
let fullPaymentId;
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
  for (const table of ['ranch_staff', 'ranch_reservations', 'ranch_booking_requests', 'ranch_payments', 'ranch_day_pass_orders']) {
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
  if (requests.length) {
    const paymentRows = await admin.from('ranch_payments').select('id').in('request_id', [...new Set(requests)]);
    if (!paymentRows.error && paymentRows.data.length) {
      const ids = paymentRows.data.map((row) => row.id);
      assert.ifError((await admin.from('ranch_refund_intents').delete().in('payment_id', ids)).error);
      assert.ifError((await admin.from('ranch_payment_refunds').delete().in('payment_id', ids)).error);
      assert.ifError((await admin.from('ranch_payments').delete().in('id', ids)).error);
    }
  }
  if (dayPasses.length) {
    const paymentRows = await admin.from('ranch_payments').select('id').in('day_pass_id', dayPasses);
    if (!paymentRows.error && paymentRows.data.length) {
      const ids = paymentRows.data.map((row) => row.id);
      assert.ifError((await admin.from('ranch_refund_intents').delete().in('payment_id', ids)).error);
      assert.ifError((await admin.from('ranch_payment_refunds').delete().in('payment_id', ids)).error);
      assert.ifError((await admin.from('ranch_payments').delete().in('id', ids)).error);
    }
    assert.ifError((await admin.from('ranch_day_pass_orders').delete().in('id', dayPasses)).error);
  }
  assert.ifError((await admin.from('ranch_payment_events').delete().like('event_id', 'test:' + runId + ':%')).error);
  if (requests.length) assert.ifError((await admin.from('ranch_payment_cancellations').delete().in('request_id', [...new Set(requests)])).error);
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
  for (const table of ['ranch_booking_requests', 'ranch_reservations', 'ranch_staff',
    'ranch_staging_marker', 'ranch_payments', 'ranch_day_pass_orders',
    'ranch_payment_events', 'ranch_payment_refunds', 'ranch_refund_intents']) {
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

test('staff direct reservation INSERT and UPDATE remain ungranted', async () => {
  const user = await staff.auth.getUser();
  const inserted = await staff.from('ranch_reservations').insert({
    guest_name: 'STAGING TEST ONLY', phone: null, unit: 'RV 06',
    stay_type: 'RV Site', rv_service: 'Parking Only',
    arrival: laterArrival, departure: laterDeparture, guests: 1, atv_access: false,
    nightly_rate: 25, total: 175, status: 'CONFIRMED',
    created_by: user.data.user.id,
  });
  assert.ok(inserted.error, 'staff direct INSERT unexpectedly succeeded');
  const updated = await staff.from('ranch_reservations').update({ status: 'CANCELLED' })
    .eq('id', randomUUID()).select();
  assert.ok(updated.error || updated.data.length === 0, 'staff direct UPDATE unexpectedly succeeded');
});

test('only an owner can change deposit and day pass settings', async () => {
  const staffUser = await staff.auth.getUser();
  const ordinaryUpdate = await ordinary.from('ranch_payment_settings')
    .update({ deposit_type: 'PERCENT', deposit_value: 10 }).eq('id', true).select('deposit_type');
  assert.ok(ordinaryUpdate.error || ordinaryUpdate.data.length === 0);
  const staffUpdate = await staff.from('ranch_payment_settings')
    .update({ deposit_type: 'PERCENT', deposit_value: 10 }).eq('id', true).select('deposit_type');
  assert.ok(staffUpdate.error || staffUpdate.data.length === 0);
  assert.ifError((await admin.from('ranch_staff').update({ role: 'owner' })
    .eq('user_id', staffUser.data.user.id)).error);
  const ownerUpdate = await staff.from('ranch_payment_settings').update({
    deposit_type: 'PERCENT', deposit_value: 10, balance_due_days_before_arrival: 7,
  }).eq('id', true).select('deposit_type,deposit_value').single();
  assert.ifError(ownerUpdate.error);
  assert.equal(ownerUpdate.data.deposit_type, 'PERCENT');
  assert.equal(Number(ownerUpdate.data.deposit_value), 10);
  assert.ifError((await staff.from('ranch_payment_settings').update({
    deposit_type: 'FULL', deposit_value: 0, balance_due_days_before_arrival: 0,
  }).eq('id', true)).error);
  assert.ifError((await admin.from('ranch_staff').update({ role: 'staff' })
    .eq('user_id', staffUser.data.user.id)).error);
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
  assert.equal(approved.data[0].request_status, 'AWAITING_PAYMENT');
  assert.ok(approved.data[0].reservation_id);
  const booking = await admin.from('ranch_reservations').select('id,total,status,nightly_rate').eq('id', approved.data[0].reservation_id).single();
  assert.ifError(booking.error);
  assert.equal(Number(booking.data.total), 275);
  assert.equal(Number(booking.data.nightly_rate), 50);
  assert.equal(booking.data.status, 'PENDING');
  const token = await admin.from('ranch_booking_requests').select('checkout_token')
    .eq('id', first.data[0].request_id).single();
  assert.ifError(token.error);
  const prepared = await admin.rpc('ranch_prepare_initial_payment', {
    p_token: token.data.checkout_token, p_choice: 'FULL',
  });
  assert.ifError(prepared.error);
  assert.equal(prepared.data[0].amount_cents, 27500);
  assert.equal(prepared.data[0].balance_cents, 0);
  const paymentId = prepared.data[0].payment_id;
  fullPaymentId = paymentId;
  const orderId = 'test-' + runId + '-full';
  assert.ifError((await admin.rpc('ranch_attach_square_link', {
    p_payment_id: paymentId, p_link_id: 'link-' + runId + '-full',
    p_order_id: orderId, p_url: 'https://sandbox.square.link/u/SYNTHETIC',
  })).error);
  const paid = await admin.rpc('ranch_record_square_payment', {
    p_event_id: 'test:' + runId + ':full', p_event_type: 'payment.updated',
    p_order_id: orderId, p_square_payment_id: 'pay-' + runId + '-full',
    p_amount_cents: 27500, p_status: 'COMPLETED',
    p_receipt_url: 'https://squareup.com/receipt/SYNTHETIC', p_receipt_number: 'TEST',
  });
  assert.ifError(paid.error);
  assert.equal(paid.data, 'confirmed');
  const replayed = await admin.rpc('ranch_record_square_payment', {
    p_event_id: 'test:' + runId + ':full', p_event_type: 'payment.updated',
    p_order_id: orderId, p_square_payment_id: 'pay-' + runId + '-full',
    p_amount_cents: 27500, p_status: 'COMPLETED',
    p_receipt_url: null, p_receipt_number: null,
  });
  assert.ifError(replayed.error);
  assert.equal(replayed.data, 'duplicate');
  const confirmed = await admin.from('ranch_reservations').select('status').eq('id', booking.data.id).single();
  assert.equal(confirmed.data.status, 'CONFIRMED');
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
  assert.deepEqual(decisions.data.map((row) => row.status).sort(), ['AWAITING_PAYMENT', 'PENDING']);
});

test('deposit confirms only after initial payment; a separate balance link settles the remainder', async () => {
  assert.ifError((await admin.from('ranch_payment_settings').update({
    deposit_type: 'PERCENT', deposit_value: 25, balance_due_days_before_arrival: 7,
  }).eq('id', true)).error);
  const submitted = await submit(draft({ p_unit: 'RV 08', p_email: contact('deposit') }));
  assert.ifError(submitted.error);
  const id = submitted.data[0].request_id;
  assert.ifError((await staff.rpc('ranch_decide_booking_request', {
    p_request_id: id, p_decision: 'APPROVED', p_decision_note: null,
  })).error);
  const row = await admin.from('ranch_booking_requests').select('checkout_token,reservation_id').eq('id', id).single();
  const prepared = await admin.rpc('ranch_prepare_initial_payment', {
    p_token: row.data.checkout_token, p_choice: 'DEPOSIT',
  });
  assert.ifError(prepared.error);
  assert.equal(prepared.data[0].amount_cents, 5000);
  assert.equal(prepared.data[0].balance_cents, 15000);
  const before = await admin.from('ranch_reservations').select('status').eq('id', row.data.reservation_id).single();
  assert.equal(before.data.status, 'PENDING');
  assert.ifError((await admin.rpc('ranch_attach_square_link', {
    p_payment_id: prepared.data[0].payment_id, p_link_id: 'link-' + runId + '-deposit',
    p_order_id: 'test-' + runId + '-deposit', p_url: 'https://sandbox.square.link/u/SYNTHETIC',
  })).error);
  assert.ifError((await admin.rpc('ranch_record_square_payment', {
    p_event_id: 'test:' + runId + ':deposit', p_event_type: 'payment.updated',
    p_order_id: 'test-' + runId + '-deposit', p_square_payment_id: 'pay-' + runId + '-deposit',
    p_amount_cents: 5000, p_status: 'COMPLETED', p_receipt_url: null, p_receipt_number: null,
  })).error);
  const after = await admin.from('ranch_booking_requests').select('status,balance_due_cents,balance_due_on')
    .eq('id', id).single();
  assert.equal(after.data.status, 'APPROVED');
  assert.equal(after.data.balance_due_cents, 15000);
  assert.ok(after.data.balance_due_on);
  const balance = await admin.rpc('ranch_prepare_balance_payment', { p_request_id: id });
  assert.ifError(balance.error);
  assert.equal(balance.data[0].amount_cents, 15000);
  assert.notEqual(balance.data[0].payment_id, prepared.data[0].payment_id);
  assert.ifError((await admin.rpc('ranch_attach_square_link', {
    p_payment_id: balance.data[0].payment_id, p_link_id: 'link-' + runId + '-balance',
    p_order_id: 'test-' + runId + '-balance', p_url: 'https://sandbox.square.link/u/SYNTHETIC',
  })).error);
  assert.ifError((await admin.rpc('ranch_record_square_payment', {
    p_event_id: 'test:' + runId + ':balance', p_event_type: 'payment.updated',
    p_order_id: 'test-' + runId + '-balance', p_square_payment_id: 'pay-' + runId + '-balance',
    p_amount_cents: 15000, p_status: 'COMPLETED', p_receipt_url: null, p_receipt_number: null,
  })).error);
  const settled = await admin.from('ranch_booking_requests').select('balance_due_cents').eq('id', id).single();
  assert.equal(settled.data.balance_due_cents, 0);
});

test('failed checkout and expired link never confirm a reservation', async () => {
  const submitted = await submit(draft({ p_unit: 'RV 09', p_email: contact('failed') }));
  assert.ifError(submitted.error);
  const id = submitted.data[0].request_id;
  assert.ifError((await staff.rpc('ranch_decide_booking_request', {
    p_request_id: id, p_decision: 'APPROVED', p_decision_note: null,
  })).error);
  const row = await admin.from('ranch_booking_requests').select('checkout_token,reservation_id').eq('id', id).single();
  const prep = await admin.rpc('ranch_prepare_initial_payment', {
    p_token: row.data.checkout_token, p_choice: 'FULL',
  });
  assert.ifError(prep.error);
  assert.ifError((await admin.rpc('ranch_attach_square_link', {
    p_payment_id: prep.data[0].payment_id, p_link_id: 'link-' + runId + '-failed',
    p_order_id: 'test-' + runId + '-failed', p_url: 'https://sandbox.square.link/u/SYNTHETIC',
  })).error);
  assert.ifError((await admin.rpc('ranch_record_square_payment', {
    p_event_id: 'test:' + runId + ':failed', p_event_type: 'payment.updated',
    p_order_id: 'test-' + runId + '-failed', p_square_payment_id: 'pay-' + runId + '-failed',
    p_amount_cents: 20000, p_status: 'FAILED', p_receipt_url: null, p_receipt_number: null,
  })).error);
  const held = await admin.from('ranch_reservations').select('status').eq('id', row.data.reservation_id).single();
  assert.equal(held.data.status, 'PENDING');
  assert.ifError((await admin.from('ranch_booking_requests').update({
    hold_expires_at: new Date(Date.now() - 3600000).toISOString(),
  }).eq('id', id)).error);
  assert.ifError((await admin.rpc('ranch_mark_square_link_expired', {
    p_payment_id: prep.data[0].payment_id,
  })).error);
  assert.ifError((await admin.from('ranch_payments').update({
    closed_at: new Date(Date.now() - 600000).toISOString(),
  }).eq('id', prep.data[0].payment_id)).error);
  const expired = await admin.rpc('ranch_expire_unpaid_hold', { p_request_id: id });
  assert.ifError(expired.error);
  assert.equal(expired.data, true);
  const cancelled = await admin.from('ranch_reservations').select('status').eq('id', row.data.reservation_id).single();
  assert.equal(cancelled.data.status, 'CANCELLED');
});

test('amount mismatch is flagged and cannot subsequently auto-confirm', async () => {
  const submitted = await submit(draft({ p_unit: 'RV 11', p_email: contact('refund') }));
  assert.ifError(submitted.error);
  const id = submitted.data[0].request_id;
  assert.ifError((await staff.rpc('ranch_decide_booking_request', {
    p_request_id: id, p_decision: 'APPROVED', p_decision_note: null,
  })).error);
  const row = await admin.from('ranch_booking_requests').select('checkout_token,reservation_id').eq('id', id).single();
  const prep = await admin.rpc('ranch_prepare_initial_payment', {
    p_token: row.data.checkout_token, p_choice: 'FULL',
  });
  const paymentId = prep.data[0].payment_id;
  assert.ifError((await admin.rpc('ranch_attach_square_link', {
    p_payment_id: paymentId, p_link_id: 'link-' + runId + '-refund',
    p_order_id: 'test-' + runId + '-refund', p_url: 'https://sandbox.square.link/u/SYNTHETIC',
  })).error);
  const mismatch = await admin.rpc('ranch_record_square_payment', {
    p_event_id: 'test:' + runId + ':mismatch', p_event_type: 'payment.updated',
    p_order_id: 'test-' + runId + '-refund', p_square_payment_id: 'pay-' + runId + '-refund',
    p_amount_cents: 1, p_status: 'COMPLETED', p_receipt_url: null, p_receipt_number: null,
  });
  assert.ifError(mismatch.error);
  assert.equal(mismatch.data, 'amount_mismatch');
  const unconfirmed = await admin.from('ranch_reservations').select('status').eq('id', row.data.reservation_id).single();
  assert.equal(unconfirmed.data.status, 'PENDING');
  const correct = await admin.rpc('ranch_record_square_payment', {
    p_event_id: 'test:' + runId + ':corrected', p_event_type: 'payment.updated',
    p_order_id: 'test-' + runId + '-refund', p_square_payment_id: 'pay-' + runId + '-refund',
    p_amount_cents: 20000, p_status: 'COMPLETED', p_receipt_url: null, p_receipt_number: null,
  });
  assert.ifError(correct.error);
  assert.equal(correct.data, 'review_blocked');
  const stillHeld = await admin.from('ranch_reservations').select('status').eq('id', row.data.reservation_id).single();
  assert.equal(stillHeld.data.status, 'PENDING');
});

test('verified refund remains visible for staff review', async () => {
  const linked = await admin.from('ranch_payments').select('request_id').eq('id', fullPaymentId).single();
  const staffUser = await staff.auth.getUser();
  const intent = await admin.rpc('ranch_prepare_refund', {
    p_payment_id: fullPaymentId, p_amount_cents: 27500,
    p_reason: 'Synthetic refund', p_staff_id: staffUser.data.user.id,
  });
  assert.ok(intent.error, 'staff role prepared a refund');
  assert.ifError((await admin.from('ranch_staff').update({ role: 'owner' })
    .eq('user_id', staffUser.data.user.id)).error);
  const prepared = await admin.rpc('ranch_prepare_refund', {
    p_payment_id: fullPaymentId, p_amount_cents: 27500,
    p_reason: 'Synthetic refund', p_staff_id: staffUser.data.user.id,
  });
  assert.ifError(prepared.error);
  const replay = await admin.rpc('ranch_prepare_refund', {
    p_payment_id: fullPaymentId, p_amount_cents: 27500,
    p_reason: 'Synthetic refund', p_staff_id: staffUser.data.user.id,
  });
  assert.ifError(replay.error);
  assert.equal(replay.data, prepared.data);
  assert.ifError((await admin.rpc('ranch_attach_refund', {
    p_intent_id: prepared.data, p_square_refund_id: 'refund-' + runId, p_status: 'PENDING',
  })).error);
  const refunded = await admin.rpc('ranch_record_square_refund', {
    p_event_id: 'test:' + runId + ':refunded', p_type: 'refund.updated',
    p_refund_id: 'refund-' + runId, p_square_payment_id: 'pay-' + runId + '-full',
    p_amount_cents: 27500, p_status: 'COMPLETED',
  });
  assert.ifError(refunded.error);
  const payment = await admin.from('ranch_payments').select('status,refunded_cents,requires_review')
    .eq('id', fullPaymentId).single();
  assert.equal(payment.data.status, 'REFUNDED');
  assert.equal(payment.data.refunded_cents, 27500);
  assert.equal(payment.data.requires_review, true);
  const cancelled = await staff.rpc('ranch_cancel_paid_booking', {
    p_request_id: linked.data.request_id, p_reason: 'Synthetic cancellation',
  });
  assert.ifError(cancelled.error);
  assert.equal(cancelled.data, true);
  const history = await admin.from('ranch_payment_cancellations').select('reason')
    .eq('request_id', linked.data.request_id).single();
  assert.equal(history.data.reason, 'Synthetic cancellation');
  assert.ifError((await admin.from('ranch_staff').update({ role: 'staff' })
    .eq('user_id', staffUser.data.user.id)).error);
});

test('an open balance link blocks cancellation and a late payment requires review', async () => {
  assert.ifError((await admin.from('ranch_payment_settings').update({
    deposit_type: 'PERCENT', deposit_value: 25, balance_due_days_before_arrival: 7,
  }).eq('id', true)).error);
  const submitted = await submit(draft({ p_unit: 'RV 03', p_arrival: laterArrival,
    p_departure: laterDeparture, p_email: contact('cancel-balance') }));
  assert.ifError(submitted.error);
  const id = submitted.data[0].request_id;
  assert.ifError((await staff.rpc('ranch_decide_booking_request', {
    p_request_id: id, p_decision: 'APPROVED', p_decision_note: null,
  })).error);
  const request = await admin.from('ranch_booking_requests').select('checkout_token,reservation_id')
    .eq('id', id).single();
  const initial = await admin.rpc('ranch_prepare_initial_payment', {
    p_token: request.data.checkout_token, p_choice: 'DEPOSIT',
  });
  assert.ifError(initial.error);
  const deposit = initial.data[0];
  assert.ifError((await admin.rpc('ranch_attach_square_link', {
    p_payment_id: deposit.payment_id, p_link_id: 'link-' + runId + '-cancel-deposit',
    p_order_id: 'test-' + runId + '-cancel-deposit', p_url: 'https://sandbox.square.link/u/SYNTHETIC',
  })).error);
  assert.ifError((await admin.rpc('ranch_record_square_payment', {
    p_event_id: 'test:' + runId + ':cancel-deposit', p_event_type: 'payment.updated',
    p_order_id: 'test-' + runId + '-cancel-deposit',
    p_square_payment_id: 'pay-' + runId + '-cancel-deposit',
    p_amount_cents: deposit.amount_cents, p_status: 'COMPLETED',
    p_receipt_url: null, p_receipt_number: null,
  })).error);
  const balance = await admin.rpc('ranch_prepare_balance_payment', { p_request_id: id });
  assert.ifError(balance.error);
  assert.ifError((await admin.rpc('ranch_attach_square_link', {
    p_payment_id: balance.data[0].payment_id, p_link_id: 'link-' + runId + '-cancel-balance',
    p_order_id: 'test-' + runId + '-cancel-balance', p_url: 'https://sandbox.square.link/u/SYNTHETIC',
  })).error);
  assert.ifError((await admin.rpc('ranch_record_square_refund', {
    p_event_id: 'test:' + runId + ':cancel-refund', p_type: 'refund.updated',
    p_refund_id: 'refund-' + runId + '-cancel',
    p_square_payment_id: 'pay-' + runId + '-cancel-deposit',
    p_amount_cents: deposit.amount_cents, p_status: 'COMPLETED',
  })).error);
  const staffUser = await staff.auth.getUser();
  assert.ifError((await admin.from('ranch_staff').update({ role: 'owner' })
    .eq('user_id', staffUser.data.user.id)).error);
  code(await staff.rpc('ranch_cancel_paid_booking', {
    p_request_id: id, p_reason: 'Synthetic cancellation',
  }), 'WR409');
  assert.ifError((await admin.rpc('ranch_mark_square_link_expired', {
    p_payment_id: balance.data[0].payment_id,
  })).error);
  code(await staff.rpc('ranch_cancel_paid_booking', {
    p_request_id: id, p_reason: 'Synthetic cancellation',
  }), 'WR409');
  assert.ifError((await admin.from('ranch_payments').update({
    closed_at: new Date(Date.now() - 600000).toISOString(),
  }).eq('id', balance.data[0].payment_id)).error);
  const cancelled = await staff.rpc('ranch_cancel_paid_booking', {
    p_request_id: id, p_reason: 'Synthetic cancellation',
  });
  assert.ifError(cancelled.error); assert.equal(cancelled.data, true);
  assert.equal((await admin.from('ranch_reservations').select('status')
    .eq('id', request.data.reservation_id).single()).data.status, 'CANCELLED');
  const late = await admin.rpc('ranch_record_square_payment', {
    p_event_id: 'test:' + runId + ':late-balance', p_event_type: 'payment.updated',
    p_order_id: 'test-' + runId + '-cancel-balance',
    p_square_payment_id: 'pay-' + runId + '-cancel-balance',
    p_amount_cents: balance.data[0].amount_cents, p_status: 'COMPLETED',
    p_receipt_url: null, p_receipt_number: null,
  });
  assert.ifError(late.error); assert.equal(late.data, 'late_balance_for_cancelled_booking');
  assert.equal((await admin.from('ranch_payments').select('status,requires_review')
    .eq('id', balance.data[0].payment_id).single()).data.status, 'REVIEW');
  assert.ifError((await admin.from('ranch_staff').update({ role: 'staff' })
    .eq('user_id', staffUser.data.user.id)).error);
});

test('day pass server price and payment status use owner settings', async () => {
  assert.ifError((await admin.from('ranch_payment_settings').update({
    day_pass_enabled: true, day_pass_primary_cents: 1500,
    day_pass_additional_cents: 1000, atv_day_cents: 5000,
  }).eq('id', true)).error);
  const prepared = await admin.rpc('ranch_prepare_day_pass', {
    p_key: randomUUID(), p_name: 'Synthetic Day Guest', p_email: contact('day-pass'),
    p_visit_date: datePlus(3), p_additional: 2, p_atv: true,
  });
  assert.ifError(prepared.error);
  assert.equal(prepared.data[0].amount_cents, 8500);
  const paymentId = prepared.data[0].payment_id;
  const row = await admin.from('ranch_payments').select('day_pass_id').eq('id', paymentId).single();
  dayPasses.push(row.data.day_pass_id);
  assert.ifError((await admin.rpc('ranch_attach_square_link', {
    p_payment_id: paymentId, p_link_id: 'link-' + runId + '-day-pass',
    p_order_id: 'test-' + runId + '-day-pass', p_url: 'https://sandbox.square.link/u/SYNTHETIC',
  })).error);
  assert.ifError((await admin.rpc('ranch_record_square_payment', {
    p_event_id: 'test:' + runId + ':day-pass', p_event_type: 'payment.updated',
    p_order_id: 'test-' + runId + '-day-pass', p_square_payment_id: 'pay-' + runId + '-day-pass',
    p_amount_cents: 8500, p_status: 'COMPLETED', p_receipt_url: null, p_receipt_number: null,
  })).error);
  const pass = await admin.from('ranch_day_pass_orders').select('status').eq('id', row.data.day_pass_id).single();
  assert.equal(pass.data.status, 'PAID');
});

test('expired day pass link cancels the pass; delayed payment is flagged', async () => {
  const prepared = await admin.rpc('ranch_prepare_day_pass', {
    p_key: randomUUID(), p_name: 'Synthetic Late Guest', p_email: contact('late-pass'),
    p_visit_date: datePlus(1), p_additional: 0, p_atv: false,
  });
  assert.ifError(prepared.error);
  const paymentId = prepared.data[0].payment_id;
  const row = await admin.from('ranch_payments').select('day_pass_id').eq('id', paymentId).single();
  dayPasses.push(row.data.day_pass_id);
  assert.ifError((await admin.rpc('ranch_attach_square_link', {
    p_payment_id: paymentId, p_link_id: 'link-' + runId + '-late-pass',
    p_order_id: 'test-' + runId + '-late-pass', p_url: 'https://sandbox.square.link/u/SYNTHETIC',
  })).error);
  assert.ifError((await admin.from('ranch_day_pass_orders').update({ visit_date: datePlus(-1) })
    .eq('id', row.data.day_pass_id)).error);
  assert.ifError((await admin.rpc('ranch_mark_square_link_expired', { p_payment_id: paymentId })).error);
  assert.ifError((await admin.from('ranch_payments').update({
    closed_at: new Date(Date.now() - 600000).toISOString(),
  }).eq('id', paymentId)).error);
  const expired = await admin.rpc('ranch_expire_day_pass', { p_day_pass_id: row.data.day_pass_id });
  assert.ifError(expired.error); assert.equal(expired.data, true);
  const late = await admin.rpc('ranch_record_square_payment', {
    p_event_id: 'test:' + runId + ':late-pass', p_event_type: 'payment.updated',
    p_order_id: 'test-' + runId + '-late-pass',
    p_square_payment_id: 'pay-' + runId + '-late-pass',
    p_amount_cents: 1500, p_status: 'COMPLETED',
    p_receipt_url: null, p_receipt_number: null,
  });
  assert.ifError(late.error); assert.equal(late.data, 'late_day_pass_payment');
  const review = await admin.from('ranch_payments').select('status,requires_review').eq('id', paymentId).single();
  assert.equal(review.data.status, 'REVIEW');
  assert.equal(review.data.requires_review, true);
});
