import { Component } from '@angular/core';
import { Skeleton, SkeletonHost, times } from '../../../../shared/ui/skeleton/skeleton';

/** Mirrors the permissions catalogue: application list panels of grouped permission rows. */
@Component({
  selector: 'app-permissions-skeleton',
  imports: [Skeleton],
  host: { class: 'ui-skeleton-stack' },
  template: `
    <span class="visually-hidden">{{ label() }}</span>

    <div class="flex flex-col gap-4">
      @for (appGroup of appGroups; track appGroup) {
        <section
          class="list-table-panel overflow-hidden rounded-[10px] border-[1.468px] border-border-button bg-surface shadow-[var(--shadow-card)]"
        >
          <header
            class="flex flex-wrap items-center justify-between gap-2 border-b-[1.468px] border-border-subtle px-[18px] py-3"
          >
            <div class="ui-skeleton-row">
              <app-skeleton variant="icon" />
              <app-skeleton variant="title" width="7rem" />
            </div>
            <app-skeleton variant="chip" />
          </header>

          <div class="flex flex-col divide-y-[1.468px] divide-border-subtle">
            @for (group of groups; track group) {
              <section class="px-[18px] py-3.5">
                <header class="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                  <app-skeleton variant="title" width="9rem" />
                  <app-skeleton variant="chip" width="5rem" />
                </header>

                <ul class="m-0 flex list-none flex-col gap-1.5 p-0">
                  @for (item of items; track item) {
                    <li
                      class="flex flex-wrap items-center justify-between gap-2 rounded-lg border-[1.468px] border-border-subtle bg-surface-muted/40 px-3 py-2.5"
                    >
                      <span class="ui-skeleton-col">
                        <app-skeleton variant="text" [width]="nameWidth($index)" />
                        <app-skeleton variant="text" width="6rem" />
                      </span>
                      <app-skeleton variant="pill" width="8rem" />
                    </li>
                  }
                </ul>
              </section>
            }
          </div>
        </section>
      }
    </div>
  `,
})
export class PermissionsSkeleton extends SkeletonHost {
  protected readonly appGroups = times(2);
  protected readonly groups = times(2);
  protected readonly items = times(4);

  protected nameWidth(index: number): string {
    return ['11rem', '9rem', '13rem', '10rem'][index % 4];
  }
}
