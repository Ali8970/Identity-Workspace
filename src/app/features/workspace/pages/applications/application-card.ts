import { Component, computed, inject, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ThemeService } from '../../../../core/theme/theme.service';
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
          class="flex w-[140px] max-w-full flex-col items-center rounded-lg"
          dir="ltr"
        >
          <img class="h-auto max-w-full" [src]="markSrc()" alt="" />
          <img class="h-auto max-w-full" [src]="lineSrc()" alt="" />
        </div>

        @if (app().active) {
          <span
            class="inline-flex min-h-7 shrink-0 items-center gap-1 rounded-full bg-launcher-available-bg px-2 py-1 text-[11px] leading-[16.5px] font-semibold whitespace-nowrap text-launcher-available"
          >
            <span class="grid size-[17px] place-items-center text-launcher-available" aria-hidden="true">
              <svg width="9" height="7" viewBox="0 0 8.49167 6.32819" fill="none">
                <path
                  d="M0.45974 3.70497L2.62322 5.86845L8.03193 0.45974"
                  stroke="currentColor"
                  stroke-width="0.91948"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
            {{ 'applications.available' | translate }}
          </span>
        } @else {
          <span
            class="inline-flex min-h-7 shrink-0 items-center gap-1 rounded-full bg-launcher-unavailable-bg px-2 py-1 text-[11px] leading-[16.5px] font-semibold whitespace-nowrap text-launcher-unavailable"
          >
            <span class="grid size-[17px] place-items-center text-launcher-unavailable" aria-hidden="true">
              <svg width="9" height="11" viewBox="0 0 8.49167 10.6552" fill="none">
                <path
                  d="M1.54148 4.24584H6.95019C7.54762 4.24584 8.03193 4.73015 8.03193 5.32758V9.11367C8.03193 9.7111 7.54762 10.1954 6.95019 10.1954H1.54148C0.944052 10.1954 0.45974 9.7111 0.45974 9.11367V5.32758C0.45974 4.73015 0.944052 4.24584 1.54148 4.24584Z"
                  stroke="currentColor"
                  stroke-width="0.91948"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M2.08235 4.24584V2.62322C2.08235 2.04943 2.31029 1.49914 2.71602 1.09341C3.12175 0.687678 3.67204 0.45974 4.24584 0.45974C4.81963 0.45974 5.36992 0.687678 5.77565 1.09341C6.18138 1.49914 6.40932 2.04943 6.40932 2.62322V4.24584"
                  stroke="currentColor"
                  stroke-width="0.91948"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
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
            <svg
              width="10"
              height="13"
              viewBox="0 0 9.80831 12.3072"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M1.78049 4.90416H8.02782C8.71788 4.90416 9.27729 5.46356 9.27729 6.15362V10.5268C9.27729 11.2168 8.71788 11.7762 8.02782 11.7762H1.78049C1.09043 11.7762 0.531023 11.2168 0.531023 10.5268V6.15362C0.531023 5.46356 1.09043 4.90416 1.78049 4.90416Z"
                stroke="currentColor"
                stroke-width="1.06205"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M2.40522 4.90416V3.02996C2.40522 2.3672 2.6685 1.73158 3.13714 1.26294C3.60578 0.794303 4.2414 0.531023 4.90416 0.531023C5.56691 0.531023 6.20253 0.794303 6.67117 1.26294C7.13981 1.73158 7.40309 2.3672 7.40309 3.02996V4.90416"
                stroke="currentColor"
                stroke-width="1.06205"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </p>
        }
      </div>
    </article>
  `,
})
export class ApplicationCard {
  private readonly theme = inject(ThemeService);

  readonly app = input.required<LauncherApplication>();
  readonly busy = input(false);
  readonly blocked = input(false);
  readonly launch = output<MouseEvent>();

  protected readonly nameKey = computed(() => `applications.products.${this.app().code}.name`);
  protected readonly codeKey = computed(() => `applications.products.${this.app().code}.code`);
  protected readonly titleId = computed(() => `application-${this.app().code}-title`);
  protected readonly markSrc = computed(() =>
    this.theme.preference() === 'dark' ? this.app().markDark : this.app().mark,
  );
  protected readonly lineSrc = computed(() =>
    this.theme.preference() === 'dark' ? this.app().lineDark : this.app().line,
  );

  protected openApp(event: MouseEvent): void {
    this.launch.emit(event);
  }
}
