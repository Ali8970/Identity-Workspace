/**
 * The one provider origin the browser may reach directly, and the single check that decides it.
 *
 * Two flows take a URL straight out of an API response: the 3DS challenge the payer is sent to,
 * and the tokenization endpoint the raw card is posted to. The backend validates both against
 * its own allow-list, so this is defence in depth — but the two consequences differ sharply. A
 * spoofed redirect is an open redirect; a spoofed tokenization URL aims card data at whoever
 * owns it. Both callers share this list so neither can drift from the other.
 */
const ALLOWED_PROVIDER_HOSTS: readonly string[] = ['api.moyasar.com'];

export type ProviderUrlRejectionReason = 'missing' | 'insecure' | 'untrustedHost';

export type ProviderUrlCheck =
  | { ok: true; url: URL; raw: string }
  | { ok: false; reason: ProviderUrlRejectionReason };

export function validateProviderUrl(value: string | null | undefined): ProviderUrlCheck {
  if (!value || value.trim() === '') {
    return { ok: false, reason: 'missing' };
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, reason: 'insecure' };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, reason: 'insecure' };
  }
  // Embedded credentials or an explicit non-default port reach something other than the
  // provider's public API even when the hostname matches. `new URL` also resolves
  // `https://api.moyasar.com@evil.test/` to host `evil.test`, so the hostname check below is
  // what stops that one.
  if (parsed.username !== '' || parsed.password !== '' || parsed.port !== '') {
    return { ok: false, reason: 'untrustedHost' };
  }
  if (!ALLOWED_PROVIDER_HOSTS.includes(parsed.hostname.toLowerCase())) {
    return { ok: false, reason: 'untrustedHost' };
  }

  return { ok: true, url: parsed, raw: value };
}
