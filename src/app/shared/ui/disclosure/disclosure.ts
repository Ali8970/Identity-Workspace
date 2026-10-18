import { Component, ElementRef, effect, input, viewChild } from '@angular/core';

/**
 * One accordion section inside a parent card. Native `<details>` keeps
 * keyboard and screen-reader behavior. `forceOpen` opens the section for a
 * search without locking it open.
 */
@Component({
  selector: 'app-disclosure',
  host: { class: 'block px-3 pt-2 last:pb-2' },
  template: `
    <details
      #panel
      class="group overflow-hidden rounded-lg border-[1.468px] border-border-subtle bg-surface"
    >
      <summary
        class="flex cursor-pointer list-none items-center gap-3 bg-table-head px-3 py-2.5 text-[13px] font-semibold text-text hover:bg-surface-disabled focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary [&::-webkit-details-marker]:hidden"
      >
        <span class="min-w-0 flex-1 truncate">{{ heading() }}</span>
        <span class="ms-auto inline-flex shrink-0 items-center gap-2">
          @if (countLabel(); as count) {
            <span
              class="inline-flex min-w-5 items-center justify-center rounded-full bg-info-bg px-2 py-0.5 text-[11px] font-semibold tabular-nums text-info"
            >
              {{ count }}
            </span>
          }
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
            class="size-3.5 text-text-muted transition-transform duration-150 group-open:rotate-180"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </summary>
      <div class="border-t-[1.468px] border-border-subtle px-3 py-3">
        <ng-content />
      </div>
    </details>
  `,
})
export class Disclosure {
  readonly heading = input.required<string>();
  readonly countLabel = input<string | null>(null);
  readonly initiallyOpen = input(false);
  readonly forceOpen = input(false);

  private readonly panel = viewChild<ElementRef<HTMLDetailsElement>>('panel');
  private initialApplied = false;

  constructor() {
    effect(() => {
      const element = this.panel()?.nativeElement;
      const force = this.forceOpen();
      if (!element) {
        return;
      }
      if (force) {
        element.open = true;
        return;
      }
      if (!this.initialApplied) {
        this.initialApplied = true;
        element.open = this.initiallyOpen();
      }
    });
  }
}
