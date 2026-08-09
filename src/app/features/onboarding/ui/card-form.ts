import { Component, computed, inject, input, output, signal } from '@angular/core';
import {
  FormField,
  disabled,
  form,
  maxLength,
  pattern,
  required,
  submit,
} from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../core/i18n/language.service';
import { formatMoney } from '../../../shared/utils/format-money';
import { CardFormValue } from '../models/onboarding-feature.model';

/** Shape checks only — acceptance is the provider's call, and a decline is normal. */
const CARD_NUMBER = /^[\d\s-]{12,25}$/;
const EXPIRY_MONTH = /^(0?[1-9]|1[0-2])$/;
const EXPIRY_YEAR = /^\d{2}$|^20\d{2}$/;
const CVC = /^\d{3,4}$/;

const EMPTY_CARD: CardFormValue = { name: '', number: '', month: '', year: '', cvc: '' };

/**
 * Card entry. What it collects goes to the payment provider and nowhere else — the parent
 * hands the value straight to `MoyasarTokenizationService`, which posts it off-origin and
 * returns only a token.
 *
 * Nothing here is logged, and the fields are checked for shape alone: whether a card is
 * accepted is the provider's decision, and pre-judging it locally only produces false
 * rejections. The `autocomplete` values are the browser's standard card tokens, so a password
 * manager can fill the form.
 */
@Component({
  selector: 'app-card-form',
  imports: [TranslatePipe, FormField],
  template: `
    <form class="auth-form auth-card-form" (submit)="pay($event)" novalidate>
      <div class="auth-field">
        <label class="auth-field__label" for="card-name">
          {{ 'onboarding.payment.cardName' | translate }}
        </label>
        <div class="auth-field__control">
          <span class="auth-field__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 20c1.2-3.2 3.8-5 7-5s5.8 1.8 7 5" />
            </svg>
          </span>
          <input
            id="card-name"
            class="auth-field__input"
            [class.auth-field__input--invalid]="invalid('name')"
            type="text"
            autocomplete="cc-name"
            dir="ltr"
            [placeholder]="'onboarding.payment.cardNamePlaceholder' | translate"
            [formField]="cardForm.name"
            [attr.aria-describedby]="invalid('name') ? 'card-name-error' : null"
          />
        </div>
        @if (invalid('name')) {
          <p class="auth-field__error" id="card-name-error">
            {{ 'onboarding.payment.cardNameInvalid' | translate }}
          </p>
        }
      </div>

      <div class="auth-field">
        <label class="auth-field__label" for="card-number">
          {{ 'onboarding.payment.cardNumber' | translate }}
        </label>
        <div class="auth-field__control">
          <span class="auth-field__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
              <path d="M2.5 10h19" />
            </svg>
          </span>
          <input
            id="card-number"
            class="auth-field__input"
            [class.auth-field__input--invalid]="invalid('number')"
            type="text"
            inputmode="numeric"
            autocomplete="cc-number"
            dir="ltr"
            placeholder="0000 0000 0000 0000"
            [formField]="cardForm.number"
            [attr.aria-describedby]="invalid('number') ? 'card-number-error' : null"
          />
        </div>
        @if (invalid('number')) {
          <p class="auth-field__error" id="card-number-error">
            {{ 'onboarding.payment.cardNumberInvalid' | translate }}
          </p>
        }
      </div>

      <div class="auth-field-row">
        <div class="auth-field">
          <label class="auth-field__label" for="card-month">
            {{ 'onboarding.payment.expiryMonth' | translate }}
          </label>
          <div class="auth-field__control">
            <input
              id="card-month"
              class="auth-field__input auth-field__input--bare"
              [class.auth-field__input--invalid]="invalid('month')"
              type="text"
              inputmode="numeric"
              autocomplete="cc-exp-month"
              dir="ltr"
              placeholder="MM"
              [formField]="cardForm.month"
            />
          </div>
        </div>

        <div class="auth-field">
          <label class="auth-field__label" for="card-year">
            {{ 'onboarding.payment.expiryYear' | translate }}
          </label>
          <div class="auth-field__control">
            <input
              id="card-year"
              class="auth-field__input auth-field__input--bare"
              [class.auth-field__input--invalid]="invalid('year')"
              type="text"
              inputmode="numeric"
              autocomplete="cc-exp-year"
              dir="ltr"
              placeholder="YY"
              [formField]="cardForm.year"
            />
          </div>
        </div>

        <div class="auth-field">
          <label class="auth-field__label" for="card-cvc">
            {{ 'onboarding.payment.cvc' | translate }}
          </label>
          <div class="auth-field__control">
            <input
              id="card-cvc"
              class="auth-field__input auth-field__input--bare"
              [class.auth-field__input--invalid]="invalid('cvc')"
              type="password"
              inputmode="numeric"
              autocomplete="cc-csc"
              dir="ltr"
              placeholder="123"
              [formField]="cardForm.cvc"
            />
          </div>
        </div>
      </div>

      @if (expiryInvalid()) {
        <p class="auth-field__error" role="alert">
          {{ 'onboarding.payment.expiryInvalid' | translate }}
        </p>
      }

      <p class="auth-form__info auth-form__info--inline">
        <span class="auth-card-form__lock" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
        </span>
        {{ 'onboarding.payment.securityNote' | translate }}
      </p>

      <!-- No "cancel" action here on purpose: the API exposes no way to cancel an operation, so
           a button by that name would promise something it cannot do. Leaving the card form is
           the page's own "choose a different package" link. -->
      <button
        class="ui-btn ui-btn--primary auth-form__submit"
        type="submit"
        [disabled]="busy()"
        [attr.aria-busy]="busy()"
      >
        <span class="auth-form__submit-inner">
          @if (busy()) {
            <span class="auth-form__spinner" aria-hidden="true"></span>
            {{ 'onboarding.payment.paying' | translate }}
          } @else {
            {{ 'onboarding.payment.payAction' | translate: { amount: priceLabel() } }}
          }
        </span>
      </button>
    </form>
  `,
})
export class CardForm {
  private readonly language = inject(LanguageService);

  /** Server-priced amount, on the pay button so the payer confirms what they are charged. */
  readonly amount = input.required<number>();
  readonly currency = input.required<string>();
  /** Set while tokenizing or charging — the form must not mint a second token. */
  readonly busy = input(false);

  readonly submitted = output<CardFormValue>();

  private readonly model = signal<CardFormValue>({ ...EMPTY_CARD });

  protected readonly cardForm = form(this.model, (schema) => {
    // Disabling through the schema rather than a native `disabled` attribute keeps the field
    // state the form's own — a bound control must not have its enablement set behind its back.
    disabled(schema, { when: () => this.busy() });
    required(schema.name);
    required(schema.number);
    pattern(schema.number, CARD_NUMBER);
    // Length caps live in the schema rather than as `maxlength` attributes: a bound control's
    // constraints belong to the form, and Angular rejects the attribute on a `formField` node.
    required(schema.month);
    maxLength(schema.month, 2);
    pattern(schema.month, EXPIRY_MONTH);
    required(schema.year);
    maxLength(schema.year, 4);
    pattern(schema.year, EXPIRY_YEAR);
    required(schema.cvc);
    maxLength(schema.cvc, 4);
    pattern(schema.cvc, CVC);
  });

  /** Errors appear after the first submit, not while the payer is still typing a number. */
  private readonly attempted = signal(false);

  protected readonly expiryInvalid = computed(
    () => this.invalid('month') || this.invalid('year') || this.invalid('cvc'),
  );

  protected readonly priceLabel = computed(() =>
    formatMoney(this.amount(), this.currency(), this.language.current()),
  );

  protected invalid(field: keyof CardFormValue): boolean {
    return this.attempted() && this.cardForm[field]().invalid();
  }

  protected pay(event: Event): void {
    event.preventDefault();
    this.attempted.set(true);
    void submit(this.cardForm, async () => {
      // Emitted by value. The parent forwards it to the provider and drops it; nothing is
      // stored here beyond the lifetime of this form.
      this.submitted.emit({ ...this.model() });
    });
  }
}
