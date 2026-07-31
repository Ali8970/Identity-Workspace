# Identity cycle — QA checklist

Use with staging (`https://stg.api.brooch.sa`) from **https://dev.account.brooch.sa:4300**.

**Login decision tree (after successful credentials)**

1. `requiresTenantSelection === true` → `/select-company`
2. Else navigable `redirectUrl` → full-page navigate to that URL (e.g. CRM)
3. Else stay in Identity → `GET /auth/me` → applications launcher

Mark each row: Pass / Fail / Blocked (note reason).

---

## A. Onboarding & provisioning

| # | Journey | User action | API | Expected UI / outcome |
|---|---|---|---|---|
| 1 | `register-company` | `/register` with new email + company + owner names | `POST /tenants/register` | Success “check email”; then set-password email → `/set-password?userId&code` → login. **No auto session.** |
| 2 | `register-existing` | `/register` with already-active user email | `POST /tenants/register` | “Email already registered” → go to `/login` with existing password |
| 3 | `invite-user` | Logged-in owner → Members → Add member | `POST /companies/{tenantId}/members` | Success; invitee gets email (`emailType`: `SetPassword` or `WelcomeBack`) |
| 4 | `accept-invitation` | Open set-password link from invite email | `POST /auth/set-password` | Password set → `/login` (no auto session) |
| — | `onboarding` | New owner after first login (tenant `Onboarding`) | `GET /tenant`, `PUT /tenant/profile`, `GET /packages`, `POST /subscriptions/free-trial` | `/onboarding/company` → `/onboarding/package` → trial → `/login?onboarded=1` |

---

## B. Sign-in (happy paths)

| # | Journey | User action | API | Expected UI / outcome |
|---|---|---|---|---|
| 5 | `login-single-one-app` | Login (1 company, only CRM eligible) | `POST /auth/login` | `requiresTenantSelection: false`, `redirectUrl` = CRM → browser leaves Identity to CRM |
| 6 | `login-single-multi-app` | Login (1 company, CRM + HR) | `POST /auth/login` then `GET /auth/me` | `redirectUrl: null` → stay on Identity applications launcher |
| 7 | `login-multi-tenant` | Login (2+ selectable companies) | `POST /auth/login` | `/select-company` (**wins even if** `redirectUrl` set) |
| 7b | (after 7) | Pick a company | `POST /auth/select-membership` | Cookie becomes Active; then redirectUrl or launcher (same tree) |
| 8 | `login-intent` | Open Identity `/login?intentId=…` (from CRM) → login | `POST /auth/login` (+ intent in body) | Eligible → `redirectUrl` to CRM deep link; intent consumed |
| 9 | `intent-multi-tenant` | Intent login with 2+ companies | `POST /auth/login` → select → `POST /auth/select-membership` | Picker first; after pick → CRM `redirectUrl` |
| 10 | `forgot-password` | `/forgot-password` any email | `POST /auth/forgot-password` | Same success always (anti-enumeration); reset mail only if known |
| 11 | `reset-password` | Open reset link → new password | `POST /auth/forgot-password/complete` | Success → `/login` (no auto session) |

---

## C. Session & navigation

| # | Journey | User action | API | Expected UI / outcome |
|---|---|---|---|---|
| 12 | `switch-company` | Shell / Account company switcher | `POST /auth/select-membership` then `GET /auth/me` (+ companies) | Workspace refreshes for new company |
| 13 | `switch-application` | Applications → Open CRM/HR | none (no select-application) | `location.assign` to app `baseUrl` |
| 14 | `logout` | Sign out this device | `POST /auth/logout` | Session cleared → `/login` |
| 15 | `logout-all` | Sign out all devices | `POST /auth/logout-all` | All sessions cleared → `/login` |

---

## D. Denials & failures

| # | Journey | User action | API | Expected UI / outcome |
|---|---|---|---|---|
| 16 | `invalid-credentials` | Wrong password | `POST /auth/login` | Stay on `/login` + global banner (coded 401) |
| 17 | `user-disabled` | Disabled account login | `POST /auth/login` | Denial banner; no session |
| 18 | `no-membership` | User with no active membership | `POST /auth/login` | Denial; no usable companies |
| 19 | `tenant-disabled` | Only disabled company | `POST /auth/login` | Denial / not selectable |
| 20 | `membership-suspended` | Select suspended membership | `POST /auth/select-membership` | Denial; stay selection / error |
| 21 | `app-denied-tenant` | Login with CRM intent; tenant not entitled to CRM | `POST /auth/login` | `403 Auth.ApplicationAccessDenied`; **no Active session** |
| 22 | `app-denied-user` | Login with CRM intent; user has no CRM role | `POST /auth/login` | Same wire code `Auth.ApplicationAccessDenied` (reason differs server-side only) |
| 23 | `intent-tenant-ineligible` | Intent + pick company that cannot open CRM | `POST /auth/select-membership` | Stay on picker; intent **not** consumed; can pick other company |
| 24 | `permission-denied` | Members → Add without `identity.users.create` | `POST /companies/.../members` | `403 Auth.PermissionDenied` + banner; stay on page |
| 25 | `intent-expired` | Login with expired `intentId` | `POST /auth/login` | `Identity.LoginIntent.Expired`; scrub `intentId` from URL |
| 26 | `intent-replayed` | Reuse already-completed intent | `POST /auth/login` | `Identity.LoginIntent.AlreadyCompleted` |
| 27 | `session-expired` | Expired cookie → any authenticated call | e.g. `GET /auth/me` | Navigate `/session-expired` |
| 28 | `csrf-failure` | Unsafe POST missing/bad CSRF | e.g. `POST /auth/select-membership` | `Auth.AntiforgeryFailed` → re-prime CSRF + one retry |
| 29 | `rate-limit` | Burst login / limited auth routes | `POST /auth/login` (etc.) | `429` + cooldown UI |

---

## E. CRM ↔ Identity (permission / redirect) — end-to-end scripts

### E1. SSO into CRM — user **has** CRM access

| Step | Action | API / event | Expected |
|---|---|---|---|
| 1 | From CRM (or test): open Identity `/login?intentId=…` | — | Login shows intent banner |
| 2 | Sign in | `POST /auth/login` | `redirectUrl` to CRM |
| 3 | Browser follows redirect | — | Land in CRM with same cookie session |

### E2. SSO into CRM — tenant not entitled (`app-denied-tenant`)

| Step | Action | API / event | Expected |
|---|---|---|---|
| 1 | `/login?intentId=` targeting CRM | — | Login |
| 2 | Sign in | `POST /auth/login` → `403 Auth.ApplicationAccessDenied` | Stay on Identity; **no** CRM; banner/denied UX |
| 3 | Sign in again without fixing billing/entitlement | same | Still denied — login does not unlock CRM |

### E3. SSO into CRM — user has no CRM role (`app-denied-user`)

| Step | Action | API / event | Expected |
|---|---|---|---|
| 1–2 | Same as E2 | `403 Auth.ApplicationAccessDenied` | Same UI as E2 (wire code identical) |
| 3 | Admin assigns CRM role; user retries with **new** intent | `POST /auth/login` | Now redirects to CRM |

### E4. Multi-company + CRM intent — wrong company (`intent-tenant-ineligible`)

| Step | Action | API / event | Expected |
|---|---|---|---|
| 1 | Intent login | `POST /auth/login` | `/select-company` (all companies still listed) |
| 2 | Pick company **without** CRM access | `POST /auth/select-membership` → 403 | Stay on picker; Selection session kept; intent still redeemable |
| 3 | Pick eligible company + same `intentId` | `POST /auth/select-membership` | Redirect to CRM |

### E5. Already on Identity → open CRM launcher — no CRM role

| Step | Action | API / event | Expected |
|---|---|---|---|
| 1 | Login without intent (multi-app or launcher) | `POST /auth/login`, `GET /auth/me` | CRM may be missing from `availableApplications` or open fails |
| 2 | If user forces CRM URL | CRM: `GET /auth/me` with `X-Brooch-Application: crm` → 403 | CRM redirects to Identity `/login?intentId=…` or `/access-denied` |
| 3 | Login again on Identity | as E2/E3 | Still blocked until role/entitlement fixed |

### E6. Session lost while on CRM

| Step | Action | API / event | Expected |
|---|---|---|---|
| 1 | Cookie expired / logout-all | CRM API 401 | CRM sends user to Identity `/login` or `/session-expired` |
| 2 | User signs in again | `POST /auth/login` | Fresh session; optional new intent from CRM |

---

## F. Bootstrap (always)

| Step | When | API | Expected |
|---|---|---|---|
| App load | Every visit | `GET /auth/csrf`, `GET /auth/me` | 401 on `/me` if anonymous → silent (no banner); stage = anonymous |
| Guest on `/login` with valid cookie | Already logged in | bootstrap `/me` 200 | guestGuard → redirect into workspace / apps |

---

## QA sign-off

| Area | Pass? | Notes |
|---|---|---|
| A Onboarding | | |
| B Sign-in | | |
| C Session | | |
| D Denials | | |
| E CRM ↔ Identity | | |
| CORS `https://dev.account.brooch.sa:4300` | | Must be allowlisted on staging |
| Cookies `brooch_sid` over HTTPS | | |

Tester: _______________  Date: _______________  Build/commit: _______________
