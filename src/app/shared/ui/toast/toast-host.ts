import { Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../core/i18n/language.service';
import { ToastService } from './toast.service';

/**
 * Renders `ToastService` toasts at the top-end corner of the viewport (top-start in Arabic),
 * just below the language/theme toolbar so neither covers the other — and along the bottom on a
 * phone, clear of the brand strip. Mounted once, in `App`, so a toast survives the navigation that
 * raised it.
 *
 * The region is always in the DOM — a live region added together with its content is often
 * not announced.
 */
@Component({
  selector: 'app-toast-host',
  imports: [TranslatePipe],
  host: {
    class:
      'pointer-events-none fixed end-5 top-[4.5rem] z-[300] grid w-[360px] gap-2 max-w480:inset-x-3 max-w480:top-auto max-w480:bottom-3 max-w480:w-auto',
    role: 'region',
    'aria-live': 'polite',
    '[attr.aria-label]': 'regionLabel()',
  },
  styles: `
    .toast { animation: toast-in 0.42s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
    .toast-leave { animation: toast-out 0.26s ease-in both; }
    .countdown {
      transform-origin: left;
      animation: countdown var(--toast-duration) linear both;
    }
    :host-context([dir='rtl']) .countdown { transform-origin: right; }
    .toast:hover .countdown,
    .toast:focus-within .countdown { animation-play-state: paused; }
    .tick { stroke-dasharray: 100; animation: tick 0.4s ease-out 0.25s both; }
    @keyframes toast-in { from { opacity: 0; translate: 0 -12px; scale: 0.97; } }
    @keyframes toast-out { to { opacity: 0; translate: 0 -8px; scale: 0.97; } }
    @keyframes countdown { to { scale: 0 1; } }
    @keyframes tick { from { stroke-dashoffset: 100; } }
  `,
  template: `
    @for (toast of toasts.toasts(); track toast.id) {
      <div
        class="toast pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-[12px] border border-border-button bg-surface px-4 py-3.5 text-start shadow-[0_12px_32px_-12px_rgba(15,39,53,0.35)]"
        [class.toast-leave]="toast.leaving"
        [style.--toast-duration]="toast.durationMs + 'ms'"
        (mouseenter)="toasts.pause(toast.id)"
        (mouseleave)="toasts.resume(toast.id)"
        (focusin)="toasts.pause(toast.id)"
        (focusout)="toasts.resume(toast.id)"
      >
        <span
          class="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full"
          [class.bg-success]="toast.tone === 'success'"
          [class.text-on-primary]="toast.tone === 'success'"
          [class.bg-info-bg]="toast.tone === 'info'"
          [class.text-info-text]="toast.tone === 'info'"
          aria-hidden="true"
        >
          <svg class="size-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            @if (toast.tone === 'success') {
              <path class="tick" pathLength="100" d="m3.8 8.4 2.7 2.7 5.7-6.2" />
            } @else {
              <path d="M8 7.2v4M8 4.8h.01" />
            }
          </svg>
        </span>
        <span class="grid min-w-0 flex-1 gap-0.5">
          <span class="text-[13.5px] leading-snug font-bold text-text">{{ toast.titleKey | translate }}</span>
          <span class="text-[12.5px] leading-relaxed text-text-muted">{{ toast.messageKey | translate }}</span>
        </span>
        <button
          type="button"
          class="-me-1.5 -mt-1 grid size-7 shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
          [attr.aria-label]="'ui.toast.dismiss' | translate"
          (click)="toasts.dismiss(toast.id)"
        >
          <svg class="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="m4 4 8 8M12 4l-8 8" />
          </svg>
        </button>
        <span
          class="countdown absolute inset-x-0 bottom-0 h-[3px]"
          [class.bg-success]="toast.tone === 'success'"
          [class.bg-info]="toast.tone === 'info'"
          aria-hidden="true"
        ></span>
      </div>
    }
  `,
})
export class ToastHost {
  protected readonly toasts = inject(ToastService);
  private readonly language = inject(LanguageService);

  /** Host bindings cannot use pipes; `labelOr` tracks the language signal instead. */
  protected readonly regionLabel = computed(() =>
    this.language.labelOr('ui.toast.region', 'Notifications'),
  );
}
