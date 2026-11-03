# White Oak Ranch launch readiness

Status: public availability is live and read-only. Customer booking is a request preview only: it does not save, hold, confirm, or charge anything. Staff reservation management remains protected. Preserve the existing confirmed RV 05 stay on November 15–22, 2026.

## Launch blockers for online booking submission

1. **Authorize a public request workflow.** Design a server-side endpoint or reviewed RPC with minimal input, schema validation, idempotency, spam protection, and a clear request state. Do not grant anonymous `INSERT` on `ranch_reservations`. Decide whether requests are stored separately or require verified identity. An unverified request must not silently block a campsite.
2. **Enforce pricing and availability on the server.** Recalculate dates, capacity, Deluxe $200 complete seven-night blocks, remaining $50 nights, other nightly rates, and ATV fees at submission. Check unit availability in the same transaction as any reservation write and retain the existing exclusion constraint. Document tent extra-person/vehicle charges, holiday/event rates, taxes, and any deposit before showing a final payable total.
3. **Define owner operations and customer promises.** Approve how staff reviews requests, sends a confirmation, handles unavailable choices, and resolves duplicate submissions. Publish a cancellation/refund policy and distinguish a request receipt from a confirmed booking.
4. **Protect public endpoints.** Set and test rate limits, anti-bot controls, monitoring, and abuse response for availability and any future request endpoint. Availability intentionally exposes only unit ID, stay type, and a boolean, but repeated queries can enumerate occupancy. Keep the private definer function out of exposed schemas; never expose guest or staff fields.
5. **Configure notifications and deployment.** Select and verify transactional email/SMS delivery, consent, templates, sender domain, secrets management, production URL, redirect/deep links, web hosting, logging, and alerting. Only publishable Supabase configuration belongs in the client. Test confirmation delivery and failed-delivery recovery.
6. **Decide payments before taking money.** Approve deposit/full-payment rules, tax calculation, payment provider, webhook signature verification, reconciliation, refunds, and failure handling. Payments are currently disabled; do not launch a paid checkout before these are implemented and tested.
7. **Harden staff authentication.** Supabase security advisor reports leaked-password protection disabled. Review and enable it in Auth settings: [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Recheck staff access and session recovery after enabling.

## Read-only availability verification completed

- Applied only [the public availability RPC migration](../supabase/migrations/20261103005539_public_unit_availability.sql); remote migration history version `20261103005539` (prepared locally as `20261102233705`). The older pending reservations/camping-units migration was not run. The repository filename now matches the installed version; other pre-existing migration-history drift should be reviewed before any future CLI migration push.
- Anonymous REST calls returned 23 units and exactly `unit_id`, `stay_type`, `is_available`. RV 05 was unavailable for November 15–22 and available for November 22–25. Reversed dates returned HTTP 400.
- Anonymous direct `SELECT` on `ranch_reservations` and `ranch_units` returned HTTP 401. The private helper was not callable through the REST RPC route (HTTP 404). No reservation records were changed.
- The customer UI uses only the public RPC. A fresh availability check is required when dates or stay type change. Results are not a hold.

## Optional improvements after blockers

- Native calendar/date picker, more accessible date formatting, and locale-aware display.
- Customer analytics, SEO, search filters, photos and amenity details.
- Automated end-to-end mobile and desktop tests across screen readers and browsers.
