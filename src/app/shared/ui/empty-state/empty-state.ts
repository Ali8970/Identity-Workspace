import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `
    <div class="px-6 py-10 text-center text-text-muted">
      <h2 class="m-0 text-[13px] font-semibold text-text">{{ title() }}</h2>
      @if (detail()) {
        <p class="mx-auto mt-2 max-w-[30ch] text-[13px] leading-normal">{{ detail() }}</p>
      }
      @if (actionLabel()) {
        <button
          type="button"
          class="mt-4 inline-flex h-9 cursor-pointer items-center rounded-lg border-[1.468px] border-border-button bg-surface px-3.5 text-[13px] font-semibold text-text-muted hover:bg-surface-muted"
          (click)="action.emit()"
        >
          {{ actionLabel() }}
        </button>
      }
    </div>
  `,
  host: {
    class: 'flex w-full flex-1 flex-col items-center justify-center',
  },
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly detail = input<string>();
  readonly actionLabel = input<string>();
  readonly action = output<void>();
}
