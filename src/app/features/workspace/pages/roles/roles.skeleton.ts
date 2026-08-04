import { Component } from '@angular/core';
import { Skeleton, SkeletonHost, times } from '../../../../shared/ui/skeleton/skeleton';

/** Mirrors the roles page: application groups, each a grid of role cards. */
@Component({
  selector: 'app-roles-skeleton',
  imports: [Skeleton],
  host: { class: 'ui-skeleton-stack' },
  template: `
    <span class="visually-hidden">{{ label() }}</span>

    @for (group of groups; track group) {
      <section class="workspace-app-group">
        <header class="workspace-app-group__head">
          <div class="ui-skeleton-row">
            <app-skeleton variant="icon" />
            <app-skeleton variant="title" width="7rem" />
          </div>
          <app-skeleton variant="chip" />
        </header>

        <div class="workspace-role-grid">
          @for (card of cards; track card) {
            <article class="workspace-role-card">
              <div class="ui-skeleton-col">
                <app-skeleton variant="title" width="70%" />
                <app-skeleton variant="text" width="45%" />
              </div>
              <div class="ui-skeleton-inline">
                @for (permission of permissions; track permission) {
                  <app-skeleton variant="pill" [width]="permissionWidth($index)" />
                }
              </div>
            </article>
          }
        </div>
      </section>
    }
  `,
})
export class RolesSkeleton extends SkeletonHost {
  protected readonly groups = times(2);
  protected readonly cards = times(3);
  protected readonly permissions = times(4);

  protected permissionWidth(index: number): string {
    return ['5rem', '7rem', '4.5rem', '6rem'][index % 4];
  }
}
