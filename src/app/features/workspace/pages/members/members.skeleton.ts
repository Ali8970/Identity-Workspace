import { Component } from '@angular/core';
import { Skeleton, SkeletonHost } from '../../../../shared/ui/skeleton/skeleton';
import { SkeletonPanel, SkeletonTable } from '../../../../shared/ui/skeleton/skeleton-blocks';

/** Mirrors the members page: invite panel above, member table below. */
@Component({
  selector: 'app-members-skeleton',
  imports: [Skeleton, SkeletonPanel, SkeletonTable],
  host: { class: 'ui-skeleton-stack' },
  template: `
    <span class="visually-hidden">{{ label() }}</span>

    <app-skeleton-panel>
      <app-skeleton variant="input" />
      <div class="workspace-form__row">
        <app-skeleton variant="input" />
        <app-skeleton variant="input" />
      </div>
      <div class="workspace-form__row">
        <app-skeleton variant="input" />
        <app-skeleton variant="input" />
      </div>
      <app-skeleton variant="button" />
    </app-skeleton-panel>

    <section class="workspace-data-card">
      <header class="workspace-data-card__head">
        <app-skeleton variant="title" width="8rem" />
      </header>
      <app-skeleton-table [columns]="5" [rows]="6" [withAvatar]="true" />
    </section>
  `,
})
export class MembersSkeleton extends SkeletonHost {}
