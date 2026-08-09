import { HttpBackend, HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { PaymentConfiguration } from '../../models/subscription.model';

/** Card details exactly as the payer typed them. Never leaves the HTTP call below. */
export interface CardDetails {
  name: string;
  number: string;
  month: string;
  year: string;
  cvc: string;
}

/** Deliberately narrow: the token plus display-safe metadata, nothing reconstructible. */
export interface TokenizedCard {
  token: string;
  brand: string | null;
  lastFour: string | null;
}

export type TokenizationFailureReason = 'declined' | 'network' | 'misconfigured';

export interface TokenizationFailure {
  reason: TokenizationFailureReason;
}

/** Only the fields we read; the provider returns more. */
interface MoyasarTokenResponse {
  id?: string;
  brand?: string;
  company?: string;
  last_four?: string;
}

/**
 * The only place in this SPA that touches raw card data — and it sends it straight to the
 * payment provider, never to a Brooch origin.
 *
 * Three things make that boundary real rather than aspirational:
 *
 *  1. **A bare `HttpBackend`, not the app's `HttpClient`.** Every Brooch interceptor is
 *     bypassed: no session cookie, no CSRF token, no `X-Brooch-Application`, and — critically
 *     — no `errorInterceptor`, so a provider failure can never reach the global error pipeline
 *     carrying the request body that produced it.
 *  2. **`withCredentials` is never set.** This is a cross-origin call to a third party;
 *     sending Brooch's session cookie there would be a leak in the other direction.
 *  3. **Nothing comes back but the token and safe metadata.** A caller cannot forward card
 *     fields onward because it never receives them.
 *
 * The configuration is per purchase and comes from `POST /subscriptions` — never hardcoded and
 * never read from the environment file, so a key rotation needs no redeploy.
 */
@Service()
export class MoyasarTokenizationService {
  private readonly direct = new HttpClient(inject(HttpBackend));

  tokenize(configuration: PaymentConfiguration, card: CardDetails): Observable<TokenizedCard> {
    if (configuration.publishableKey === '' || configuration.tokenizationUrl === '') {
      return throwError((): TokenizationFailure => ({ reason: 'misconfigured' }));
    }

    const body = {
      publishable_api_key: configuration.publishableKey,
      name: card.name.trim(),
      number: card.number.replace(/\s+/g, ''),
      month: card.month.trim(),
      year: card.year.trim(),
      cvc: card.cvc.trim(),
      // `save_only` is what makes the token chargeable server-side. Without it the provider
      // mints a token the BROWSER must consume immediately, and the backend charge in
      // POST …/pay is rejected — while tokenization itself still looks successful. No
      // `callback_url` either: the backend builds the 3DS callback and refuses one from here.
      save_only: true,
    };

    return this.direct
      .post<MoyasarTokenResponse>(configuration.tokenizationUrl, body, {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      })
      .pipe(
        map((response) => {
          if (!response.id) {
            throw { reason: 'declined' } satisfies TokenizationFailure;
          }
          return {
            token: response.id,
            brand: response.brand ?? response.company ?? null,
            lastFour: response.last_four ?? null,
          };
        }),
        // The provider's own message is dropped on purpose: it can echo submitted field
        // values, and the copy shown to the payer is fixed anyway.
        catchError((error: unknown) =>
          throwError((): TokenizationFailure => ({ reason: classify(error) })),
        ),
      );
  }
}

function classify(error: unknown): TokenizationFailureReason {
  if (isTokenizationFailure(error)) {
    return error.reason;
  }
  if (error instanceof HttpErrorResponse) {
    return error.status === 0 ? 'network' : 'declined';
  }
  return 'network';
}

function isTokenizationFailure(error: unknown): error is TokenizationFailure {
  return (
    typeof error === 'object' &&
    error !== null &&
    'reason' in error &&
    typeof (error as { reason: unknown }).reason === 'string'
  );
}

/** Narrows an unknown rejection to a reason so callers can pick fixed, translated copy. */
export function tokenizationFailureReason(error: unknown): TokenizationFailureReason {
  return classify(error);
}
