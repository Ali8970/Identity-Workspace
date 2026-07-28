# Full-cycle UI + mock plan (zero gaps)

## Goal

Ship a **complete Identity product experience** that:

- Covers **all 29 Identity-cycle journeys** end-to-end with fake data
- Matches prototype workspace surfaces (members, onboarding, roles, teams, account, switchers)
- Uses a **light, polished UI/UX** (replace current dark brass look)
- Stays on **mock only** for now — but written so go-live is **only** set real endpoints + turn off fake data (no feature rewrites)

Source of truth: Identity-cycle.html (29 journeys) + current app at `d:\Brooch\Brooch-Identity`.

---

## Clean code / go-live contract (non-negotiable)

When APIs are ready, the only production changes allowed are:

1. Set `environment.apiBaseUrl` (and prod env) to the real host  
2. Set `useMockApi: false` and `showMockToolbar: false`  
3. Remove or tree-shake mock folder from production build if desired  

**No** page, store, guard, or `*Api` service rewrites for go-live.

### Hard rules (every phase must obey)

| Rule | Detail |
|---|---|
| Pages never know about mock | No `if (useMockApi)`, no imports from `core/mock` in features |
| All HTTP via `*Api` services | `AuthApi`, `MeApi`, `MembersApi`, … only — URLs live in `API_ROUTES` / env |
| Contract-shaped DTOs | Models match OpenAPI / Identity-cycle request/response exactly |
| Mock is an interceptor only | `MockApiInterceptor` + `InMemoryIdentityStore` sit under HttpClient; same interceptors (app header, language, CSRF, errors) run for mock and real |
| Errors are wire codes | UI branches on `BroochError.code` / status — same as real ProblemDetails |
| Toolbar / mailbox are dev-only | Gated by `environment.showMockToolbar`; never shipped as product UI |
| Single decision tree | Login / select-membership / redirect logic identical for mock and real |

```
┌─────────────────────────────────────────────────────────┐
│  Pages / Guards / SessionStore  (production code)       │
│         ↓ inject *Api only                              │
│  AuthApi / MeApi / MembersApi / …                       │
│         ↓ HttpClient + interceptors                     │
│  ┌─ useMockApi true  → MockApiInterceptor → fake store  │
│  └─ useMockApi false → real network → Brooch API        │
└─────────────────────────────────────────────────────────┘
```

### Go-live checklist (future)

- [ ] `apiBaseUrl` = real API  
- [ ] `useMockApi: false`  
- [ ] `showMockToolbar: false`  
- [ ] Exclude `src/app/core/mock/**` from prod (optional build condition)  
- [ ] Smoke the same 29 journeys against real backend  

---

## Locked decisions

| Topic | Choice |
|---|---|
| Data now | Mock / fake only (`useMockApi: true`) |
| Real API | Deferred — flip config later, not rewrite |
| Theme | **Light** design system (not dark) |
| Coverage | **Zero gaps** across all 29 journeys + workspace |
| Code quality | Clean layers; Angular 22 best practices; Signal Forms; no dead mock leaks in features |
| Forms / Angular | Signal Forms, signals, zoneless |
| i18n | ngx-translate AR/EN + RTL |

---

## Journey checklist (must all be runnable from Mock toolbar)

### Onboarding & provisioning
1. `register-company` — new email → mailbox set-password → set password → login
2. `register-existing` — existing user → message to login (no set-password)
3. `invite-user` — add member → SetPassword email (mailbox)
4. `accept-invitation` — set-password from invite → login

### Sign-in
5. `login-single-one-app` — Active + navigable `redirectUrl` (mock stub landing)
6. `login-single-multi-app` — `redirectUrl: null` → `/auth/me` → Applications
7. `login-multi-tenant` — Selection → Select Company → select-membership
8. `login-intent` — create intent → `/login?intentId=` → deep-link redirect
9. `intent-multi-tenant` — intent until company pick → redirect
10. `forgot-password` — anti-enumeration + mailbox token
11. `reset-password` — complete with token → login (no auto-session)

### Session & navigation
12. `switch-company` — switcher / account → select-membership + refresh
13. `switch-application` — Applications → `location.assign(baseUrl)` (mock target)
14. `logout` — current session only
15. `logout-all` — all devices (shell default)

### Denials & failures (seed + dedicated UX each)
16. `invalid-credentials`
17. `user-disabled` (+ Suspended / Inactive variants if codes differ)
18. `no-membership`
19. `tenant-disabled`
20. `membership-suspended`
21. `app-denied-tenant`
22. `app-denied-user`
23. `intent-tenant-ineligible` — stay on picker with clear error
24. `permission-denied` — action 403 + correlation id
25. `intent-expired`
26. `intent-replayed`
27. `session-expired` — re-auth + returnUrl + banner
28. `csrf-failure` — re-prime + single retry
29. `rate-limit` — 429 → cooldown UI

**Acceptance:** Mock toolbar runs each journey id; mailbox shows codes/links; no journey ends in a stub.

---

## Phases (sequential — no skipped surface)

### Phase A — Light design system + shared UI kit
- Replace dark tokens with **light** tokens (`_tokens.scss`)
- Rebuild auth layout + shell (sidebar, top bar, company switcher, account menu, language, toasts, dialogs, empty/error)
- Form controls, buttons, tables, badges, permission tree chrome
- RTL-safe; WCAG AA on light backgrounds
- 2–3 subtle motions (page enter, toast, dialog)

### Phase B — Mock engine complete (all 29 seeds)
- Expand `InMemoryIdentityStore` + `mock-api.interceptor.ts`
- One seed per journey id; toolbar lists **all 29**
- Fix `redirectUrl` normalize (top-level + extensions)
- Mock stub targets `/mock-target/crm|hr` for redirect journeys
- Intent factory in toolbar (valid / expired / completed)
- Selection allow-list, CSRF, 429, coded vs uncoded 401
- Mailbox: clickable deep links for codes/tokens

### Phase C — Auth / SSO UI complete
- Harden login decision tree
- Select-company: intent banner, row states, ineligible stay-on-picker
- Screens: no-membership, access-denied, session-expired, rate-limit
- Simulate CRM handoff in toolbar
- CSRF retry-once; session-expired path
- Polish register / set-password / forgot / reset

### Phase D — Onboarding wizard (full)
- Company → package → free-trial
- Session invalidated → `/login?onboarded=1`
- Finish guards + UX

### Phase E — Workspace (prototype parity, light UI)
- Applications launcher with eligibility
- Members: list, add, detail, roles
- Roles viewer + permission tree
- Permissions catalog
- Teams tree
- My access (`/me/access`)
- Account: profile, companies, sessions, switch, logout / logout-all
- Shell company switcher
- Permission-gated nav only (never route guards for members/roles)

### Phase F — Quality / zero leftover stubs
- Journey matrix doc: Journey → scenario → screen → pass criteria
- AR/EN + RTL pass
- a11y focus + AXE-critical
- README: run each journey; document go-live = env flip only
- Audit: grep features for `core/mock` / `useMockApi` imports — must be zero
- Confirm production build can omit mock toolbar/interceptor via env flags

---

## Architecture

```
Pages (light UI) → *Api services → HttpClient → interceptors
                                      ├─ mock ON  → MockApiInterceptor → InMemoryIdentityStore → Mailbox
                                      └─ mock OFF → real Brooch API
Mock Toolbar (29, dev-only) → store seeds
```

---

## Definition of done

- [x] All 29 journeys runnable from toolbar with correct UI outcome
- [x] Workspace routes fully usable (not stubs)
- [x] Light theme on auth + shell
- [x] AR/EN + RTL verified
- [x] No dark default; no “coming soon” for in-scope surfaces
- [x] **No feature file imports mock**; go-live path documented as env-only
- [x] DTOs/API routes match Identity-cycle contracts

See also: [JOURNEY-MATRIX.md](./JOURNEY-MATRIX.md)

## Out of scope now

- Pointing env at real Brooch API (later, config only)
- Platform admin (`/admin/*`, `/administration/*`)
- Embedding CRM/HR (mock target pages only)