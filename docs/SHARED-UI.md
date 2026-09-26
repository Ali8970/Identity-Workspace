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

## Type scale (Lama Sans via `--font-family`)

| Role | Size / weight | Typical use |
|------|---------------|-------------|
| Page / dialog title | 22 / 800 | `PageHeader`, dialog titles |
| Section / card title | 15 / 700 | Role / app card names |
| Body | 13 / 400 | Leads, descriptions, table cells |
| Name / emphasis | 13 / 600 | App group headers, member names |
| Badge / chip | 11 / 600 | Status pills, counts, keys |
| Table head | 11 / 700 | Column labels |
| Field label | 12 / 600 | Form labels above `.field-control` |

Primary actions use `.btn-primary` (CRM gradient). Inputs use `.field-control`
(no hover restyle — focus only). Dialog panels: `border-button`, radius `10px`.

## Styling rules

- Tailwind utilities + tokens in `src/tailwind.css` (`@theme inline`).
- Do not invent parallel sidebar / header / table / filter styles.
- Do not add new feature SCSS for redesigned screens; migrate to utilities.
- Global shared classes that cannot be utilities: `.field-control`,
  `.btn-primary`, `.panel-section`, `.list-table-panel`, `.table-row-action-icon`
  (same as Administration / CRM).

## Future package

When extracting `@brooch/ui`, move these files unchanged and switch imports.
Keep APIs small: inputs/outputs only; no feature knowledge inside the kit.
