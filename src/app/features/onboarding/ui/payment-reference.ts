import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

const COPIED_FOR_MS = 2_000;

/**
 * The purchase's reference, for the moment the payer needs support. Only the first group of the
 * id is shown — a readable handle — while Copy hands over the whole id, which is what support
 * looks up. The id is already in the page URL, so showing it discloses nothing new.
 */
@Component({
  selector: 'app-payment-reference',
  imports: [TranslatePipe],
  host: { class: 'inline-flex items-center gap-1 align-middle' },
  template: `
    <code
      class="rounded-[6px] bg-surface-muted px-1.5 py-0.5 font-mono text-[11.5px] font-semibold tracking-wide text-text"
      dir="ltr"
      [title]="value()"
    >
      #{{ label() }}
    </code>
    @if (canCopy) {
      <button
        type="button"
        class="grid size-6 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
        [attr.aria-label]="(copied() ? 'onboarding.result.reference.copied' : 'onboarding.result.reference.copy') | translate"
        (click)="copy()"
      >
        @if (copied()) {
          <svg class="size-3.5 text-success" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m3.5 8.5 3 3 6-6.5" />
          </svg>
        } @else {
          <svg class="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">
            <rect x="5.5" y="5.5" width="8" height="8" rx="1.75" />
            <path d="M10.5 5.5V4.25A1.75 1.75 0 0 0 8.75 2.5h-4.5A1.75 1.75 0 0 0 2.5 4.25v4.5c0 .97.78 1.75 1.75 1.75H5.5" />
          </svg>
        }
      </button>
      <span class="sr-only" aria-live="polite">
        @if (copied()) {
          {{ 'onboarding.result.reference.copied' | translate }}
        }
      </span>
    }
  `,
})
export class PaymentReference {
  readonly value = input.required<string>();

  protected readonly label = computed(() => this.value().split('-')[0].toUpperCase());

  /** The Clipboard API exists only in secure contexts; without it there is nothing to offer. */
  protected readonly canCopy = typeof navigator !== 'undefined' && navigator.clipboard !== undefined;
  protected readonly copied = signal(false);

  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearTimer());
  }

  protected copy(): void {
    navigator.clipboard.writeText(this.value()).then(
      () => {
        this.copied.set(true);
        this.clearTimer();
        this.timer = setTimeout(() => this.copied.set(false), COPIED_FOR_MS);
      },
      // A refused clipboard (permissions, an unfocused document) leaves the id on screen to read.
      () => undefined,
    );
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
