# Journey matrix (staging API)

Acceptance checklist for the Identity cycle against `https://stg.api.brooch.sa`.
Dev: `npm start` → **https://dev.account.brooch.sa:4300/** (direct API calls; backend CORS required).

**Full QA scripts (user action → API → UI):** see [IDENTITY-CYCLE-QA-CHECKLIST.md](./IDENTITY-CYCLE-QA-CHECKLIST.md).

Prerequisites: staging test users/seeds for multi-tenant, intent, invite, and denial scenarios.

| Journey id | How to run | Expected outcome |
|---|---|---|
| register-company | `/register` with a new email | Set-password email → `/set-password` → login |
| register-existing | `/register` with an already-active user email | Existing-user message → login |
| invite-user | Login → Members → Add | Set-password email for invitee (`emailType: SetPassword` or `WelcomeBack`) |
| accept-invitation | Open set-password link from email | Set password → login (no auto session) |
| login-single-one-app | Login (one tenant, one eligible app) | Backend `redirectUrl` → sibling app `baseUrl` |
| login-single-multi-app | Login (one tenant, multiple apps) | Stay in Identity → applications launcher |
| login-multi-tenant | Login (multiple selectable companies) | `/select-company` (wins over `redirectUrl`) |
| login-intent | Sibling app → Identity `?intentId=` → login | Navigable `redirectUrl` to target app |
| intent-multi-tenant | Intent login → pick company | Redirect after `select-membership` |
| forgot-password | `/forgot-password` (any email) | Anti-enumeration success; reset email if known |
| reset-password | Open reset link from email | Reset → login (no auto session) |
| switch-company | Active session → shell / Account switcher | `POST /auth/select-membership` + refresh |
| switch-application | Applications → Open app | Navigate to registry `baseUrl` (no select-application API) |
| logout | Account → Sign out (this device) | `POST /auth/logout` → `/login` |
| logout-all | Shell / Account logout-all | `POST /auth/logout-all` → `/login` |
| invalid-credentials | Wrong password | ProblemDetails coded denial (stay on login) |
| user-disabled | Disabled account login | Account disabled ProblemDetails |
| no-membership | User with no active membership | No-active-membership ProblemDetails |
| tenant-disabled | Only disabled company available | Tenant disabled ProblemDetails |
| membership-suspended | Suspended membership select | Membership not active ProblemDetails |
| app-denied-tenant | Intent for app not entitled to tenant | `Auth.ApplicationAccessDenied` / denied UX |
| app-denied-user | Intent for app user cannot access | App denied UX |
| intent-tenant-ineligible | Intent → pick ineligible company | Stay on picker with error |
| permission-denied | Action without permission (e.g. add member) | `Auth.PermissionDenied` + global banner |
| intent-expired | Expired `intentId` on login | `Identity.LoginIntent.Expired` → scrub URL |
| intent-replayed | Already-completed intent | `Identity.LoginIntent.AlreadyCompleted` |
| session-expired | Expired cookie → authenticated call | `/session-expired` |
| csrf-failure | Unsafe POST with bad/missing CSRF | `Auth.AntiforgeryFailed` → re-prime + retry |
| rate-limit | Burst login / limited auth paths | 429 + cooldown UI |
| onboarding | New tenant owner after set-password + login | `/onboarding/company` → package → free trial → `/login?onboarded=1` |

## Go-live checklist

1. SPA runs on `https://dev.account.brooch.sa:4300` (hosts file + ssl)
2. Staging CORS / cookies allow that origin (same as CRM)
3. Test accounts exist for the journeys above
4. ProblemDetails `code` values match error-handler expectations (adjust if staging differs)
