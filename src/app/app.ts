import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { filter } from 'rxjs';
import { OnboardedNotice, PAYMENT_SUCCEEDED_TOAST } from './core/auth/onboarded-notice';
import { LoadingBar } from './shared/ui/loading-bar/loading-bar';
import { ToastHost } from './shared/ui/toast/toast-host';
import { ToastService } from './shared/ui/toast/toast.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TranslatePipe, LoadingBar, ToastHost],
  template: `
    <a class="app-skip-link" href="#main-content">{{ 'ui.skipToContent' | translate }}</a>
    <app-loading-bar />
    <router-outlet />
    <app-toast-host />
  `,
})
export class App {
  constructor() {
    const notice = inject(OnboardedNotice);
    const toasts = inject(ToastService);
    const router = inject(Router);

    // A completed purchase ends the session that paid. Wherever that lands the owner — login,
    // `/session-expired`, a page reached after a full reload — the first page outside the
    // wizard says the payment worked. The result screens are skipped: they already celebrate.
    //
    // The notice is cleared only once the toast has been seen out, so a reload mid-toast shows
    // it again rather than losing it; `ToastService` drops a duplicate while one is on screen.
    router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        filter((event) => !event.urlAfterRedirects.startsWith('/onboarding/')),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        const url = router.parseUrl(event.urlAfterRedirects);
        const handedOff = event.urlAfterRedirects.startsWith('/login') && url.queryParams['onboarded'] === '1';
        if (handedOff || notice.pending()) {
          toasts.show({ ...PAYMENT_SUCCEEDED_TOAST, onClose: () => notice.clear() });
        }
      });
  }
}
