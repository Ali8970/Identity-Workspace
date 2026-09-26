import { Component } from '@angular/core';
import { Skeleton, SkeletonHost, times } from '../../../../shared/ui/skeleton/skeleton';

/** Mirrors the roles page: list panel chrome above, role table rows below. */
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

      <div class="overflow-x-auto p-[18px]">
        @for (row of rows; track row) {
          <div class="mb-3 flex items-center gap-4 border-b-[1.468px] border-border-subtle pb-3">
            <app-skeleton variant="text" width="28%" />
            <app-skeleton variant="text" width="14%" />
            <app-skeleton variant="pill" width="5rem" />
            <app-skeleton variant="pill" width="4rem" />
            <app-skeleton variant="text" width="2rem" />
            <app-skeleton variant="icon" />
          </div>
        }
      </div>
    </section>
  `,
})
export class RolesSkeleton extends SkeletonHost {
  protected readonly rows = times(6);
}
