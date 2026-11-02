import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateStayPricing, RANCH_CONFIG } from '../src/data/ranchConfig.ts';
import { canSaveLiveReservationPricing } from '../src/data/liveReservationPricing.ts';
import { LIVE_WEEKLY_RESERVATION_PRICING_ENABLED } from '../src/constants/feature-flags.ts';

for (const [nights, weeklyBlocks, remainingNights, total] of [
  [6, 0, 6, 300],
  [7, 1, 0, 200],
  [8, 1, 1, 250],
  [13, 1, 6, 500],
  [14, 2, 0, 400],
]) {
  test(`Deluxe: ${nights} nights costs $${total}`, () => {
    const price = calculateStayPricing({
      stayType: 'RV Site',
      rvService: 'Deluxe',
      nights,
    });
    assert.equal(price.nightlyRate, 50);
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
  assert.equal(price.remainingNightlyTotal, 50);
  assert.equal(price.atvTotal, 75);
  assert.equal(price.total, 325);
});

test('non-Deluxe and non-RV rates remain configured as before', () => {
  assert.deepEqual(
    [RANCH_CONFIG.pricing.rv.parkingOnly.nightly, RANCH_CONFIG.pricing.rv.parkingOnly.weekly],
    [25, 150],
  );
  assert.deepEqual(
    [RANCH_CONFIG.pricing.rv.electricWater.nightly, RANCH_CONFIG.pricing.rv.electricWater.weekly],
    [40, 225],
  );
  assert.equal(calculateStayPricing({ stayType: 'Tent Site', nights: 7 }).total, 175);
  assert.equal(calculateStayPricing({ stayType: 'Small Rental RV', nights: 7 }).total, 525);
  assert.equal(calculateStayPricing({ stayType: 'Large Rental RV', nights: 7 }).total, 693);
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
  assert.equal(canSaveLiveReservationPricing(electric7, 'Electric + Water', true), false);
});

test('the verified live flag enables Deluxe weekly totals only', () => {
  assert.equal(LIVE_WEEKLY_RESERVATION_PRICING_ENABLED, true);
  const deluxe7 = calculateStayPricing({ stayType: 'RV Site', rvService: 'Deluxe', nights: 7 });
  const parking7 = calculateStayPricing({ stayType: 'RV Site', rvService: 'Parking Only', nights: 7 });
  assert.equal(canSaveLiveReservationPricing(deluxe7, 'Deluxe', LIVE_WEEKLY_RESERVATION_PRICING_ENABLED), true);
  assert.equal(canSaveLiveReservationPricing(parking7, 'Parking Only', LIVE_WEEKLY_RESERVATION_PRICING_ENABLED), false);
});
