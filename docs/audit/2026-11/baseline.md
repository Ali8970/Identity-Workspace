# Baseline — before any refactor (audit 2026-11)

Measured on `stg` at `fa0352c` (the payment-result redesign), plus `07cf334` (spec fixture) and `f108c37` (e2e baseline refresh).
Machine: Windows 11, Node via npm 11, Chromium (Playwright). Every later change is compared to this file.

## Static checks
| Check | Result | Notes |
|---|---|---|
| `npx eslint .` | 0 errors, **5 warnings** | `@angular-eslint/inject-at-top`, `login.page.ts:186-195` (BUG-02) |
| `tsc -p tsconfig.app.json` | Passes | |
| `tsc -p tsconfig.spec.json` | Passes (after `07cf334`) | Failed before: stale `TeamNode` fixture (BUG-01) |
| `ng test --watch=false` | **19 files, 159 of 159 tests pass** | Before `07cf334`: the bundle didn't compile, so 0 tests ran |
| i18n parity | EN 966 keys = AR 966 keys | |

## Production build (`ng build`, default configuration = production)
| Chunk | Raw | Transfer |
|---|---|---|
| Initial total | **494.06 kB** | 114.53 kB |
| `styles.css` | 161.56 kB | 23.09 kB |
| `main.js` | 28.25 kB | 8.28 kB |
| Framework chunk | 300.05 kB | 81.42 kB |
| Budget | warning at 500 kB, error at 1 MB | **5.9 kB of headroom** |

No source maps are emitted.

## End-to-end (Playwright, Chromium, API fully mocked by `e2e/api-mocks.ts`)
| Suite | Result | Purpose |
|---|---|---|
| `visual.spec.ts` | 110 of 110 | First paint of 22 routes × (4 desktop variants + narrow) |
| `applications.spec.ts`, `permission-labels.spec.ts` | 4 of 4 | Functional |
| `routes-baseline.spec.ts` | 69 of 69 | 23 routes: the API-call multiset (committed, `e2e/network-baseline/route-*.json`) and computed styles of every element, light/en and dark/ar (local `e2e/.style-baseline/`, git-ignored, 20 MB) |
| `states.spec.ts` | 30 of 30 | 15 interaction states × (light/en, dark/ar): dialogs (member invite, detail, edit roles, remove confirm; role create and details; team create and details), header company and user menus, collapsed sidebar, 390px mobile layouts. Each has a screenshot, the API-call multiset and computed styles |

Stability: the visual suite passed twice in a row after the refresh. The route and state baselines passed **3 compare runs in a row** with
no drift (finite animations are finished, looping ones frozen, web fonts awaited before capture).

### Pre-existing failures found and resolved in Step 0 (test-only changes, no product code touched)
- The unit bundle didn't compile → fixed the spec fixture (`07cf334`).
- 91 of 114 e2e tests failed on unchanged code: the snapshots predated about 40 UI commits, and the functional spec expected the old
  catalogue order and product name → snapshots regenerated and spec aligned with `application-catalogue.spec.ts` (`f108c37`).

## Known flakiness
- 2026-11-01: `routes-baseline › styles root light en` failed once in a full parallel run (2 workers) during ARCH-06, then
  passed 4 isolated runs and the next full run (215/215). Treated as capture timing under load, not drift. If it recurs, look
  at the drifting properties before suspecting the change.

## Regenerating the computed-style baseline
It's git-ignored. To compare a change against a commit: check out that commit, run
`BASELINE_UPDATE=1 npx playwright test e2e/routes-baseline.spec.ts e2e/states.spec.ts`, then check out the change and run the
same command without `BASELINE_UPDATE`.
