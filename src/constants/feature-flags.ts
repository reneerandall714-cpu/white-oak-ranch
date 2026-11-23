import { STAGING_BOOKING_REQUESTS_ENABLED } from './staging-environment.ts';

/** Live reservation listing and reviewed staff creation are enabled separately. */
export const LIVE_RESERVATIONS_ENABLED = true;

export const LIVE_RESERVATION_WRITES_ENABLED = true;

// The existing backend supports the Deluxe weekly total. No-hookup weekly
// staff writes also require verified website rates on the target database.
export const LIVE_WEEKLY_RESERVATION_PRICING_ENABLED = true;

// Enabled after remote migration 20261103005539 passed anonymous API tests.
// This is read-only. Never fall back to private table reads or enable customer writes.
export const PUBLIC_AVAILABILITY_ENABLED = true;

// Both remain off in production. Staging requires an isolated URL and an
// explicit post-integration-test opt-in; never set that opt-in before tests pass.
// Square Sandbox remains off until an isolated backend, signed webhook, and
// expiration reconciliation have been exercised with synthetic payments.
export const SQUARE_SANDBOX_CHECKOUT_ENABLED = STAGING_BOOKING_REQUESTS_ENABLED
  && process.env.EXPO_PUBLIC_WEBSITE_RATES_VERIFIED === 'true'
  && process.env.EXPO_PUBLIC_SQUARE_SANDBOX_VERIFIED === 'true';
export const CUSTOMER_REQUEST_SUBMISSION_ENABLED = SQUARE_SANDBOX_CHECKOUT_ENABLED;
export const STAFF_BOOKING_REQUESTS_ENABLED = SQUARE_SANDBOX_CHECKOUT_ENABLED;
