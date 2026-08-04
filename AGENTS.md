You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Do NOT set `changeDetection: ChangeDetectionStrategy.OnPush` explicitly. `OnPush` is the default in Angular v22+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Prefer inline templates for small components
- Prefer Signal Forms (`@angular/forms/signals`) for new forms. They are stable in Angular v22+ and provide signal-based state, type-safe field access, and schema-based validation
- When not using Signal Forms, prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Prefer the `@Service` decorator over `@Injectable({providedIn: 'root'})` for new singleton services (Angular v22+)
- Use the `inject()` function instead of constructor injection

## Brooch Account project

- SPA only (no SSR), zoneless, Signal Forms, SASS, ngx-translate AR/EN
- Real API via `https://stg.api.brooch.sa` from `https://dev.account.brooch.sa:4300` (ssl) — see `.cursor/rules/identity-domain.mdc`
- Also read `CLAUDE.md` and `.cursor/rules/*`

### Loading states

Three layers, do not invent a fourth:

1. **Global bar** — `loadingInterceptor` counts every `/api/` call into `HttpActivityService`; `<app-loading-bar>` in `App` renders it. Opt a request out with the `SKIP_LOADING` HttpContext token. Never add a page-level "is anything loading" flag.
2. **Skeletons** — first paint of page data. One `<page>.skeleton.ts` per page, colocated, extending `SkeletonHost` and built from `<app-skeleton>` + the blocks in `shared/ui/skeleton/`. Reuse the page's real layout classes so the placeholder matches the design; only the content becomes bars. Palette and shimmer live in `styles/_loading.scss` — never restyle a skeleton locally.
3. **Blocking overlay** — `<app-busy-overlay messageKey="…">` for actions that invalidate the page (logout, company switch, SSO hand-off). When the action ends in a full-page navigation, leave the overlay up rather than clearing it in a `finally`.

Inline `aria-busy` + `.ui-spinner` still belongs on individual busy controls.
