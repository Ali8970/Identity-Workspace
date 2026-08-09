import { Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { OnboardingStep } from '../models/onboarding-feature.model';

const STEPS: readonly { key: OnboardingStep; labelKey: string }[] = [
  { key: 'company', labelKey: 'onboarding.stepCompany' },
  { key: 'package', labelKey: 'onboarding.stepPackage' },
  { key: 'payment', labelKey: 'onboarding.stepPayment' },
];

/**
 * Progress across the onboarding routes.
 *
 * It reflects which route is open — it is not the journey's state. Real progress lives on the
 * server (`onboardingState`, and the operation's own status) and is re-read on every entry.
 */
@Component({
  selector: 'app-onboarding-stepper',
  imports: [TranslatePipe],
  template: `
    <nav class="auth-stepper" [attr.aria-label]="'onboarding.stepsLabel' | translate">
      <ol class="auth-stepper__list">
        @for (step of steps; track step.key; let last = $last; let index = $index) {
          <li
            class="auth-stepper__item"
            [class.auth-stepper__item--active]="index === activeIndex()"
            [class.auth-stepper__item--done]="index < activeIndex()"
            [attr.aria-current]="index === activeIndex() ? 'step' : null"
          >
            <span class="auth-stepper__marker" aria-hidden="true">{{ index + 1 }}</span>
            <span class="auth-stepper__label">{{ step.labelKey | translate }}</span>
          </li>
          @if (!last) {
            <li class="auth-stepper__divider" aria-hidden="true"></li>
          }
        }
      </ol>
    </nav>
  `,
})
export class OnboardingStepper {
  readonly current = input.required<OnboardingStep>();

  protected readonly steps = STEPS;

  protected readonly activeIndex = computed(() =>
    STEPS.findIndex((step) => step.key === this.current()),
  );
}
