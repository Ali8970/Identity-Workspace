import { Service, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { SessionStore } from '../../../core/auth/session.store';
import { isNavigableRedirect } from '../../../core/error/error.model';
import { CheckoutStore } from './checkout.store';

/** The two fields every completion-bearing response carries. */
export interface CompletionOutcome {
  requiresReauthentication: boolean;
  completionUrl?: string | null;
}

/**
 * What happens once a purchase reaches `Completed`.
 *
 * Activation provisions owner roles in every application the package includes and then evicts
 * the owner's permission cache — so the session in this tab predates its own entitlements.
 * Sitting on it produces a half-working app where CRM is granted but invisible, which is why
 * the backend answers `requiresReauthentication: true`.
 *
 * The sign-out is therefore part of the success path, not a failure. Callers must say so on
 * screen before calling this: an unexplained logout right after paying reads as a payment
 * problem.
 */
@Service()
export class OnboardingCompletion {
  private readonly session = inject(SessionStore);
  private readonly checkout = inject(CheckoutStore);
  private readonly router = inject(Router);

  private settled = false;

  /**
   * Ends the onboarding session and lands the owner back on sign-in. Runs at most once, so a
   * double-clicked "Continue" cannot fire two logouts.
   *
   * `completionUrl` comes from the backend and is the only redirect target trusted here; it is
   * absolute, so it needs a full-page navigation rather than the router. Anything else falls
   * back to the local login route.
   */
  finish(outcome: CompletionOutcome): void {
    if (this.settled) {
      return;
    }
    this.settled = true;

    // Guards read this before the next /me lands, so Back into the wizard bounces out.
    this.session.markOnboardingComplete();
    this.checkout.clear();

    if (!outcome.requiresReauthentication) {
      // The session survives, but the tenant it describes has just changed status. A full load
      // re-bootstraps /me rather than entering the shell on a stale payload. `replace`, not
      // `assign`: the wizard must not stay on the history stack.
      window.location.replace('/applications?onboarded=1');
      return;
    }

    // A failed logout must not strand the payer on a success screen — the redirect happens
    // either way, and the stale session is dropped locally regardless.
    this.session
      .logout()
      .pipe(
        catchError(() => {
          this.session.markAnonymous();
          return of(undefined);
        }),
        finalize(() => this.goToSignIn(outcome.completionUrl ?? null)),
      )
      .subscribe();
  }

  private goToSignIn(completionUrl: string | null): void {
    if (isNavigableRedirect(completionUrl)) {
      window.location.assign(completionUrl);
      return;
    }
    void this.router.navigate(['/login'], {
      queryParams: { onboarded: '1' },
      replaceUrl: true,
    });
  }
}
