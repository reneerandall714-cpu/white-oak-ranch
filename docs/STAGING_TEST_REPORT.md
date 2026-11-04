# Job #12 staging test report

## Square Sandbox feature branch results, 2026-11-04

| Check | Actual result |
| --- | --- |
| Branch | `feature/square-sandbox-payments`, based on `feature/backend-foundation` |
| Production access | None. No production SQL, payment function deployment, reservation edit, flag change, or Square live merchant connection. RV 05 November 15–22, 2026 was not touched. |
| Local source tests | 35/35 passed with `node --test tests/*.test.mjs`, including raw-body Square HMAC signature binding. |
| TypeScript | Passed with `node ./node_modules/typescript/bin/tsc --noEmit` after removing a stale ignored Expo route-type cache. |
| Web export | Passed with `node ./node_modules/expo/bin/cli export --platform web`; 28 static routes generated, including checkout, day pass, Payments, and payment settings. |
| Integration suite syntax | `node --check staging/integration.test.mjs` passed. |
| Isolated database / SQL execution | **Passed locally.** Docker 29.9.2 became available. Supabase CLI 3.0.0 started a separate loopback stack under `.local-square-staging`; it applied exactly the synthetic baseline, Deluxe weekly, availability, booking requests, and Square migration in that order. The prohibited inventory migration was absent. No hosted project was used. |
| Guarded synthetic integration | **17/17 passed** with `STAGING_TEST_RUN=YES` against `http://127.0.0.1:54321`. Covered anonymous/staff RLS and direct-write denial, owner-only settings, staff decisions, concurrent approvals, full payment, deposit/balance, duplicate event, failed payment, expiry, amount mismatch, refunds, cancellation guard, day passes, and delayed payment review. These are database service-RPC simulations, not actual Square callbacks. |
| Local security advisor | `supabase db advisors --type security --level warn --fail-on none` targeted only `127.0.0.1:54322` and reported **No issues found**. |
| Manual GitHub workflow | Written but not run. An attempted `workflow_dispatch` against this feature branch returned GitHub HTTP 404 because the workflow is absent from the default branch. |
| Square Sandbox checkout/webhooks | **Full, deposit, and separate balance payments passed** with real Square Sandbox payment links and Square's hosted Test Payment simulator. Signed `payment.created` and `payment.updated` callbacks reached the isolated local function and updated local records. See the actual API and database results below. Refund and card-decline paths were not exercised against Square. |

The local suite passed against the five-file isolated database. The three Square Sandbox checkout payments below add real API and webhook evidence; decline/refund/dispute, balance-link cancellation, and expiration reconciliation still need Square-backed testing before setting either public request or Square flag true. The migration and Edge Functions still require independent security review before any production approval. The earlier Job #12 section below records the original 2026-11-02 blocker and is superseded by these 2026-11-04 local results.

### Square Sandbox checkout follow-up, 2026-11-04

The saved Sandbox token returned exactly one merchant and one active, USD, card-capable location through Square `ListMerchants` and `ListLocations`. The location belonged to that merchant and was its main location. The saved location ID was different; only `SQUARE_SANDBOX_LOCATION_ID` in the external local environment file was corrected. The merchant's generic Sandbox business label did not contain “White Oak,” so the owner should confirm that this is the intended Developer Console application before an owner demonstration. No credential value was printed, copied into the repository, or sent to the app.

The isolated Edge Function launcher was restarted with the corrected location and existing signature key. The local Supabase database, narrow proxy, and Cloudflare tunnel stayed running with the same URL. The public endpoint still rejected an unsigned request with HTTP 403; the refund function rejected an unauthenticated request with HTTP 401. The production Supabase project and live Square API were not contacted.

A fresh configuration check confirmed the token's sole active location matches its sole merchant, and the same Square application has exactly one enabled webhook subscription at the unchanged tunnel URL. Its signature key matches the saved local key in memory. After the server-side email-prefill adjustment, the source unit suite passed **35/35**, TypeScript `--noEmit` passed, and `git diff --check` found no whitespace errors.

| Synthetic scenario | Square Sandbox evidence | Isolated database evidence |
| --- | --- | --- |
| RV 08, full payment | Hosted link created for $200. Square's Test Payment simulator completed it; `GET /orders/{id}` exposed one tender and `GET /payments/{id}` returned `COMPLETED`, USD $200, the configured location and expected order. | Initial payment `PAID`, request `APPROVED`, reservation `CONFIRMED`, balance $0, receipt URL present. `payment.created:confirmed` and `payment.updated:already_confirmed` audit results. |
| RV 09, 25% deposit | Owner temporarily set a **test-only** 25% deposit and seven-day balance deadline. Hosted link completed for $50 against a $200 quote. Square API returned `COMPLETED`, USD $50, and the expected location/order. | Initial payment `PAID`; request `APPROVED`; reservation `CONFIRMED`; $150 outstanding immediately after the deposit; balance due 2026-12-21; receipt URL present. `payment.created:confirmed` and `payment.updated:already_confirmed` audit results. |
| RV 09, separate balance | A distinct Square order and hosted link completed for $150. Square API returned `COMPLETED`, USD $150, and the expected location/order. | Balance payment `PAID`; request/reservation remained `APPROVED`/`CONFIRMED`; balance became $0; second receipt URL present. `payment.created:balance_paid` and `payment.updated:balance_paid` audit results. |

The temporary owner deposit setting was restored to `FULL` after the tests. The first `CreatePaymentLink` attempt failed with Square HTTP 400 `INVALID_EMAIL_ADDRESS` for a synthetic `example.com` buyer email, leaving the initial hold unpaid and unlinked. The server now omits Square's optional email prefill for reserved `example.com` test addresses; the retry created the same payment's link without another charge. No real customer email was used.

These links opened Square's **Checkout API Sandbox Testing Panel**, which simulated payment acceptance. Square reported `source_type: EXTERNAL` for all three payments, even though their status was `COMPLETED`. This verifies the Square Sandbox link, order/payment lookup, signed webhook, idempotent state transition, receipt reference, and local balance flow. It does **not** verify a card entry, real receipt email delivery, card decline, refund, dispute, expired-link reconciliation, or staff UI rendering. Those remain separate launch tests. The earlier database-only 17/17 suite remains the evidence for concurrency, RLS, simulated failure/refund/expiry and duplicate-event behavior.

Status on 2026-11-02: **BLOCKED BEFORE STAGING CREATION. No database integration test has run.**

| Check | Actual result / evidence |
| --- | --- |
| Branch / initial worktree | `feature/backend-foundation`, clean at `5dbfd57e311069cc96c9390abfd7308ae510e379` |
| Connected projects / branches | One project: production `wagmelaupruptnzwjjta`; zero development branches. It was not used as staging. |
| Local runtime | No Docker, Podman, PostgreSQL executable or WSL installation. Supabase CLI 3.0.0 is available, but cannot start local Supabase without a container runtime. |
| New cloud resource | None created. A new project or branch may cost money and requires owner cost/plan approval before creation. Supabase branches are documented as data-less, but automatic migration replay could run the prohibited old migration. |
| Staging migration versions applied | **None.** The baseline and three reviewed SQL steps are prepared in [the runbook](../staging/README.md), but not executed anywhere. |
| Production safety | Only catalog queries, unit IDs/types, migration history, and security advisors were read. No customer/staff PII, production reservation rows, SQL writes, or production flag changes. |
| Actual anonymous/staff/concurrency integration tests | **Not run** — no isolated target. The guarded synthetic suite is [prepared](../staging/integration.test.mjs), not evidence of a pass. |
| App staging flow / mobile / web | **Not run** against staging. The staging marker and fail-closed flag gate are implemented but not activated. |
| Local automated checks | **34/34 passed** with `node --test tests/*.test.mjs`; `npx tsc --noEmit`, `npx expo install --check`, and `npx expo export --platform web` all passed. These checks are not database integration tests. |

## Read-only schema findings

Production has `ranch_staff`, `ranch_units`, `ranch_reservations`, 23 unit IDs/types, active-staff SELECT RLS, Deluxe-only weekly total, and the GiST overlap exclusion. Migration history ends with `20261103005539_public_unit_availability`; booking-request migration `20261103012314` is absent. The security advisor still reports [leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). The staging baseline is reconstructed from catalog metadata, not customer data.

**Important mismatch:** `has_table_privilege('authenticated', 'public.ranch_reservations', 'INSERT')` and `UPDATE` are both false. The live staff repository uses direct inserts/updates. Its stated create/edit/cancel behavior therefore needs a separate authenticated end-to-end check and, if genuinely blocked, a narrowly scoped grant or RPC design with owner approval. The booking-request approval RPC is a separate `SECURITY DEFINER` path, so this mismatch does not authorize widening reservation grants automatically.

## Remaining test matrix (all unrun)

Run the suite and capture actual output for: public availability shape/count; anonymous and nonstaff private-data denial; malformed and oversized input; no client total; seven-night Deluxe/ATV server quote; pending no-hold behavior; idempotent replay; third/fourth same-contact limit; staff inbox/approval/rejection; exactly one confirmed reservation; unavailable site; repeat/invalid transitions; and simultaneous approvals. Add manual tests for 100/hour global throttle in an isolated resettable database, network interruptions, mobile/web layout, accessibility, and no payment/message promises. The current suite covers the 3/24h contact limit, not the 100/hour global limit, to avoid generating 101 records by default.

No production launch gate is satisfied by this report. The owner must first provide either a local container runtime or explicit approval for any staging project cost. After actual staging passes, review abuse controls, Auth, dependency risk and request operations, then seek separate approval for the exact production SQL and activation.

## Dependency audit and runtime exposure

`npm audit --omit=dev` still finds 17 affected packages: 0 critical, 5 high, 10 moderate, 2 low. The five high nodes are `decode-uri-component`, its parents `query-string` and `expo-router`, plus `zod` and its parent `@expo/cli`. `npm ls` shows decoder `0.2.2` under `expo-router@57.0.29 → query-string@7.1.3`; URL/deep-link parsing is potentially client-runtime reachable. Zod `3.25.76` sits under `expo@57.0.31 → @expo/cli@57.0.32`, so it is a development/build-tool exposure, not this booking RPC's validator. npm proposes Expo/Router 58 for these paths, outside the SDK 57 target. No incompatible upgrade or untested transitive override was made. Before public rollout, reproduce the decoder issue against the app's actual route inputs or adopt a compatible upstream patch; separately monitor the CLI advisory and control untrusted build inputs. See [decoder advisory](https://github.com/advisories/GHSA-qr28-fpjm-wq7f) and [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).
