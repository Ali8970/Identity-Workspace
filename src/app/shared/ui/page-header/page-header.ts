import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  template: `
    <header class="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2.5">
          <h1
            class="m-0 text-[22px] leading-[1.25] font-extrabold text-text"
            id="main-content-header"
            tabindex="-1"
          >
            {{ title() }}
          </h1>
          <ng-content select="[pageHeaderBadge]" />
        </div>
        @if (description()) {
          <p class="mt-1.5 mb-0 max-w-2xl text-[13px] leading-[1.45] text-text-muted">
            {{ description() }}
          </p>
        }
      </div>
      <div class="flex shrink-0 flex-wrap items-center gap-2">
        <ng-content />
      </div>
    </header>
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly description = input<string>();
}
