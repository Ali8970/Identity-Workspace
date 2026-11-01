import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { PaymentConfiguration } from '../../models/subscription.model';
import { MoyasarTokenizationService, TokenizationFailure } from './moyasar-tokenization.service';

const CONFIGURATION: PaymentConfiguration = {
  provider: 'moyasar',
  publishableKey: 'pk_test_123',
  tokenizationUrl: 'https://api.moyasar.com/v1/tokens',
};

const CARD = { name: ' Sara ', number: '4111 1111 1111 1111', month: '01', year: '30', cvc: '123' };

/**
 * The one call in the app that carries raw card data. What matters is not that it works but
 * exactly HOW it leaves: off-origin, without Brooch's session, and with `save_only`.
 */
describe('MoyasarTokenizationService', () => {
  let service: MoyasarTokenizationService;
  let backend: HttpTestingController;
  let interceptorRan: boolean;

  beforeEach(() => {
    interceptorRan = false;

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(
          withInterceptors([
            (request, next) => {
              interceptorRan = true;
              return next(request);
            },
          ]),
        ),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(MoyasarTokenizationService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('posts the card straight to the provider with save_only and no credentials', () => {
    service.tokenize(CONFIGURATION, CARD).subscribe();

    const request = backend.expectOne(CONFIGURATION.tokenizationUrl);

    expect(request.request.body).toEqual({
      publishable_api_key: 'pk_test_123',
      name: 'Sara',
      number: '4111111111111111',
      month: '01',
      year: '30',
      cvc: '123',
      // Without this the token is browser-consumable only and the server-side charge fails.
      save_only: true,
    });
    // Sending the Brooch session cookie to a third party would be a leak in the other direction.
    expect(request.request.withCredentials).toBe(false);
    request.flush({ id: 'token_1' });
  });

  /** A bare HttpBackend is what keeps card data out of the app's error/telemetry pipeline. */
  it('bypasses the application interceptor chain', () => {
    service.tokenize(CONFIGURATION, CARD).subscribe();

    backend.expectOne(CONFIGURATION.tokenizationUrl).flush({ id: 'token_1' });

    expect(interceptorRan).toBe(false);
  });

  it('returns only the token and display-safe metadata', async () => {
    const tokenized = firstValueFrom(service.tokenize(CONFIGURATION, CARD));

    backend
      .expectOne(CONFIGURATION.tokenizationUrl)
      .flush({ id: 'token_1', company: 'visa', last_four: '1111', number: '4111111111111111' });

    await expect(tokenized).resolves.toEqual({
      token: 'token_1',
      brand: 'visa',
      lastFour: '1111',
    });
  });

  it('treats a 2xx without a token id as a decline', async () => {
    const tokenized = firstValueFrom(service.tokenize(CONFIGURATION, CARD));

    backend.expectOne(CONFIGURATION.tokenizationUrl).flush({ status: 'failed' });

    await expect(tokenized).rejects.toEqual({ reason: 'declined' });
  });

  it('classifies an unreachable provider as a network failure', async () => {
    const tokenized = firstValueFrom(service.tokenize(CONFIGURATION, CARD));

    backend
      .expectOne(CONFIGURATION.tokenizationUrl)
      .error(new ProgressEvent('error'), { status: 0 });

    await expect(tokenized).rejects.toEqual({ reason: 'network' });
  });

  it('refuses to call out at all when the configuration is empty', async () => {
    const tokenized = firstValueFrom(
      service.tokenize({ ...CONFIGURATION, publishableKey: '' }, CARD),
    );

    await expect(tokenized).rejects.toEqual({ reason: 'misconfigured' } satisfies TokenizationFailure);
    backend.expectNone(CONFIGURATION.tokenizationUrl);
  });

  /**
   * The tokenization URL is the one input to this call that comes off the wire, and a card is
   * what gets posted to it. If a response could point it anywhere, that is card exfiltration
   * rather than a misrouted request — so an untrusted URL must produce no request at all.
   */
  describe('untrusted tokenization URL', () => {
    it.each([
      ['plain http', 'http://api.moyasar.com/v1/tokens'],
      ['another origin', 'https://evil.test/v1/tokens'],
      ['a look-alike host', 'https://api.moyasar.com.evil.test/v1/tokens'],
      ['userinfo hiding the real host', 'https://api.moyasar.com@evil.test/v1/tokens'],
      ['an explicit off-API port', 'https://api.moyasar.com:8443/v1/tokens'],
      ['a relative path', '/v1/tokens'],
      ['empty', ''],
    ])('sends nothing when the URL is %s', async (_label, tokenizationUrl) => {
      const tokenized = firstValueFrom(service.tokenize({ ...CONFIGURATION, tokenizationUrl }, CARD));

      await expect(tokenized).rejects.toEqual({
        reason: 'misconfigured',
      } satisfies TokenizationFailure);
      backend.expectNone(() => true);
    });

    it('still posts to the provider URL exactly as issued', () => {
      const tokenizationUrl = 'https://api.moyasar.com/v1/tokens?locale=ar';

      service.tokenize({ ...CONFIGURATION, tokenizationUrl }, CARD).subscribe();

      backend.expectOne(tokenizationUrl).flush({ id: 'token_1' });
    });
  });
});

