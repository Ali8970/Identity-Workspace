import { Component } from '@angular/core';
import { Skeleton, SkeletonHost, times } from '../../../../shared/ui/skeleton/skeleton';

/** Mirrors the applications launcher: summary, then a six-card grid. */
@Component({
  selector: 'app-applications-skeleton',
  imports: [Skeleton],
  host: { class: 'ui-skeleton-stack' },
  template: `
    <span class="visually-hidden">{{ label() }}</span>

    <section
      class="rounded-[20px] border-[1.468px] border-border-button bg-launcher-panel p-6 max-w480:p-4"
    >
      <div class="flex items-center justify-between gap-3">
        <app-skeleton variant="title" width="9rem" />
        <app-skeleton variant="text" width="5rem" />
      </div>
      <div class="mt-[18px] grid grid-cols-3 gap-6 max-w1024:grid-cols-2 max-w480:grid-cols-1">
        @for (card of cards; track card) {
          <article
            class="flex min-h-[222px] flex-col gap-4 rounded-2xl border-[1.468px] border-border-button bg-surface p-5"
          >
            <div class="flex items-start justify-between gap-3">
              <app-skeleton variant="block" width="8.75rem" height="2.75rem" />
              <app-skeleton variant="pill" width="4.5rem" />
            </div>
            <span class="ui-skeleton-col">
              <app-skeleton variant="text" width="9rem" />
              <app-skeleton variant="text" width="4rem" />
            </span>
            <div class="mt-auto flex justify-end">
              <app-skeleton variant="button" width="7.5rem" />
            </div>
          </article>
        }
      </div>
    </section>
  `,
})
export class ApplicationsSkeleton extends SkeletonHost {
  protected readonly cards = times(6);
}
