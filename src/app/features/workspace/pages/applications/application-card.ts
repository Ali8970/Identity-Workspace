import { Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LauncherApplication } from './application-catalogue';

@Component({
  selector: 'app-application-card',
  imports: [TranslatePipe],
  template: `
    <article
      class="relative flex h-full min-h-[222px] flex-col overflow-hidden rounded-2xl border-[1.468px] border-border-button bg-surface p-5"
      [style.box-shadow]="app().active ? 'var(--shadow-app-card)' : 'none'"
      [style.--card-accent]="app().accent"
      role="listitem"
      [attr.aria-labelledby]="titleId()"
    >
      <span
        class="absolute inset-y-0 start-0 w-1 bg-(--card-accent)"
        [class.opacity-50]="!app().active"
        aria-hidden="true"
      ></span>

      <div class="flex flex-wrap items-start justify-between gap-3">
        <div
          class="flex w-[140px] max-w-full flex-col items-center rounded-lg bg-launcher-logo-plate"
          dir="ltr"
        >
          <img class="h-auto max-w-full" [src]="app().mark" alt="" />
          <img class="h-auto max-w-full" [src]="app().line" alt="" />
        </div>

        @if (app().active) {
          <span
            class="inline-flex min-h-7 shrink-0 items-center gap-1 rounded-full bg-launcher-available-bg px-2 py-1 text-[11px] leading-[16.5px] font-semibold whitespace-nowrap text-launcher-available"
          >
            <span class="grid size-[17px] place-items-center" aria-hidden="true">
              <img src="/images/apps/icon-check.svg" alt="" />
            </span>
            {{ 'applications.available' | translate }}
          </span>
        } @else {
          <span
            class="inline-flex min-h-7 shrink-0 items-center gap-1 rounded-full bg-launcher-unavailable-bg px-2 py-1 text-[11px] leading-[16.5px] font-semibold whitespace-nowrap text-launcher-unavailable"
          >
            <span class="grid size-[17px] place-items-center" aria-hidden="true">
              <img src="/images/apps/icon-lock.svg" alt="" />
            </span>
            {{ 'applications.unavailable' | translate }}
          </span>
        }
      </div>

      <div class="pt-6">
        <h3
          class="m-0 text-[17px] leading-[25.5px] font-normal text-text"
          [id]="titleId()"
        >
          {{ nameKey() | translate }}
        </h3>
        <p
          class="mt-0.5 mb-0 text-[11px] leading-[16.5px] font-semibold tracking-[0.08em] text-launcher-muted"
          dir="ltr"
        >
          {{ codeKey() | translate }}
        </p>
      </div>

      <div class="mt-auto flex min-h-[42px] items-end justify-end pt-5">
        @if (app().active && app().launchable && app().url) {
          <a
            class="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[10px] bg-(--card-accent) px-[17px] text-[13px] leading-[19.5px] font-semibold text-(--app-ink)! no-underline shadow-[var(--shadow-app-button)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            [href]="app().url"
            rel="noopener"
            [attr.aria-busy]="busy() || null"
            [attr.aria-disabled]="blocked() ? true : null"
            (click)="openApp($event)"
          >
            @if (busy()) {
              {{ 'applications.opening' | translate }}
            } @else {
              {{ 'applications.open' | translate }}
              <img src="/images/apps/icon-external.svg" alt="" />
            }
          </a>
        } @else if (app().active) {
          <button
            type="button"
            class="inline-flex min-h-[42px] cursor-not-allowed items-center justify-center gap-2 rounded-[10px] bg-(--card-accent) px-[17px] text-[13px] leading-[19.5px] font-semibold text-(--app-ink)! opacity-60 shadow-[var(--shadow-app-button)]"
            disabled
          >
            {{ 'applications.open' | translate }}
          </button>
        } @else {
          <p class="m-0 flex items-center gap-1.5 text-[11px] leading-4 text-launcher-muted">
            <span>{{ 'applications.unavailableHint' | translate }}</span>
            <img src="/images/apps/icon-lock-hint.svg" alt="" />
          </p>
        }
      </div>
    </article>
  `,
})
export class ApplicationCard {
  readonly app = input.required<LauncherApplication>();
  readonly busy = input(false);
  readonly blocked = input(false);
  readonly launch = output<MouseEvent>();

  protected readonly nameKey = computed(() => `applications.products.${this.app().code}.name`);
  protected readonly codeKey = computed(() => `applications.products.${this.app().code}.code`);
  protected readonly titleId = computed(() => `application-${this.app().code}-title`);

  protected openApp(event: MouseEvent): void {
    this.launch.emit(event);
  }
}
