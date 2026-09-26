import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
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
/** Matches the formatted value the field maintains, so a half-typed date stays invalid. */
const EXPIRY = /^(0[1-9]|1[0-2]) \/ \d{2}$/;
const CVC = /^\d{3,4}$/;

/**
 * What the payer types. Expiry is ONE field — as on the card itself, and as every checkout
 * does it — and is split into the month and year the provider wants only on submit.
 */
interface CardFormModel {
  name: string;
  number: string;
  expiry: string;
  cvc: string;
}

const EMPTY_CARD: CardFormModel = { name: '', number: '', expiry: '', cvc: '' };

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
          <label class="auth-field__label" for="card-expiry">
            {{ 'onboarding.payment.expiry' | translate }}
          </label>
          <div class="auth-field__control">
            <input
              id="card-expiry"
              class="auth-field__input auth-field__input--bare"
              [class.auth-field__input--invalid]="invalid('expiry')"
              type="text"
              inputmode="numeric"
              autocomplete="cc-exp"
              dir="ltr"
              placeholder="MM / YY"
              [formField]="cardForm.expiry"
              (input)="onExpiryInput($event)"
              [attr.aria-describedby]="invalid('expiry') ? 'card-expiry-error' : null"
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

      @if (invalid('expiry')) {
        <p class="auth-field__error" id="card-expiry-error" role="alert">
          {{ 'onboarding.payment.expiryInvalid' | translate }}
        </p>
      } @else if (invalid('cvc')) {
        <p class="auth-field__error" role="alert">
          {{ 'onboarding.payment.cvcInvalid' | translate }}
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
        class="btn-primary auth-form__submit inline-flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-0 px-4 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
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

  private readonly model = signal<CardFormModel>({ ...EMPTY_CARD });

  protected readonly cardForm = form(this.model, (schema) => {
    // Disabling through the schema rather than a native `disabled` attribute keeps the field
    // state the form's own — a bound control must not have its enablement set behind its back.
    disabled(schema, { when: () => this.busy() });
    required(schema.name);
    required(schema.number);
    pattern(schema.number, CARD_NUMBER);
    required(schema.expiry);
    // Length caps live in the schema rather than as `maxlength` attributes: a bound control's
    // constraints belong to the form, and Angular rejects the attribute on a `formField` node.
    maxLength(schema.expiry, 7);
    pattern(schema.expiry, EXPIRY);
    required(schema.cvc);
    maxLength(schema.cvc, 4);
    pattern(schema.cvc, CVC);
  });

  /** Errors appear after the first submit, not while the payer is still typing a number. */
  private readonly attempted = signal(false);

  /**
   * Whether the last edit removed characters. Formatting has to know: appending " / " after
   * two digits is what the payer wants while typing, and a trap while deleting — backspace
   * would remove the slash only for it to be added straight back.
   */
  private readonly deleting = signal(false);

  protected readonly priceLabel = computed(() =>
    formatMoney(this.amount(), this.currency(), this.language.current()),
  );

  constructor() {
    // Formatting lives here rather than in the input handler so the value the FORM holds is
    // the formatted one — validation, the emitted value and what is on screen can never drift.
    // `formatExpiry` is idempotent, so this settles after a single pass.
    effect(() => {
      const typed = this.model().expiry;
      const formatted = formatExpiry(typed, this.deleting());
      if (formatted !== typed) {
        this.model.update((card) => ({ ...card, expiry: formatted }));
      }
    });
  }

  protected onExpiryInput(event: Event): void {
    this.deleting.set(((event as InputEvent).inputType ?? '').startsWith('delete'));
  }

  protected invalid(field: keyof CardFormModel): boolean {
    return this.attempted() && this.cardForm[field]().invalid();
  }

  protected pay(event: Event): void {
    event.preventDefault();
    this.attempted.set(true);
    void submit(this.cardForm, async () => {
      const card = this.model();
      const [month, year] = splitExpiry(card.expiry);
      // Emitted by value. The parent forwards it to the provider and drops it; nothing is
      // stored here beyond the lifetime of this form.
      this.submitted.emit({ name: card.name, number: card.number, month, year, cvc: card.cvc });
    });
  }
}

/**
 * Normalises what the payer typed into `MM / YY`.
 *
 * Only digits survive, capped at four, and the separator appears as soon as the month is
 * complete — so typing runs straight through from month to year without reaching for the
 * slash. While deleting, the separator is not re-added, which is what lets backspace walk back
 * out of the year and into the month instead of sticking.
 */
function formatExpiry(value: string, deleting: boolean): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);

  if (digits.length < 2) {
    return digits;
  }
  if (digits.length === 2) {
    return deleting ? digits : `${digits} / `;
  }
  return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
}

/** `MM / YY` back into the two fields the provider's tokenization endpoint takes. */
function splitExpiry(value: string): [month: string, year: string] {
  const digits = value.replace(/\D/g, '');
  return [digits.slice(0, 2), digits.slice(2)];
}
