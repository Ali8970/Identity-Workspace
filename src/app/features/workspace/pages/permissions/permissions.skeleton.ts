import { Component } from '@angular/core';
import { Skeleton, SkeletonHost, times } from '../../../../shared/ui/skeleton/skeleton';

/** Mirrors the permissions catalogue: application groups of grouped permission rows. */
@Component({
  selector: 'app-permissions-skeleton',
  imports: [Skeleton],
  host: { class: 'ui-skeleton-stack' },
  template: `
    <span class="visually-hidden">{{ label() }}</span>

    @for (appGroup of appGroups; track appGroup) {
      <section class="workspace-app-group">
        <header class="workspace-app-group__head">
          <div class="ui-skeleton-row">
            <app-skeleton variant="icon" />
            <app-skeleton variant="title" width="7rem" />
          </div>
          <app-skeleton variant="chip" />
        </header>

        @for (group of groups; track group) {
          <section class="workspace-perm-group">
            <header class="workspace-perm-group__head">
              <app-skeleton variant="title" width="9rem" />
              <app-skeleton variant="chip" width="5rem" />
            </header>

            <ul class="workspace-perm-catalog">
              @for (item of items; track item) {
                <li class="workspace-perm-catalog-item">
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
      </section>
    }
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
