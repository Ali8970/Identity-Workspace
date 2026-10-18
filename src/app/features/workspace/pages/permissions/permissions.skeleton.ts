import { Component } from '@angular/core';
import { Skeleton, SkeletonHost, times } from '../../../../shared/ui/skeleton/skeleton';

/** Mirrors the permissions catalogue: app cards whose groups start closed. */
@Component({
  selector: 'app-permissions-skeleton',
  imports: [Skeleton],
  host: { class: 'ui-skeleton-stack' },
  template: `
    <span class="visually-hidden">{{ label() }}</span>

    <app-skeleton variant="input" />

    <div class="flex flex-col gap-4">
      @for (appGroup of appGroups; track appGroup) {
        <section
          class="overflow-hidden rounded-[10px] border-[1.468px] border-border-button bg-surface shadow-[var(--shadow-card)]"
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

          <div>
            @for (group of groups; track group) {
              <div class="px-3 pt-2 last:pb-2">
                <div
                  class="flex items-center justify-between gap-2 overflow-hidden rounded-lg border-[1.468px] border-border-subtle bg-table-head px-3 py-2.5"
                >
                  <app-skeleton variant="title" width="8rem" />
                  <app-skeleton variant="pill" width="1.75rem" />
                </div>
              </div>
            }
          </div>
        </section>
      }
    </div>
  `,
})
export class PermissionsSkeleton extends SkeletonHost {
  protected readonly appGroups = times(2);
  protected readonly groups = times(3);
}
