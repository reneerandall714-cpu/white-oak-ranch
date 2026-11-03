# White Oak Ranch launch readiness

Status: public availability is live and read-only. The customer booking request form and protected staff inbox are implemented behind **disabled** flags. Customer booking remains a preview: it does not save, hold, confirm, or charge anything. Preserve the existing confirmed RV 05 stay on November 15–22, 2026.

## Job #10: request intake prepared, not activated

- Review-only migration: [20261103012314_booking_requests.sql](../supabase/migrations/20261103012314_booking_requests.sql). It has **not** been applied. Do not use `supabase db push` or deploy the older inventory/reservations migration.
- The migration creates a separate `ranch_booking_requests` table. Anonymous users receive no table grants. Active staff can SELECT rows under RLS; neither anonymous nor authenticated clients receive direct request-table INSERT/UPDATE/DELETE. Anonymous submission is restricted to `ranch_submit_booking_request`, which returns only reference, status and server quote. The decision RPC requires active staff.
- Server validation covers bounded names/contact/note, dates (today through 18 months; 1–365 nights), unit/type/service, capacities, and server-calculated rates (Deluxe: $200 per complete seven-night block, remaining nights $50; other existing nightly rates; ATV $75 once). Client totals are not accepted.
- Pending requests **do not hold inventory**. The submission check is informative only. Staff approval locks the request, rechecks availability and quote, and inserts a `CONFIRMED` reservation and decision history in one transaction. The existing `ranch_no_overlapping_stays` exclusion constraint rejects a concurrent booking; a failed approval leaves the request pending. Rejection preserves the request without creating a reservation. There is no delete path.
- A UUID idempotency key is reused for identical retries. A global limit of 100 new requests/hour and a matching-contact limit of 3/24 hours are serialized by an advisory transaction lock. These are first-launch abuse mitigations, not a substitute for edge/IP throttling, CAPTCHA and monitoring. Contact data retention, staff notification and delivery of customer confirmations remain undecided.
- [feature-flags.ts](../src/constants/feature-flags.ts) keeps customer submission and staff inbox access **false** until the migration is approved, installed and verified. The UI shows a server-confirmed reference only after a successful response. No email/SMS is sent, and no payment is taken. Email-only contacts remain in the linked request record; the current reservation table has no email column.

### Approval and safe test plan (no production customer records)

1. Owner reviews the exact migration, the no-hold policy, request retention and spam controls. Recheck live schema, constraints, existing RLS, grants, function ownership and exclusion constraint immediately before applying. Stop if any drift exists.
2. Apply **only** `20261103012314_booking_requests.sql` in an isolated staging clone first. Confirm the private schema is not exposed by the Data API. Validate effective grants and RLS as `anon`, ordinary authenticated user and active staff. Anonymous direct reads/writes on both private tables, and anonymous decision RPC calls, must fail.
3. In staging, exercise invalid dates, oversized fields, capacity/service mismatch, price-tampering attempts (no price parameter), idempotency replay and mismatched reuse, contact/global rate limits, rejected requests, stale price, unavailable units and two concurrent approvals. Verify exactly one reservation and one approved request in the race, with the loser still pending. Use synthetic contacts and staging reservations; do not modify the real RV 05 record.
4. After staging passes and the owner approves production rollout, apply only this migration through an authorized connection. Verify anonymous API boundaries and function behavior using controlled non-customer test data in an approved environment; do not create production test bookings. Enable staff and customer flags in a reviewed deployment only after operational monitoring and abuse controls are ready.

## Launch blockers for online booking submission

1. **Approve and verify the prepared public request workflow.** Review the isolated intake migration above, apply it only after approval, test grants/RLS and staff decisions in staging, then explicitly enable the two request flags. Do not grant anonymous `INSERT` on `ranch_reservations`. Pending requests never block a campsite.
2. **Enforce pricing and availability on the server.** Recalculate dates, capacity, Deluxe $200 complete seven-night blocks, remaining $50 nights, other nightly rates, and ATV fees at submission. Check unit availability in the same transaction as any reservation write and retain the existing exclusion constraint. Document tent extra-person/vehicle charges, holiday/event rates, taxes, and any deposit before showing a final payable total.
3. **Define owner operations and customer promises.** Approve how staff reviews requests, sends a confirmation, handles unavailable choices, and resolves duplicate submissions. Publish a cancellation/refund policy and distinguish a request receipt from a confirmed booking.
4. **Protect public endpoints.** Set and test rate limits, anti-bot controls, monitoring, and abuse response for availability and any future request endpoint. Availability intentionally exposes only unit ID, stay type, and a boolean, but repeated queries can enumerate occupancy. Keep the private definer function out of exposed schemas; never expose guest or staff fields.
5. **Configure notifications and deployment.** Select and verify transactional email/SMS delivery, consent, templates, sender domain, secrets management, production URL, redirect/deep links, web hosting, logging, and alerting. Only publishable Supabase configuration belongs in the client. Test confirmation delivery and failed-delivery recovery.
6. **Decide payments before taking money.** Approve deposit/full-payment rules, tax calculation, payment provider, webhook signature verification, reconciliation, refunds, and failure handling. Payments are currently disabled; do not launch a paid checkout before these are implemented and tested.
7. **Harden staff authentication.** Supabase security advisor reports leaked-password protection disabled. Review and enable it in Auth settings: [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Recheck staff access and session recovery after enabling.
8. **Triage dependency advisories before public deployment.** `npm audit --omit=dev` on the SDK 57 lockfile reported 22 advisories (1 critical, 7 high, 12 moderate, 2 low), including transitive `shell-quote` and Expo Router dependencies. Determine actual runtime/build exposure and compatible fixes; do not blindly upgrade the Expo SDK or apply a breaking audit fix during request-intake rollout.

## Read-only availability verification completed

- Applied only [the public availability RPC migration](../supabase/migrations/20261103005539_public_unit_availability.sql); remote migration history version `20261103005539` (prepared locally as `20261102233705`). The older pending reservations/camping-units migration was not run. The repository filename now matches the installed version; other pre-existing migration-history drift should be reviewed before any future CLI migration push.
- Anonymous REST calls returned 23 units and exactly `unit_id`, `stay_type`, `is_available`. RV 05 was unavailable for November 15–22 and available for November 22–25. Reversed dates returned HTTP 400.
- Anonymous direct `SELECT` on `ranch_reservations` and `ranch_units` returned HTTP 401. The private helper was not callable through the REST RPC route (HTTP 404). No reservation records were changed.
- The customer UI uses only the public RPC. A fresh availability check is required when dates or stay type change. Results are not a hold.

## Optional improvements after blockers

- Native calendar/date picker, more accessible date formatting, and locale-aware display.
- Customer analytics, SEO, search filters, photos and amenity details.
- Automated end-to-end mobile and desktop tests across screen readers and browsers.
- Paginated staff request history and server-backed counts beyond the first 200 newest requests.
