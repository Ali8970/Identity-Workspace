import { Component } from '@angular/core';
import { Skeleton, SkeletonHost, times } from '@shared/ui/skeleton/skeleton';

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
            class="flex h-[180px] flex-col justify-between rounded-2xl border border-[#ddd] bg-surface p-5 shadow-[var(--shadow-app-card)]"
          >
            <div class="flex items-center justify-between gap-3">
              <app-skeleton variant="pill" width="4.5rem" />
              <app-skeleton variant="block" width="7.8125rem" height="1.5rem" />
            </div>
            <app-skeleton variant="text" width="9rem" />
            <div class="flex items-end justify-between">
              <app-skeleton variant="button" width="8rem" height="2rem" />
              <app-skeleton variant="text" width="3.25rem" height="0.625rem" />
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
