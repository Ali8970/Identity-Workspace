import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-denied-page',
  imports: [TranslatePipe, RouterLink],
  template: `
    <div class="auth-shell">
      <div class="auth-shell__panel ui-card">
        <h1>{{ 'auth.denied.title' | translate }}</h1>
        <p>{{ 'auth.denied.body' | translate }}</p>
        <a routerLink="/" class="ui-btn ui-btn--primary">{{ 'shell.applications' | translate }}</a>
      </div>
    </div>
  `,
})
export class DeniedPage {}
