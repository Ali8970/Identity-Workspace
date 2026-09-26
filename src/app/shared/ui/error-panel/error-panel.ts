import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-error-panel',
  template: `
    <div
      class="rounded-[10px] border-[1.468px] border-error bg-error-bg px-[18px] py-6"
      role="alert"
    >
      <h2 class="m-0 text-sm font-bold text-text">{{ title() }}</h2>
      @if (detail()) {
        <p class="mt-2 mb-0 text-[13px] leading-normal text-text-muted">{{ detail() }}</p>
      }
      <button
        type="button"
        class="btn-primary mt-4 inline-flex h-9 cursor-pointer items-center rounded-lg border-0 px-3.5 text-[13px] font-semibold text-on-primary"
        (click)="retry.emit()"
      >
        {{ retryLabel() }}
      </button>
    </div>
  `,
})
export class ErrorPanel {
  readonly title = input.required<string>();
  readonly detail = input<string>();
  readonly retryLabel = input.required<string>();
  readonly retry = output<void>();
}
