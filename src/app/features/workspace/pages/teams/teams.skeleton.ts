import { Component } from '@angular/core';
import { Skeleton, SkeletonHost, times } from '../../../../shared/ui/skeleton/skeleton';

/** Mirrors the teams page: an organization chart with a root and one level of children. */
@Component({
  selector: 'app-teams-skeleton',
  imports: [Skeleton],
  host: { class: 'ui-skeleton-stack' },
  template: `
    <span class="visually-hidden">{{ label() }}</span>

    <section class="workspace-org-chart">
      <header class="workspace-org-chart__head">
        <app-skeleton variant="title" width="10rem" />
      </header>

      <div class="workspace-org-chart__viewport">
        <ul class="workspace-org-chart__tree">
          <li class="workspace-org-chart__item">
            <div class="workspace-org-chart__node">
              <div class="workspace-org-chart__card">
                <app-skeleton variant="icon" />
                <span class="ui-skeleton-col">
                  <app-skeleton variant="text" width="7rem" />
                  <app-skeleton variant="text" width="5rem" />
                </span>
              </div>
            </div>

            <ul class="workspace-org-chart__children">
              @for (child of children; track child) {
                <li class="workspace-org-chart__item">
                  <div class="workspace-org-chart__node">
                    <div class="workspace-org-chart__card">
                      <app-skeleton variant="icon" />
                      <span class="ui-skeleton-col">
                        <app-skeleton variant="text" width="6rem" />
                        <app-skeleton variant="text" width="4.5rem" />
                      </span>
                    </div>
                  </div>
                </li>
              }
            </ul>
          </li>
        </ul>
      </div>
    </section>
  `,
})
export class TeamsSkeleton extends SkeletonHost {
  protected readonly children = times(3);
}
