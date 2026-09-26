import { Component } from '@angular/core';
import { Skeleton, SkeletonHost, times } from '../../../../shared/ui/skeleton/skeleton';

/** Mirrors the teams page: org-chart panel chrome above, tree cards below. */
@Component({
  selector: 'app-teams-skeleton',
  imports: [Skeleton],
  host: { class: 'ui-skeleton-stack' },
  template: `
    <span class="visually-hidden">{{ label() }}</span>

    <section class="workspace-org-chart">
      <div
        class="flex flex-wrap items-center justify-between gap-2 border-b-[1.468px] border-border-subtle px-[18px] py-3"
      >
        <app-skeleton variant="title" width="9rem" />
      </div>

      <div class="workspace-org-chart__viewport">
        <ul class="workspace-org-chart__tree">
          <li class="workspace-org-chart__item">
            <div class="workspace-org-chart__node">
              <div class="workspace-org-chart__card">
                <app-skeleton variant="icon" />
                <span class="ui-skeleton-col">
                  <app-skeleton variant="title" width="8rem" />
                  <app-skeleton variant="text" width="5rem" />
                  <app-skeleton variant="text" width="7rem" />
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
                        <app-skeleton variant="title" [width]="nameWidth($index)" />
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

  protected nameWidth(index: number): string {
    return ['7rem', '6rem', '8rem'][index % 3];
  }
}
