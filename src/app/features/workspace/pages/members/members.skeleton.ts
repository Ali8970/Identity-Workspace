import { Component } from '@angular/core';
import { Skeleton, SkeletonHost } from '../../../../shared/ui/skeleton/skeleton';
import { SkeletonTable } from '../../../../shared/ui/skeleton/skeleton-blocks';

/** Mirrors the members page: invite panel above, member table below. */
@Component({
  selector: 'app-members-skeleton',
  imports: [Skeleton, SkeletonTable],
  host: { class: 'ui-skeleton-stack' },
  template: `
    <span class="visually-hidden">{{ label() }}</span>

    <section class="workspace-data-card">
      <header class="workspace-data-card__head">
        <app-skeleton variant="title" width="8rem" />
        <app-skeleton variant="text" width="6rem" />
      </header>

      <div class="workspace-listbar">
        <app-skeleton variant="input" />
        <app-skeleton variant="input" width="12rem" />
        <app-skeleton variant="input" width="12rem" />
      </div>

      <app-skeleton-table [columns]="4" [rows]="6" [withAvatar]="true" />
    </section>
  `,
})
export class MembersSkeleton extends SkeletonHost {}
