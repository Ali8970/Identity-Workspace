import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-session-expired-page',
  imports: [TranslatePipe, RouterLink],
  template: `
    <div class="auth-shell">
      <div class="auth-shell__panel ui-card">
        <h1 class="auth-shell__brand"><span>Brooch</span> Identity</h1>
        <div class="ui-alert ui-alert--warning" role="alert">
          {{ 'auth.sessionExpired.body' | translate }}
        </div>
        <a class="ui-btn ui-btn--primary ui-btn--block" [routerLink]="['/login']" [queryParams]="loginParams">
          {{ 'auth.sessionExpired.signIn' | translate }}
        </a>
      </div>
    </div>
  `,
})
export class SessionExpiredPage {
  protected readonly loginParams = (() => {
    const params = new URLSearchParams(window.location.search);
    const returnUrl = params.get('returnUrl');
    return returnUrl ? { returnUrl } : {};
  })();
}
