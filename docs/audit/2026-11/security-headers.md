# Security headers for the Account SPA (SEC-05)

**Status:** Blocked. The hosting configuration (CDN, nginx or similar) is not in this repository. This file is the spec
for whoever owns it. Nothing in the SPA changes.

**Why it matters:** Account is the SSO hub, so it shows the login form. It also renders card fields on the payment
page (`features/onboarding/ui/card-form.ts`), which puts that page under PCI DSS v4.0 requirements 6.4.3 (inventory and
authorise payment-page scripts) and 11.6.1 (detect changes to them). Without these headers:
- The login and payment pages can be framed by any site (clickjacking).
- Nothing limits what an injected script could do or where it could send data.

## Recommended response headers (every HTML response; `index.html` must not be cached)

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'sha256-+13kj5jHHtNdO/suxeycABuc2kSZpsh0xYfVV8rpFDw=' 'unsafe-hashes' 'sha256-MhtPZXr7+LpJUY5qtMutB+qWfQtMaPccfe7QXtCcEYc=';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  font-src 'self';
  connect-src 'self' https://stg.api.brooch.sa https://api.moyasar.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  object-src 'none';
  upgrade-insecure-requests
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Cache-Control: no-cache            (index.html only)
Cache-Control: public, max-age=31536000, immutable   (hashed *.js / *.css / fonts)
```

Where each value comes from (measured on the production build of `stg` at `fa0352c`, 2026-11-01):

| Item | Value | Notes |
|---|---|---|
| Inline pre-boot script in `src/index.html` (theme, language, auth hero) | `sha256-+13kj5jHHtNdO/suxeycABuc2kSZpsh0xYfVV8rpFDw=` | **Recompute whenever that script changes** (the `check:app-shell` script already guards it) |
| Angular critical-CSS loader `onload="this.media='all'"` | `sha256-MhtPZXr7+LpJUY5qtMutB+qWfQtMaPccfe7QXtCcEYc=` with `'unsafe-hashes'` | Emitted by the CLI's critical-CSS inlining |
| Inlined critical `<style>` block | `style-src 'unsafe-inline'` | Its content (and so any hash) changes every time CSS changes, so a hash isn't practical |
| `connect-src` | API base + Moyasar tokenization host | Mirrors `ALLOWED_PROVIDER_HOSTS` in `core/payments/provider-url.ts` and `environment.apiBaseUrl`. Use the production API host in prod |
| 3DS redirect | not needed in CSP | It's a top-level navigation (`location.assign`), which `connect-src` doesn't govern |

## SPA routing the host must provide (PROD-04)
Every unknown path must serve `index.html` with status 200. This includes the backend payment callbacks
`/onboarding/payment-return`, `-processing`, `-done` and `-failed`, plus `/login`, `/select-company` and `/access-denied`, which
sibling apps link to directly.

## Options that need an owner decision (not applied)
- Angular CLI `security.autoCsp` generates a hash-based strict CSP automatically, but in Angular 22 it's still marked
  experimental. Revisit once it's stable.
- Turning off critical-CSS inlining (`optimization.styles.inlineCritical: false`) would remove `'unsafe-hashes'` and the inline
  style, but it changes how the first paint loads. That's a visible-performance change, so it needs approval.

## How to validate after deployment
1. `curl -sI https://<host>/login` shows every header above.
2. Load login, members and the payment page with DevTools open: no CSP violations in the console.
3. Embed `https://<host>/login` in an iframe on another origin: the browser refuses to frame it.
4. Run Mozilla Observatory or securityheaders.com against the host.
