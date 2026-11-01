# Findings register — 2026-11 audit

Living status of every audit finding. Updated after each fix.

- **Status:** Pending → In progress → Fixed → **Verified** (validation passed), or Blocked (with a reason).
- **AP-n:** needs explicit owner approval before implementation (behaviour, contract, dependency or deployment change).
- Plan and full rationale: approved remediation plan (2026-11-01). Baseline: [baseline.md](baseline.md).

| ID | Sev | Finding (short) | Status | Notes |
|---|---|---|---|---|
| **Security** | | | | |
| SEC-01 | M | `isNavigableRedirect` accepts any http(s) origin | **Verified** (AP-1 approved) | Only `https://*.brooch.sa` (plus localhost in dev builds) is followed; credentials in URL refused; `error.model.spec.ts`; e2e fixtures moved to `*.brooch.sa` |
| SEC-02 | L | `isSafeReturnUrl` accepts `/\host` and control chars; dead `location.replace` branch | **Verified** | Backslash and control characters rejected; dead `location.replace` branch removed (`9208c61`, `error.model.spec.ts`) |
| SEC-03 | L | Interceptors key on `url.includes('/api/')` | **Verified** | `core/http/api-url.ts` `isApiRequest`; every `API_ROUTES` URL classified as before (`api-url.spec.ts`) |
| SEC-04 | L | CSRF exemption: substring match vs suffix match | **Verified** | One exact-path matcher shared by the CSRF interceptor and `ApiErrorHandler`; equivalence spec |
| SEC-05 | M | No CSP, frame-ancestors or security headers; card page in PCI scope | Blocked | Spec written: [security-headers.md](security-headers.md) (CSP with hashes); awaiting the hosting owner |
| SEC-06 | C if absent | Grant scope and mutations are UI-only from the FE view | Blocked | Questions in [backend-confirmations.md](backend-confirmations.md) |
| SEC-07 | M if absent | `X-Brooch-Dev-Client` is client-controlled | Blocked | Questions in [backend-confirmations.md](backend-confirmations.md) |
| SEC-08 | L | `@angular/router` (SSR-only advisories), `zod` | Pending (AP-6) | |
| SEC-09 | M | Select-company reload uses `/me/companies`, against the contract | **Verified** (AP-7: keep code) | `identity-domain.mdc` now documents the reload fallback to `/me/companies` |
| **Bugs** | | | | |
| BUG-01 | H | Unit suite did not compile (0 tests ran) | **Verified** | `07cf334`: 19 files, 159 of 159 tests pass |
| BUG-02 | M | Lint: duplicate `class` (error) + 5 `inject-at-top` warnings in `login.page.ts` | **Verified** | Error fixed upstream (`fa0352c`); inject order fixed (`9208c61`); lint 0 problems |
| BUG-03 | M | `body.shell-nav-open` can leak after the shell is destroyed | Fixed (AP-2) — not fully verified | Class removed on shell destroy; regression suite green; the drawer-open-on-expiry scenario itself is not automated |
| BUG-04 | M | Unguarded `localStorage` in `shell-layout.ts` | Fixed (AP-2) — not fully verified | try/catch around both storage calls; regression suite green; blocked-storage scenario not automated |
| BUG-05 | L | Password pages: untorn `queryParamMap` subscription, double bootstrap | **Verified** | `takeUntilDestroyed` on both pages (`9208c61`); full replacement comes with NG-02 |
| BUG-06 | L | Language switch race | No change needed | ngx-translate 18 `changeLang()` already discards superseded loads (`lastUseLanguage`); `<html lang/dir>` is set synchronously in call order |
| **Data** | | | | |
| DATA-01 | M | Account company switch triple-loads `/me/companies` | Pending (AP-3) | |
| DATA-02 | L | Sequential boot reads; CSRF primed then invalidated | Pending (AP-3) | Backend confirmation (token rotation) |
| DATA-03 | M | Root `models/`, `enums/`, `constants/` buckets and re-export shims | Pending | |
| DATA-04 | M | Scattered permission checks → `AccessPolicy` | Pending | |
| DATA-05 | L | `withCredentials` repeated on every call | Pending | After SEC-03 |
| DATA-06 | L | Pass-through facades | Pending | |
| **Performance** | | | | |
| PERF-01 | M | Initial bundle near the budget (see baseline) | Pending | Measured every phase |
| PERF-02 | L | Full client-side lists (suspected) | Pending | Benchmark before acting |
| **Architecture and code** | | | | |
| ARCH-01 | H | `features/workspace` holds six domains | Pending | |
| ARCH-02 | M | No path aliases or boundary lint | **Verified** | tsconfig aliases; 67 files codemodded; `no-restricted-imports` layer rules catch all 4 probe violations; prod bundle byte-identical |
| ARCH-03 | H | Feature data access in `core/api`, `core/payments` | Pending | |
| ARCH-04 | M | App chrome in `shared/` | **Verified** | Chrome moved to `core/layout/{shell,shell-header,shell-sidebar,auth-layout,loading-bar,global-error-banner}`; 285/285 unit, 213/213 e2e |
| ARCH-05 | M | One flat route table | Pending | URLs stay byte-identical |
| ARCH-06 | L | Hard-coded route paths in the store and guards | Pending | |
| ARCH-07 | M | Root singletons hold feature state | Pending | |
| ARCH-08 | M | Docs contradict each other; `ONBOARDING_FRONTEND_GUIDE.md` missing | **Verified** | Stack docs reconciled (`5689b7a`); `architecture.mdc` added |
| CODE-01 | H | Oversized pages and dialogs (>500 lines) | Pending | |
| CODE-02 | M | Large inline templates | Pending | |
| CODE-03 | M | Duplicated dialog shell and confirm-state logic | Pending | |
| CODE-04 | L | `as unknown as` casts in `normalize-error.ts` | Pending | |
| **Modern Angular** | | | | |
| NG-01 | M | `rxResource` + Observables → `httpResource` reads | Pending | Network baseline must match |
| NG-02 | M | `ActivatedRoute` reads → `withComponentInputBinding` + `input()` | Pending | |
| NG-03 | L | Effects that propagate state or write the DOM | Pending | |
| NG-04 | L | Reactive `FormControl` search drafts → Signal Forms | Pending | |
| NG-05 | L | `@defer` for heavy dialogs | Pending (AP-9) | |
| NG-06 | L | `NgOptimizedImage` for static images | Pending | Only if pixel-identical |
| **UI/UX** | | | | |
| UI-01 | H | Three styling systems → Tailwind only | Pending | Pixel-identical rule |
| UI-02 | M | Magic arbitrary values → `@theme` tokens | Pending | |
| UI-03 | H | Visual baseline only covers first paint | **Verified** | Step 0: 15 states × 2 variants + network + computed-style baselines, stable over 3 runs |
| UI-04 | L | `<img>` without intrinsic size | Pending | |
| UI-05 | L | No automated a11y check | Pending (AP-6) | |
| UI-06 | M | `npm run check:app-shell` already fails on `stg`: the pre-boot shell in `src/index.html` no longer mirrors `AuthLayout` (all 16 parts) and its Arabic translation drops the feature icons | Pending (approval) | Found 2026-11-01 while moving `auth-layout`; identical output before the move. Fixing it changes the pre-Angular first paint of auth pages |
| **Testing and production** | | | | |
| TEST-01 | H | = BUG-01 | **Verified** | |
| TEST-02 | H | Missing specs for auth, interceptors, grant scope, onboarding | Pending | |
| TEST-03 | M | No `check` gate; spec type-check only inside `ng test` | Pending | |
| PROD-01 | H | Prod env → staging API; staging built with dev config | Declined by owner (AP-8) | `build:stg` stays on the development configuration; prod API URL still pending |
| PROD-02 | H | No CI, no pre-commit gate | Pending (AP-6) | |
| PROD-03 | M | No error reporting | Blocked | Vendor decision |
| PROD-04 | M | Hosting config (rewrites, cache, headers) not versioned | Blocked | DevOps |
| PROD-05 | L | `version 0.0.0`, no `engines` | Pending | |
