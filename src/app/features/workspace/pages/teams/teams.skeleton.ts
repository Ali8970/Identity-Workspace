import { Component } from '@angular/core';
import { Skeleton, SkeletonHost, times } from '../../../../shared/ui/skeleton/skeleton';

/** Mirrors the teams page: one panel holding the team tree, roots with sub-teams. */
@Component({
  selector: 'app-teams-skeleton',
  imports: [Skeleton],
  host: { class: 'ui-skeleton-stack' },
  template: `
    <span class="visually-hidden">{{ label() }}</span>

    <section class="workspace-team-panel">
      <header class="workspace-team-panel__head">
        <app-skeleton variant="title" width="10rem" />
      </header>

      <ul class="workspace-team-tree">
        @for (root of roots; track root) {
          <li class="workspace-team-node">
            <div class="workspace-team-node__card">
              <app-skeleton variant="icon" />
              <span class="ui-skeleton-col">
                <app-skeleton variant="text" width="9rem" />
                <app-skeleton variant="text" width="12rem" />
              </span>
            </div>

            <ul class="workspace-team-tree workspace-team-tree--nested">
              @for (child of children; track child) {
                <li class="workspace-team-node">
                  <div class="workspace-team-node__card">
                    <app-skeleton variant="icon" />
                    <span class="ui-skeleton-col">
                      <app-skeleton variant="text" width="7rem" />
                      <app-skeleton variant="text" width="10rem" />
                    </span>
                  </div>
                </li>
              }
            </ul>
          </li>
        }
      </ul>
    </section>
  `,
})
export class TeamsSkeleton extends SkeletonHost {
  protected readonly roots = times(2);
  protected readonly children = times(2);
}
