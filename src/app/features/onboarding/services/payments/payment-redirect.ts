import { Service } from '@angular/core';
import { ProviderUrlRejectionReason, validateProviderUrl } from './provider-url';

/**
 * The single place the browser is allowed to leave Brooch for a payment provider.
 *
 * This is a 3DS authentication step, not a hosted checkout: the payment already exists,
 * the backend created it, and this URL only carries the payer through the card issuer's
 * challenge. Brooch learns the outcome by re-reading the payment from the provider
 * afterwards — never from where the browser came back.
 *
 * The URL always originates from the backend, which already validated it against its own
 * allow-list. Re-checking here is defence in depth: a corrupted or spoofed response must never
 * turn this into an open redirect.
 */
export type RedirectRejectionReason = ProviderUrlRejectionReason;

export type RedirectUrlCheck =
  | { ok: true; url: string }
  | { ok: false; reason: RedirectRejectionReason };

export function validateAuthenticationUrl(redirectUrl: string | null | undefined): RedirectUrlCheck {
  const check = validateProviderUrl(redirectUrl);

  // The payer is sent to the URL exactly as the backend issued it, not to a re-serialised
  // version of it: a 3DS link can carry path or query detail that normalisation would alter.
  return check.ok ? { ok: true, url: check.raw } : check;
}

/**
 * Hands the whole browser to the issuer's 3DS challenge — the one irreversible step in the
 * payment flow. A service rather than a bare function so it can be substituted in a test
 * instead of navigating, and `assign` rather than `replace` so Back still reaches Brooch.
 *
 * The top-level window is used deliberately: 3DS pages routinely refuse framing.
 */
@Service()
export class PaymentAuthenticationNavigator {
  goTo(url: string): void {
    window.location.assign(url);
  }
}
