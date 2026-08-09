import { Service } from '@angular/core';

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
const ALLOWED_AUTHENTICATION_HOSTS: readonly string[] = ['api.moyasar.com'];

export type RedirectRejectionReason = 'missing' | 'insecure' | 'untrustedHost';

export type RedirectUrlCheck =
  | { ok: true; url: string }
  | { ok: false; reason: RedirectRejectionReason };

export function validateAuthenticationUrl(redirectUrl: string | null | undefined): RedirectUrlCheck {
  if (!redirectUrl || redirectUrl.trim() === '') {
    return { ok: false, reason: 'missing' };
  }

  let parsed: URL;
  try {
    parsed = new URL(redirectUrl);
  } catch {
    return { ok: false, reason: 'insecure' };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, reason: 'insecure' };
  }
  if (!ALLOWED_AUTHENTICATION_HOSTS.includes(parsed.hostname.toLowerCase())) {
    return { ok: false, reason: 'untrustedHost' };
  }

  return { ok: true, url: redirectUrl };
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
