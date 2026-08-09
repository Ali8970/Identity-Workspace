import { validateAuthenticationUrl } from './payment-redirect';

/**
 * The redirect allow-list is the last thing standing between a corrupted `redirectUrl` and an
 * open redirect that hands a payer to an attacker mid-checkout. The backend validates it too;
 * these cases pin the browser-side half so it cannot quietly relax.
 */
describe('validateAuthenticationUrl', () => {
  it('accepts an https provider URL', () => {
    const result = validateAuthenticationUrl('https://api.moyasar.com/v1/payments/abc/3ds');

    expect(result).toEqual({ ok: true, url: 'https://api.moyasar.com/v1/payments/abc/3ds' });
  });

  it('accepts the provider host regardless of case', () => {
    expect(validateAuthenticationUrl('https://API.Moyasar.COM/v1/x').ok).toBe(true);
  });

  it.each([null, undefined, '', '   '])('rejects %p as missing', (value) => {
    expect(validateAuthenticationUrl(value)).toEqual({ ok: false, reason: 'missing' });
  });

  it('rejects a plain-http provider URL', () => {
    expect(validateAuthenticationUrl('http://api.moyasar.com/v1/x')).toEqual({
      ok: false,
      reason: 'insecure',
    });
  });

  it('rejects a javascript: URL', () => {
    expect(validateAuthenticationUrl('javascript:alert(1)')).toEqual({
      ok: false,
      reason: 'insecure',
    });
  });

  it('rejects something that is not a URL at all', () => {
    expect(validateAuthenticationUrl('/onboarding/payment-done')).toEqual({
      ok: false,
      reason: 'insecure',
    });
  });

  it('rejects an unknown host', () => {
    expect(validateAuthenticationUrl('https://evil.example.com/3ds')).toEqual({
      ok: false,
      reason: 'untrustedHost',
    });
  });

  /** `api.moyasar.com.evil.test` and `evil.test?x=api.moyasar.com` must not slip through. */
  it('rejects a host that merely contains the provider host', () => {
    expect(validateAuthenticationUrl('https://api.moyasar.com.evil.test/3ds')).toEqual({
      ok: false,
      reason: 'untrustedHost',
    });
    expect(validateAuthenticationUrl('https://evil.test/?next=api.moyasar.com')).toEqual({
      ok: false,
      reason: 'untrustedHost',
    });
  });
});
