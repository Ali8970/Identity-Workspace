import { Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PaymentReference } from './payment-reference';

/**
 * The receipt on a completed purchase, cut like a ticket. Every value arrives already formatted
 * from the backend's verified answer — this only lays it out. Rows the backend did not report
 * (a card is only known after a 3DS return) are left out rather than shown empty.
 */
@Component({
  selector: 'app-payment-receipt',
  imports: [TranslatePipe, PaymentReference],
  styles: `
    :host { display: block; }
    .ticket {
      filter: drop-shadow(0 10px 18px color-mix(in oklab, var(--text) 9%, transparent));
      animation: ticket-in 0.62s cubic-bezier(0.2, 0.7, 0.2, 1) 0.35s both;
    }
    .stub {
      position: relative;
      overflow: hidden;
      border: 1px solid var(--border-button);
      background: var(--surface-muted);
      mask:
        radial-gradient(circle at 0 var(--notch), transparent 9px, #000 9.5px) left / 51% 100% no-repeat,
        radial-gradient(circle at 100% var(--notch), transparent 9px, #000 9.5px) right / 51% 100% no-repeat;
    }
    .stub--top { --notch: 100%; border-block-end: 0; border-start-start-radius: 14px; border-start-end-radius: 14px; }
    .stub--bottom { --notch: 0; border-block-start: 0; border-end-start-radius: 14px; border-end-end-radius: 14px; }
    .stub--bottom::before {
      content: '';
      position: absolute;
      inset-block-start: 0;
      inset-inline: 14px;
      border-block-start: 1.5px dashed var(--border);
    }
    .stub--top::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(105deg, transparent 30%, color-mix(in oklab, var(--surface) 85%, transparent) 50%, transparent 70%);
      translate: -100% 0;
      animation: shine 1.2s ease-in-out 1.1s both;
    }
    @keyframes ticket-in { from { opacity: 0; translate: 0 14px; scale: 0.97; } }
    @keyframes shine { to { translate: 100% 0; } }
  `,
  template: `
    <section class="ticket text-start" [attr.aria-label]="'onboarding.result.receipt.label' | translate">
      <div class="stub stub--top px-[18px] pt-4 pb-3.5">
        <div class="flex items-center justify-between gap-3">
          <span class="text-[12px] font-semibold text-text-muted">
            {{ 'onboarding.result.receipt.amountPaid' | translate }}
          </span>
          <span
            class="inline-flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-[11px] font-bold text-success-text"
          >
            <svg class="size-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m3.5 8.5 3 3 6-6.5" />
            </svg>
            {{ 'onboarding.result.receipt.paid' | translate }}
          </span>
        </div>
        <p class="mt-1 mb-0 text-[26px] leading-tight font-extrabold tracking-tight text-text tabular-nums">
          {{ amount() }}
        </p>
      </div>

      <dl class="stub stub--bottom m-0 grid gap-2.5 px-[18px] pt-4 pb-3.5 text-[12.5px]">
        @if (paidWith(); as card) {
          <div class="flex items-center justify-between gap-3">
            <dt class="text-text-muted">{{ 'onboarding.result.receipt.card' | translate }}</dt>
            <dd class="m-0 inline-flex items-center gap-1.5 font-semibold text-text">
              <svg class="size-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
                <path d="M2.5 10h19" />
              </svg>
              <bdi dir="ltr">{{ card }}</bdi>
            </dd>
          </div>
        }
        @if (paidOn(); as date) {
          <div class="flex items-center justify-between gap-3">
            <dt class="text-text-muted">{{ 'onboarding.result.receipt.date' | translate }}</dt>
            <dd class="m-0 font-semibold text-text">{{ date }}</dd>
          </div>
        }
        <div class="flex items-center justify-between gap-3">
          <dt class="text-text-muted">{{ 'onboarding.result.reference.label' | translate }}</dt>
          <dd class="m-0"><app-payment-reference [value]="reference()" /></dd>
        </div>
      </dl>
    </section>
  `,
})
export class PaymentReceipt {
  /** Formatted by the page from the server's figures; display only. */
  readonly amount = input.required<string>();
  readonly paidWith = input<string | null>(null);
  readonly paidOn = input<string | null>(null);
  readonly reference = input.required<string>();
}
