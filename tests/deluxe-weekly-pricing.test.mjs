import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateStayPricing, RANCH_CONFIG } from '../src/data/ranchConfig.ts';
import { calculateLiveStayPricing, calculateStaffStayPricing, canSaveLiveReservationPricing } from '../src/data/liveReservationPricing.ts';
import { LIVE_WEEKLY_RESERVATION_PRICING_ENABLED } from '../src/constants/feature-flags.ts';

for (const [nights, weeklyBlocks, remainingNights, total] of [
  [6, 0, 6, 270],
  [7, 1, 0, 200],
  [8, 1, 1, 245],
  [13, 1, 6, 470],
  [14, 2, 0, 400],
]) {
  test(`Deluxe: ${nights} nights costs $${total}`, () => {
    const price = calculateStayPricing({
      stayType: 'RV Site',
      rvService: 'Deluxe',
      nights,
    });
    assert.equal(price.nightlyRate, 45);
    assert.equal(price.weeklyBlocks, weeklyBlocks);
    assert.equal(price.remainingNights, remainingNights);
    assert.equal(price.total, total);
  });
}

test('ATV adds $75 once, including to a weekly Deluxe stay', () => {
  const price = calculateStayPricing({
    stayType: 'RV Site', rvService: 'Deluxe', nights: 8, atvAccess: true,
  });
  assert.equal(price.weeklyBlockTotal, 200);
  assert.equal(price.remainingNightlyTotal, 45);
  assert.equal(price.atvTotal, 75);
  assert.equal(price.total, 320);
});

test('non-Deluxe and rental RV rates match the website', () => {
  assert.deepEqual(
    [RANCH_CONFIG.pricing.rv.parkingOnly.nightly, RANCH_CONFIG.pricing.rv.parkingOnly.weekly],
    [25, 100],
  );
  assert.deepEqual(
    [RANCH_CONFIG.pricing.rv.electricWater.nightly, RANCH_CONFIG.pricing.rv.electricWater.weekly],
    [40, null],
  );
  assert.equal(calculateStayPricing({ stayType: 'Tent Site', nights: 7 }).total, 175);
  assert.equal(calculateStayPricing({ stayType: 'Small Rental RV', nights: 7 }).total, 693);
  assert.equal(calculateStayPricing({ stayType: 'Large Rental RV', nights: 7 }).total, 875);
});

test('no-hookup has a weekly rate and electric and water stays nightly', () => {
  const parking = calculateLiveStayPricing({ stayType: 'RV Site', rvService: 'Parking Only', nights: 7 });
  const electric = calculateLiveStayPricing({ stayType: 'RV Site', rvService: 'Electric + Water', nights: 8, atvAccess: true });
  assert.equal(parking.weeklyBlocks, 1);
  assert.equal(parking.total, 100);
  assert.equal(electric.weeklyBlocks, 0);
  assert.equal(electric.remainingNightlyTotal, 320);
  assert.equal(electric.atvTotal, 75);
  assert.equal(electric.total, 395);
  assert.equal(calculateLiveStayPricing({ stayType: 'RV Site', rvService: 'Deluxe', nights: 14 }).total, 400);
  assert.equal(RANCH_CONFIG.pricing.dayPass.primary, 10);
  assert.equal(RANCH_CONFIG.pricing.dayPass.additional, 10);
});

test('weekly live writes stay gated, including non-Deluxe rates', () => {
  const deluxe6 = calculateStayPricing({ stayType: 'RV Site', rvService: 'Deluxe', nights: 6 });
  const deluxe7 = calculateStayPricing({ stayType: 'RV Site', rvService: 'Deluxe', nights: 7 });
  const parking7 = calculateStayPricing({ stayType: 'RV Site', rvService: 'Parking Only', nights: 7 });
  const electric7 = calculateStayPricing({ stayType: 'RV Site', rvService: 'Electric + Water', nights: 7 });
  assert.equal(canSaveLiveReservationPricing(deluxe6, 'Deluxe', false), true);
  assert.equal(canSaveLiveReservationPricing(deluxe7, 'Deluxe', false), false);
  assert.equal(canSaveLiveReservationPricing(deluxe7, 'Deluxe', true), true);
  assert.equal(canSaveLiveReservationPricing(parking7, 'Parking Only', true), false);
  assert.equal(canSaveLiveReservationPricing(electric7, 'Electric + Water', true), true);
});

test('the verified live flag enables Deluxe weekly totals only', () => {
  assert.equal(LIVE_WEEKLY_RESERVATION_PRICING_ENABLED, true);
  const deluxe7 = calculateStayPricing({ stayType: 'RV Site', rvService: 'Deluxe', nights: 7 });
  const parking7 = calculateStayPricing({ stayType: 'RV Site', rvService: 'Parking Only', nights: 7 });
  assert.equal(canSaveLiveReservationPricing(deluxe7, 'Deluxe', LIVE_WEEKLY_RESERVATION_PRICING_ENABLED), true);
  assert.equal(canSaveLiveReservationPricing(parking7, 'Parking Only', LIVE_WEEKLY_RESERVATION_PRICING_ENABLED), false);
});

test('staff quote uses the database rate schedule until the website migration is verified', () => {
  const parking = { stayType: 'RV Site', rvService: 'Parking Only', nights: 8 };
  const deluxe = { stayType: 'RV Site', rvService: 'Deluxe', nights: 8 };
  assert.equal(calculateStaffStayPricing(parking).total, 200);
  assert.equal(calculateStaffStayPricing(deluxe).total, 250);
  const original = process.env.EXPO_PUBLIC_WEBSITE_RATES_VERIFIED;
  process.env.EXPO_PUBLIC_WEBSITE_RATES_VERIFIED = 'true';
  try {
    assert.equal(calculateStaffStayPricing(parking).total, 125);
    assert.equal(calculateStaffStayPricing(deluxe).total, 245);
    assert.equal(canSaveLiveReservationPricing(calculateStaffStayPricing(parking), 'Parking Only', true), true);
  } finally {
    if (original === undefined) delete process.env.EXPO_PUBLIC_WEBSITE_RATES_VERIFIED;
    else process.env.EXPO_PUBLIC_WEBSITE_RATES_VERIFIED = original;
  }
});
