# Questions for the backend team (audit 2026-11)

The SPA's checks are UX only. These are the server-side guarantees the front end relies on but can't verify. Each
one is linked to a finding in [findings.md](findings.md). Please answer yes or no, with a pointer to where the server enforces it.

## SEC-06: authorization the UI hides but the API must enforce
| # | Endpoint(s) | Guarantee the API must enforce | If not enforced |
|---|---|---|---|
| 1 | `POST/PUT/DELETE /memberships/**`, `PUT /memberships/{id}/roles`, `POST …/resend-activation` | Caller holds `identity.memberships.manage` in the session's tenant | Any member can invite, re-role or remove people |
| 2 | `POST/PUT /roles`, `PUT /roles/{id}/permissions`, activate/deactivate | Caller holds `identity.roles.manage` | Privilege escalation |
| 3 | `PUT /roles/{id}/permissions`, `POST /roles` | A non-owner can grant only permissions that (a) the application offers and (b) the caller already holds in that application (the rule `RolesService` grant scope mirrors) | A manager grants themselves any permission through a crafted request |
| 4 | Same as above | System roles and owner roles are immutable | Owner role edited or neutralised |
| 5 | `POST/PUT/DELETE /teams/**`, manager and member changes | Caller holds `tenant.teams.manage` | Unauthorised org changes |
| 6 | `PUT /tenant/profile` | Caller is allowed to edit the company profile | Profile tampering |
| 7 | Every tenant-scoped endpoint | Tenant comes **only** from the session (`brooch_sid`), never from a client header or body | Cross-tenant access |
| 8 | `GET /subscription-operations/{id}`, `…/pay`, `…/payments/verify`, `…/retry-*` | The operation belongs to the caller's tenant (the SPA takes `operationId` from the URL) | Reading or paying another tenant's operation |

## SEC-07: client-controlled development header
`X-Brooch-Dev-Client: true` is sent only by local `ng serve` (`application-header.interceptor.ts`). Anyone can send it.
**Please confirm that stg and prod ignore it** and don't relax cookie `Secure`/`SameSite`, CORS, CSRF or rate limits because of it.

## SEC-01: redirect targets (needed before AP-1)
Which origins can the backend return as `redirectUrl` (login, select-membership, `Auth.ApplicationAccessDenied`) or as an
application registry `baseUrl`? If all of them are `https://*.brooch.sa`, the SPA can add a defence-in-depth allow-list.

## DATA-02: CSRF token lifetime (needed before AP-3)
After login or select-membership, the SPA primes `GET /auth/csrf` and then discards that token when `GET /me` runs.
Is the antiforgery token rotated by `/me`? If not, the SPA can keep the primed token and save one request per sign-in.

## SEC-09: select-company reload
`identity-domain.mdc` says the company picker must use only `LoginResponse.availableCompanies`. On a page reload mid-selection,
the SPA falls back to `GET /me/companies` (filtered to `isSelectable`). Is that endpoint on the selection-stage allow-list,
and is the fallback acceptable?
