import { Component } from '@angular/core';
import { Skeleton, SkeletonHost, times } from '../../../../shared/ui/skeleton/skeleton';
import { SkeletonPanel } from '../../../../shared/ui/skeleton/skeleton-blocks';

/** Mirrors the my-access grid: roles panel beside the grouped permissions panel. */
@Component({
  selector: 'app-my-access-skeleton',
  imports: [Skeleton, SkeletonPanel],
  host: { class: 'ui-skeleton-stack' },
  template: `
    <span class="visually-hidden">{{ label() }}</span>

    <div class="workspace-access-grid">
      <app-skeleton-panel titleWidth="6rem">
        <div class="workspace-access-role-list">
          @for (role of roles; track role) {
            <article class="workspace-access-role">
              <app-skeleton variant="icon" />
              <span class="ui-skeleton-col">
                <app-skeleton variant="text" width="9rem" />
                <app-skeleton variant="text" width="6rem" />
              </span>
            </article>
          }
        </div>
      </app-skeleton-panel>

      <app-skeleton-panel titleWidth="8rem">
        @for (group of groups; track group) {
          <section class="workspace-access-perm-group">
            <header class="workspace-access-perm-group__head">
              <app-skeleton variant="title" width="6rem" />
              <app-skeleton variant="chip" width="5rem" />
            </header>
            <ul class="workspace-perm-list">
              @for (permission of permissions; track permission) {
                <li><app-skeleton variant="pill" [width]="permissionWidth($index)" /></li>
              }
            </ul>
          </section>
        }
      </app-skeleton-panel>
    </div>
  `,
})
export class MyAccessSkeleton extends SkeletonHost {
  protected readonly roles = times(3);
  protected readonly groups = times(2);
  protected readonly permissions = times(5);

  protected permissionWidth(index: number): string {
    return ['6rem', '8rem', '5rem', '9rem', '7rem'][index % 5];
  }
}
