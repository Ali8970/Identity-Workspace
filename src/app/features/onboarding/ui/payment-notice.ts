import { Component, computed, input } from '@angular/core';

type NoticeTone = 'info' | 'warning' | 'danger';
type NoticeIcon = 'clock' | 'shield' | 'offline' | 'alert';

/**
 * Text ink comes from the `*-text` tokens, not the accent colours: amber or red on their own
 * tint falls short of WCAG AA at this size, and these notices carry real instructions.
 */
const TONES: Record<NoticeTone, string> = {
  info: 'border-(--info-border) bg-info-bg text-info-text',
  warning: 'border-(--warning-border) bg-warning-bg text-warning-text',
  danger: 'border-(--danger-border) bg-danger-bg text-danger-text',
};

/**
 * A one-line explanation on a payment result — why the wait is long, that the payer is offline,
 * why a payment was declined. Copy is projected; this only decides the tone and the icon.
 */
@Component({
  selector: 'app-payment-notice',
  host: {
    class:
      'flex w-full items-start gap-2.5 rounded-[10px] border px-3.5 py-3 text-start text-[12.5px] leading-relaxed',
    '[class]': 'toneClasses()',
  },
  template: `
    <svg
      class="mt-0.5 size-4 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.9"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      @switch (icon()) {
        @case ('clock') {
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5V12l3 2" />
        }
        @case ('shield') {
          <path d="M12 3 4.5 6.2v5.6c0 4.6 3.2 7.9 7.5 9.2 4.3-1.3 7.5-4.6 7.5-9.2V6.2Z" />
          <path d="m8.8 12.2 2.2 2.2 4.3-4.6" />
        }
        @case ('offline') {
          <path d="M2.5 8.8a14 14 0 0 1 4.3-2.6M10.2 5.2a14 14 0 0 1 11.3 3.6M5.8 12.3a9 9 0 0 1 3.6-2M14.8 10.5a9 9 0 0 1 3.4 1.8M9.2 15.8a4.5 4.5 0 0 1 5.6 0" />
          <path d="M12 19.5h.01M3.5 3.5l17 17" />
        }
        @case ('alert') {
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5v5.2M12 16.3h.01" />
        }
      }
    </svg>
    <span class="min-w-0 flex-1"><ng-content /></span>
  `,
})
export class PaymentNotice {
  readonly tone = input<NoticeTone>('info');
  readonly icon = input<NoticeIcon>('clock');

  protected readonly toneClasses = computed(() => TONES[this.tone()]);
}
