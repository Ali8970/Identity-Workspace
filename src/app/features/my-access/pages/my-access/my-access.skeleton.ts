import { Component } from '@angular/core';
import { Skeleton, SkeletonHost, times } from '@shared/ui/skeleton/skeleton';
import { SkeletonPanel } from '@shared/ui/skeleton/skeleton-blocks';

/** Mirrors My access: roles beside permissions grouped by application. */
@Component({
  selector: 'app-my-access-skeleton',
  imports: [Skeleton, SkeletonPanel],
  host: { class: 'ui-skeleton-stack' },
  template: `
    <span class="visually-hidden">{{ label() }}</span>

    <div class="grid grid-cols-2 gap-4 max-w1024:grid-cols-1">
      <app-skeleton-panel titleWidth="6rem">
        <div class="flex flex-col gap-2">
          @for (role of roles; track role) {
            <div class="flex items-center gap-3">
              <app-skeleton variant="icon" />
              <span class="ui-skeleton-col">
                <app-skeleton variant="text" width="9rem" />
                <app-skeleton variant="text" width="6rem" />
              </span>
            </div>
          }
        </div>
      </app-skeleton-panel>

      <app-skeleton-panel titleWidth="8rem">
        <div>
          @for (group of groups; track group) {
            <div class="px-3 pt-2 last:pb-2">
              <div
                class="flex items-center justify-between gap-2 overflow-hidden rounded-lg border-[1.468px] border-border-subtle bg-table-head px-3 py-2.5"
              >
                <app-skeleton variant="title" width="6rem" />
                <app-skeleton variant="pill" width="1.75rem" />
              </div>
            </div>
          }
        </div>
      </app-skeleton-panel>
    </div>
  `,
})
export class MyAccessSkeleton extends SkeletonHost {
  protected readonly roles = times(3);
  protected readonly groups = times(2);
}
