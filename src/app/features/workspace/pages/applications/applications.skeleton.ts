import { Component } from '@angular/core';
import { Skeleton, SkeletonHost, times } from '../../../../shared/ui/skeleton/skeleton';

/** Mirrors the application launcher grid. */
@Component({
  selector: 'app-applications-skeleton',
  imports: [Skeleton],
  host: { class: 'ui-skeleton-stack' },
  template: `
    <span class="visually-hidden">{{ label() }}</span>

    <div class="app-launcher-grid">
      @for (card of cards; track card) {
        <article class="app-launcher-card">
          <div class="app-launcher-card__head">
            <app-skeleton variant="icon" width="2.75rem" height="2.75rem" />
            <span class="ui-skeleton-col">
              <app-skeleton variant="text" width="8rem" />
              <app-skeleton variant="text" width="4rem" />
            </span>
          </div>
          <div class="app-launcher-card__foot">
            <app-skeleton variant="button" width="7rem" />
          </div>
        </article>
      }
    </div>
  `,
})
export class ApplicationsSkeleton extends SkeletonHost {
  protected readonly cards = times(4);
}
