# Shared Brooch UI kit (Account)

Account, Administration, and CRM should look like one product family. Until a
published `@brooch/ui` package exists, **Administration’s `shared/ui` APIs are
the source of truth**. Account implements the same selectors and inputs under
`src/app/shared/ui/`.

## Import for new features

```ts
import { PageHeader } from '../shared/ui/page-header/page-header';
import { ListStats } from '../shared/ui/list-stats/list-stats';
import { ListFilterBar } from '../shared/ui/list-filter-bar/list-filter-bar';
import { EmptyState } from '../shared/ui/empty-state/empty-state';
import { ErrorPanel } from '../shared/ui/error-panel/error-panel';
import { PanelSection } from '../shared/ui/panel-section/panel-section';
import { MetricCard } from '../shared/ui/metric-card/metric-card';
```

## Canonical list page composition

```html
<app-page-header [title]="…" [description]="…">…actions…</app-page-header>
<app-list-stats [stats]="…" [loading]="…" />
<section class="list-table-panel …">
  <app-list-filter-bar … (apply)="…" (clear)="…">…extra filters…</app-list-filter-bar>
  <!-- skeleton | error | empty | table -->
</section>
```

Filters must **Apply / Clear** (and Enter-to-apply on search). Do not filter on
every keystroke when the filter drives an API. Client-side-only filters still
use the same control pattern for consistency.

## Shell

- `ShellLayout` + `ShellSidebar` + `ShellHeader` match Admin/CRM: gradient rail,
  collapse to zero width, 52px header, theme + language + user menu.
- Account keeps the **company switcher** in the header (Account-only).

## Styling rules

- Tailwind utilities + tokens in `src/tailwind.css` (`@theme inline`).
- Do not invent parallel sidebar / header / table / filter styles.
- Do not add new feature SCSS for redesigned screens; migrate to utilities.
- Global shared classes that cannot be utilities: `.field-control`,
  `.panel-section`, `.list-table-panel` (same as Administration).

## Future package

When extracting `@brooch/ui`, move these files unchanged and switch imports.
Keep APIs small: inputs/outputs only; no feature knowledge inside the kit.
