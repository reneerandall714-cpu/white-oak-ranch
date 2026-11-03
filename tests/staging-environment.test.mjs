import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { isIsolatedStagingTarget, STAGING_BOOKING_REQUESTS_ENABLED } from '../src/constants/staging-environment.ts';

test('staging guard rejects production, deceptive hosts and credentials', () => {
  const ref = 'abcdefghijklmnopqrst';
  assert.equal(isIsolatedStagingTarget('https://wagmelaupruptnzwjjta.supabase.co', 'wagmelaupruptnzwjjta'), false);
  assert.equal(isIsolatedStagingTarget('https://wagmelaupruptnzwjjta.supabase.co', ref), false);
  assert.equal(isIsolatedStagingTarget(`https://${ref}.supabase.co.evil.test`, ref), false);
  assert.equal(isIsolatedStagingTarget(`https://${ref}.supabase.co/private`, ref), false);
  assert.equal(isIsolatedStagingTarget(`https://user:password@${ref}.supabase.co`, ref), false);
  assert.equal(isIsolatedStagingTarget('http://localhost:54321', ref), false);
  assert.equal(isIsolatedStagingTarget(undefined, ref), false);
});

test('staging guard accepts only explicit isolated cloud or loopback targets', () => {
  const ref = 'abcdefghijklmnopqrst';
  assert.equal(isIsolatedStagingTarget(`https://${ref}.supabase.co`, ref), true);
  assert.equal(isIsolatedStagingTarget('http://127.0.0.1:54321', undefined), true);
  assert.equal(STAGING_BOOKING_REQUESTS_ENABLED, false);
});

test('staging baseline contains only unit definitions and reviewed schema prerequisites', () => {
  const baseline = readFileSync(new URL('../staging/00_ranch_baseline.sql', import.meta.url), 'utf8');
  assert.match(baseline, /create extension if not exists btree_gist/);
  assert.match(baseline, /WHITE_OAK_STAGING_ONLY_2026/);
  assert.match(baseline, /constraint ranch_no_overlapping_stays exclude using gist/);
  assert.match(baseline, /alter table public\.ranch_reservations enable row level security/);
  assert.match(baseline, /revoke all on public\.ranch_staff, public\.ranch_units, public\.ranch_reservations from public, anon, authenticated/);
  assert.equal((baseline.match(/\('RV \d\d','RV Site'\)/g) ?? []).length, 11);
  assert.equal((baseline.match(/\('Tent \d\d','Tent Site'\)/g) ?? []).length, 10);
  assert.doesNotMatch(baseline, /insert into public\.ranch_reservations|insert into public\.ranch_staff/i);
  assert.doesNotMatch(baseline, /bookingstest|@|wagmelaupruptnzwjjta\.supabase\.co/i);
});
