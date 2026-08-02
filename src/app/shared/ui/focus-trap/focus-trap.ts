import { DestroyRef, Directive, ElementRef, afterNextRender, inject, output } from '@angular/core';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Modal focus management for the workspace dialogs.
 *
 * WCAG 2.1 requires a dialog with `aria-modal="true"` to keep focus inside itself and
 * return it on close. There is no `@angular/cdk` here (CLAUDE.md: no UI libraries), so
 * this is the minimal hand-rolled equivalent:
 *
 * - moves focus into the dialog on open (first focusable, else the container)
 * - cycles Tab / Shift+Tab within the dialog
 * - emits `dismiss` on Escape so the host still owns the close decision
 *   (both dialogs refuse to close while saving)
 * - restores focus to the trigger on close
 *
 * Apply to the element carrying `role="dialog"`. The dialogs render inside `@if`, so the
 * directive is constructed on open and destroyed on close — its lifetime is the dialog's.
 */
@Directive({
  selector: '[appFocusTrap]',
  host: {
    '(keydown)': 'onKeydown($event)',
    tabindex: '-1',
  },
})
export class FocusTrap {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Escape was pressed. The host decides whether it may actually close. */
  readonly dismiss = output<void>();

  /** Captured at construction — the dialog has not stolen focus yet. */
  private readonly previouslyFocused = document.activeElement as HTMLElement | null;

  constructor() {
    afterNextRender(() => this.focusFirst());
    inject(DestroyRef).onDestroy(() => this.previouslyFocused?.focus?.());
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.dismiss.emit();
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }

    const items = this.focusable();
    if (items.length === 0) {
      event.preventDefault();
      return;
    }

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === this.host.nativeElement)) {
      event.preventDefault();
      last.focus();
      return;
    }
    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /** Visible focusables only — a hidden control must not swallow the Tab cycle. */
  private focusable(): HTMLElement[] {
    return Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    );
  }

  private focusFirst(): void {
    const items = this.focusable();
    (items[0] ?? this.host.nativeElement).focus();
  }
}
