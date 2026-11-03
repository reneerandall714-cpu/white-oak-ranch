/** Live reservation listing and reviewed staff creation are enabled separately. */
export const LIVE_RESERVATIONS_ENABLED = true;

export const LIVE_RESERVATION_WRITES_ENABLED = true;

// Enabled after verifying the applied Deluxe-only ranch_total_matches migration.
// Other RV weekly totals remain unavailable to live staff creation.
export const LIVE_WEEKLY_RESERVATION_PRICING_ENABLED = true;

// Enabled after remote migration 20261103005539 passed anonymous API tests.
// This is read-only. Never fall back to private table reads or enable customer writes.
export const PUBLIC_AVAILABILITY_ENABLED = true;

// Migration 20261103012314 is review-only. Do not enable until installed,
// permissions and anonymous/staff flows are verified in a staging clone.
export const CUSTOMER_REQUEST_SUBMISSION_ENABLED = false;
export const STAFF_BOOKING_REQUESTS_ENABLED = false;
