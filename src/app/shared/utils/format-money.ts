import { AppLanguage } from '../../core/i18n/language.service';

/**
 * Formats a server-priced amount in the currency the server named.
 *
 * The currency code arrives on the wire, so an unexpected one must not break the screen that
 * renders it: a code `Intl` rejects degrades to `499.00 XYZ` rather than throwing. Amounts are
 * only ever displayed — never sent back, never used in arithmetic that decides anything.
 */
export function formatMoney(amount: number, currency: string, language: AppLanguage): string {
  try {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
