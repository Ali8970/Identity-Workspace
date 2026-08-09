import { Component, computed, inject, input, output } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../../core/i18n/language.service';
import { AvailablePackageView } from '../../../models/subscription.model';
import { formatMoney } from '../../../shared/utils/format-money';

/**
 * One row of the priced catalogue.
 *
 * Everything shown is rendered as the server gave it. A package is free because `isFree` says
 * so — never because its price happens to be zero — and it is selectable because `isAvailable`
 * says so, never because this component worked out that it should be.
 */
@Component({
  selector: 'app-package-card',
  imports: [TranslatePipe],
  template: `
    <button
      type="button"
      class="auth-package-card"
      role="radio"
      [attr.aria-checked]="selected()"
      [class.auth-package-card--selected]="selected()"
      [disabled]="busy() || !package().isAvailable"
      (click)="chosen.emit(package())"
    >
      <span class="auth-package-card__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      </span>

      <span class="auth-package-card__body">
        <span class="auth-package-card__name">{{ name() }}</span>
        <span class="auth-package-card__price">{{ price() }}</span>

        @if (description()) {
          <span class="auth-package-card__desc">{{ description() }}</span>
        }

        @if (includedApplications().length > 0) {
          <span class="auth-package-card__apps">
            @for (app of includedApplications(); track app) {
              <span class="auth-package-card__app">{{ app }}</span>
            }
          </span>
        }

        @if (trialDays(); as days) {
          <span class="auth-package-card__badge">
            {{ 'onboarding.package.trial' | translate: { days } }}
          </span>
        }

        @if (!package().isAvailable) {
          <span class="auth-package-card__note">{{ disabledReason() }}</span>
        }
      </span>

      <span class="auth-package-card__check" aria-hidden="true">
        @if (selected()) {
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m5 12 5 5L19 7" />
          </svg>
        }
      </span>
    </button>
  `,
})
export class PackageCard {
  private readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);

  readonly package = input.required<AvailablePackageView>();
  readonly selected = input(false);
  readonly busy = input(false);

  readonly chosen = output<AvailablePackageView>();

  protected readonly name = computed(() =>
    this.language.pick(this.package().nameAr, this.package().nameEn),
  );

  protected readonly description = computed(() =>
    this.language.pick(this.package().descriptionAr, this.package().descriptionEn),
  );

  /**
   * Free is a server fact (`isFree`), not an observation about the price.
   *
   * `TranslateService.instant` is not reactive, so the current language is read from the
   * signal here — that is what re-runs this on a language switch.
   */
  protected readonly price = computed(() => {
    const pkg = this.package();
    const language = this.language.current();
    if (pkg.isFree) {
      return this.translate.instant('onboarding.package.free') as string;
    }
    return this.translate.instant('onboarding.package.pricePerPeriod', {
      amount: formatMoney(pkg.price, pkg.currency, language),
      period: this.billingPeriod(pkg),
    }) as string;
  });

  /** Only shown when the server says a trial actually applies to this package. */
  protected readonly trialDays = computed(() => {
    const pkg = this.package();
    return pkg.isTrialAvailable && pkg.trialPeriodDays && pkg.trialPeriodDays > 0
      ? pkg.trialPeriodDays
      : null;
  });

  protected readonly includedApplications = computed(() =>
    this.package().includedApplications.map((key) =>
      this.language.labelOr(`permissions.apps.${key}`, key),
    ),
  );

  /**
   * Why the server disabled this package. Known reasons get real copy; an unrecognised one
   * falls back to a neutral line rather than echoing a server string into the UI.
   */
  protected readonly disabledReason = computed(() => {
    const reason = this.package().disabledReason;
    const fallback = this.translate.instant('onboarding.package.disabled.default') as string;
    return reason ? this.language.labelOr(`onboarding.package.disabled.${reason}`, fallback) : fallback;
  });

  /**
   * `billingPeriod` is the server's own word. It is mapped where recognised, and otherwise
   * stated as the duration the response gives — the label is never invented.
   */
  private billingPeriod(pkg: AvailablePackageView): string {
    const known = this.language.labelOr(
      `onboarding.package.period.${pkg.billingPeriod.toLowerCase()}`,
      '',
    );
    if (known !== '') {
      return known;
    }
    return this.translate.instant('onboarding.package.period.months', {
      count: pkg.durationMonths,
    }) as string;
  }
}
