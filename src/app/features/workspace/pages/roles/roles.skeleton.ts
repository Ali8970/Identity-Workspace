import { Component } from '@angular/core';
import { Skeleton, SkeletonHost, times } from '../../../../shared/ui/skeleton/skeleton';

@Component({
  selector: 'app-roles-skeleton',
  imports: [Skeleton],
  host: { class: 'ui-skeleton-stack' },
  template: `
    <span class="visually-hidden">{{ label() }}</span>

    <section class="workspace-data-card">
      <header class="workspace-data-card__head">
        <app-skeleton variant="title" width="6rem" />
        <app-skeleton variant="text" width="5rem" />
      </header>

      <div class="workspace-listbar">
        <app-skeleton variant="input" />
        <app-skeleton variant="input" width="11rem" />
      </div>

      <ul class="workspace-role-grid">
        @for (card of cards; track card) {
          <li class="workspace-role-card">
            <div class="workspace-role-card__top">
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
            <div class="workspace-role-card__foot">
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
