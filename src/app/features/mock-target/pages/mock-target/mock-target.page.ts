import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

@Component({
  selector: 'app-mock-target-page',
  imports: [TranslatePipe, RouterLink],
  template: `
    <div class="auth-shell">
      <div class="auth-shell__panel ui-card">
        <h1 class="auth-shell__brand"><span>Brooch</span> {{ appLabel() }}</h1>
        <p class="auth-shell__lead">{{ 'mockTarget.body' | translate }}</p>
        <p class="ui-alert ui-alert--info" role="status">
          {{ 'mockTarget.app' | translate }}: <strong>{{ appKey() }}</strong>
        </p>
        <a routerLink="/applications" class="ui-btn ui-btn--primary">{{
          'mockTarget.back' | translate
        }}</a>
      </div>
    </div>
  `,
})
export class MockTargetPage {
  private readonly route = inject(ActivatedRoute);
  protected readonly appKey = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('app') ?? 'app')),
    { initialValue: 'app' },
  );

  protected appLabel(): string {
    const key = this.appKey();
    return key === 'crm' ? 'CRM' : key === 'hr' ? 'HR' : key.toUpperCase();
  }
}
