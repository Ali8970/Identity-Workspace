import { Component } from '@angular/core';
import { Skeleton, SkeletonHost, times } from '../../../../shared/ui/skeleton/skeleton';

/** Mirrors the roles page: list panel chrome above, role cards below. */
@Component({
  selector: 'app-roles-skeleton',
  imports: [Skeleton],
  host: { class: 'ui-skeleton-stack' },
  template: `
    <span class="visually-hidden">{{ label() }}</span>

    <section
      class="list-table-panel overflow-hidden rounded-[10px] border-[1.468px] border-border-button bg-surface shadow-[var(--shadow-card)]"
    >
      <div
        class="flex flex-wrap items-center justify-between gap-2 border-b-[1.468px] border-border-subtle px-[18px] py-3"
      >
        <app-skeleton variant="title" width="6rem" />
        <app-skeleton variant="text" width="5rem" />
      </div>

      <div class="border-b-[1.468px] border-border-subtle px-[18px] py-[14px]">
        <app-skeleton variant="input" />
      </div>

      <ul
        class="m-0 grid list-none gap-3 p-[18px] [grid-template-columns:repeat(auto-fill,minmax(min(100%,19rem),1fr))]"
      >
        @for (card of cards; track card) {
          <li
            class="relative flex min-w-0 flex-col gap-2.5 rounded-[10px] border-[1.468px] border-border-button bg-surface p-4 shadow-[var(--shadow-card)]"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="ui-skeleton-row">
                <app-skeleton variant="icon" />
                <app-skeleton variant="text" width="4.5rem" />
              </div>
              <app-skeleton variant="pill" width="3.5rem" />
            </div>
            <app-skeleton variant="title" [width]="nameWidth($index)" />
            <app-skeleton variant="pill" width="6rem" />
            <div class="ui-skeleton-col">
              <app-skeleton variant="text" width="100%" />
              <app-skeleton variant="text" width="65%" />
            </div>
            <div
              class="mt-auto flex items-center justify-between gap-2 border-t-[1.468px] border-border-subtle pt-3"
            >
              <app-skeleton variant="text" width="6.5rem" />
              <app-skeleton variant="text" width="5rem" />
            </div>
          </li>
        }
      </ul>
    </section>
  `,
})
export class RolesSkeleton extends SkeletonHost {
  protected readonly cards = times(6);

  protected nameWidth(index: number): string {
    return ['62%', '48%', '70%', '55%', '66%', '44%'][index % 6];
  }
}
