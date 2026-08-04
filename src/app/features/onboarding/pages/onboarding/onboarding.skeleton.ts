import { Component, input } from '@angular/core';
import { Skeleton, SkeletonHost, times } from '../../../../shared/ui/skeleton/skeleton';

/** Mirrors whichever onboarding step is loading: the company form or the package list. */
@Component({
  selector: 'app-onboarding-skeleton',
  imports: [Skeleton],
  host: { class: 'ui-skeleton-stack ui-skeleton-stack--tight' },
  template: `
    <span class="visually-hidden">{{ label() }}</span>

    <app-skeleton variant="title" width="12rem" />
    <app-skeleton variant="lead" width="18rem" />

    @if (step() === 'company') {
      @for (field of fields; track field) {
        <div class="ui-skeleton-col">
          <app-skeleton variant="text" width="7rem" />
          <app-skeleton variant="input" />
        </div>
      }
    } @else {
      <div class="auth-package-list">
        @for (card of packages; track card) {
          <div class="auth-package-card auth-package-card--placeholder">
            <app-skeleton variant="icon" />
            <span class="ui-skeleton-col">
              <app-skeleton variant="text" width="9rem" />
              <app-skeleton variant="text" width="14rem" />
              <app-skeleton variant="pill" width="5rem" />
            </span>
          </div>
        }
      </div>
    }

    <app-skeleton variant="button" width="100%" />
  `,
})
export class OnboardingSkeleton extends SkeletonHost {
  readonly step = input<'company' | 'package'>('company');

  protected readonly fields = times(2);
  protected readonly packages = times(3);
}
