import { Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { FocusTrap } from '../focus-trap/focus-trap';

let nextDialogId = 0;

@Component({
  selector: 'app-confirm-dialog',
  imports: [TranslatePipe, FocusTrap],
  template: `
    <div class="workspace-dialog" role="presentation">
      <button
        type="button"
        class="workspace-dialog__backdrop"
        [attr.aria-label]="cancelLabel() | translate"
        (click)="onCancel()"
      ></button>
      <div
        class="workspace-dialog__panel"
        [attr.role]="destructive() ? 'alertdialog' : 'dialog'"
        aria-modal="true"
        [attr.aria-labelledby]="titleId()"
        [attr.aria-describedby]="bodyId()"
        appFocusTrap
        (dismiss)="onCancel()"
      >
        <header class="workspace-dialog__head">
          <div>
            <h2 class="workspace-dialog__title" [id]="titleId()">{{ title() | translate }}</h2>
          </div>
          <button
            type="button"
            class="workspace-dialog__close"
            [attr.aria-label]="cancelLabel() | translate"
            (click)="onCancel()"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div class="workspace-dialog__body">
          <p class="workspace-dialog__lead" [id]="bodyId()">
            {{ body() | translate: bodyParams() }}
          </p>

          <div class="workspace-form__actions workspace-dialog__actions">
            <button
              type="button"
              class="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-[1.468px] border-border-button bg-surface px-3.5 text-[13px] font-semibold text-text hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
              [disabled]="busy()"
              (click)="onCancel()"
            >
              {{ cancelLabel() | translate }}
            </button>
            <button
              type="button"
              [class]="destructive() ? 'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-danger px-3.5 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50' : 'btn-primary inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-0 px-3.5 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50'"
              [disabled]="busy()"
              [attr.aria-busy]="busy()"
              (click)="confirmed.emit()"
            >
              @if (busy()) {
                {{ busyLabel() | translate }}
              } @else {
                {{ confirmLabel() | translate }}
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ConfirmDialog {
  readonly title = input.required<string>();
  readonly body = input.required<string>();
  readonly bodyParams = input<Record<string, unknown>>({});
  readonly confirmLabel = input('common.confirm');
  readonly cancelLabel = input('common.cancel');
  readonly busyLabel = input('common.working');
  readonly destructive = input(false);
  readonly busy = input(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  private readonly instance = ++nextDialogId;
  protected readonly titleId = computed(() => `confirm-dialog-title-${this.instance}`);
  protected readonly bodyId = computed(() => `confirm-dialog-body-${this.instance}`);

  protected onCancel(): void {
    if (this.busy()) {
      return;
    }
    this.cancelled.emit();
  }
}
