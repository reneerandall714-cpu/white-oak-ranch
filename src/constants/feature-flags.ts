/** Live reservation listing and reviewed staff creation are enabled separately. */
export const LIVE_RESERVATIONS_ENABLED = true;

export const LIVE_RESERVATION_WRITES_ENABLED = true;

// Enabled after verifying the applied Deluxe-only ranch_total_matches migration.
// Other RV weekly totals remain unavailable to live staff creation.
export const LIVE_WEEKLY_RESERVATION_PRICING_ENABLED = true;

// Enable only after the reviewed public availability RPC is installed and its
// anonymous grants/output are verified. Never fall back to private table reads.
export const PUBLIC_AVAILABILITY_ENABLED = false;
