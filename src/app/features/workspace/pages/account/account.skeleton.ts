import { Component } from '@angular/core';
import { Skeleton, SkeletonHost, times } from '../../../../shared/ui/skeleton/skeleton';
import { SkeletonPanel } from '../../../../shared/ui/skeleton/skeleton-blocks';

/** Mirrors the account page: profile, companies and sessions panels, stacked. */
@Component({
  selector: 'app-account-skeleton',
  imports: [Skeleton, SkeletonPanel],
  host: { class: 'ui-skeleton-stack' },
  template: `
    <span class="visually-hidden">{{ label() }}</span>

    <div class="workspace-account-stack">
      <app-skeleton-panel titleWidth="7rem">
        <div class="ui-skeleton-row">
          <app-skeleton variant="avatar" width="3.25rem" height="3.25rem" />
          <span class="ui-skeleton-col">
            <app-skeleton variant="text" width="14rem" />
            <app-skeleton variant="text" width="10rem" />
          </span>
        </div>
      </app-skeleton-panel>

      <app-skeleton-panel titleWidth="9rem">
        @for (company of companies; track company) {
          <article class="workspace-company-row">
            <span class="ui-skeleton-col">
              <app-skeleton variant="text" width="12rem" />
              <div class="ui-skeleton-inline">
                <app-skeleton variant="pill" />
                <app-skeleton variant="pill" width="3.5rem" />
              </div>
            </span>
            <app-skeleton variant="button" width="6rem" />
          </article>
        }
      </app-skeleton-panel>

      <app-skeleton-panel titleWidth="8rem">
        <ul class="workspace-session-list">
          @for (session of sessions; track session) {
            <li class="workspace-session-row">
              <span class="ui-skeleton-col">
                <app-skeleton variant="text" width="13rem" />
                <app-skeleton variant="text" width="7rem" />
              </span>
              <app-skeleton variant="pill" width="5rem" />
            </li>
          }
        </ul>

        <div class="workspace-actions">
          <app-skeleton variant="button" />
          <app-skeleton variant="button" width="10rem" />
        </div>
      </app-skeleton-panel>
    </div>
  `,
})
export class AccountSkeleton extends SkeletonHost {
  protected readonly companies = times(2);
  protected readonly sessions = times(3);
}
