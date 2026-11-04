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
| Isolated database / SQL execution | **Not run locally.** This Windows machine still has no Docker/Postgres runtime. The manual GitHub-hosted local Supabase workflow has been written but not run. No migration pass is claimed. |
| Square Sandbox checkout/webhooks/refunds | **Not run.** No Sandbox token, location, webhook subscription or reachable isolated function URL was available. SQL service-RPC tests simulate trusted payment transitions only; they are not Square transaction evidence. |

The new synthetic suite covers staff hold creation, full/deposit/balance state, duplicate payment events, failed payment, refund tracking, amount mismatch, concurrency, and expired hold transitions when run against the five-file isolated database. Real Square Sandbox success/decline/refund/dispute and expiration reconciliation remain required before setting either public request or Square flag true. The migration and functions require database execution and security review before any production approval.

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
