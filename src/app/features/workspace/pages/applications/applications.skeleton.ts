import { Component } from '@angular/core';
import { Skeleton, SkeletonHost, times } from '../../../../shared/ui/skeleton/skeleton';

/** Mirrors the application launcher grid. */
@Component({
  selector: 'app-applications-skeleton',
  imports: [Skeleton],
  host: { class: 'ui-skeleton-stack' },
  template: `
    <span class="visually-hidden">{{ label() }}</span>

    <div
      class="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,17rem),1fr))]"
    >
      @for (card of cards; track card) {
        <article
          class="flex min-h-full flex-col gap-3.5 rounded-[10px] border-[1.468px] border-border-button bg-surface p-4 shadow-[var(--shadow-card)]"
        >
          <div class="flex items-start gap-3">
            <app-skeleton variant="icon" width="2.75rem" height="2.75rem" />
            <span class="ui-skeleton-col min-w-0 flex-1">
              <app-skeleton variant="text" width="8rem" />
              <app-skeleton variant="text" width="4rem" />
            </span>
          </div>
          <div class="mt-auto flex items-center justify-end">
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
