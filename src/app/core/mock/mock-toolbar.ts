import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import {
  InMemoryIdentityStore,
  MOCK_JOURNEY_SCENARIOS,
} from '../../core/mock/in-memory-identity.store';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-mock-toolbar',
  imports: [TranslatePipe],
  template: `
    @if (enabled) {
      <aside class="mock-toolbar" aria-label="Mock API toolbar">
        <h3>{{ 'mock.title' | translate }}</h3>
        <p class="mock-toolbar__hint">{{ 'mock.hint' | translate }}</p>
        <label for="scenario">{{ 'mock.scenario' | translate }}</label>
        <select
          id="scenario"
          [value]="selected()"
          (change)="selected.set($any($event.target).value)"
        >
          @for (s of scenarios; track s) {
            <option [value]="s">{{ s }}</option>
          }
        </select>
        <button
          type="button"
          class="ui-btn ui-btn--primary"
          style="margin-top:0.5rem; width:100%"
          (click)="apply()"
        >
          {{ 'mock.apply' | translate }}
        </button>
        <button
          type="button"
          class="ui-btn ui-btn--ghost"
          style="margin-top:0.35rem; width:100%"
          (click)="createIntent('crm')"
        >
          {{ 'mock.createIntent' | translate }}
        </button>
        <div class="mock-mail">
          <strong>{{ 'mock.mailbox' | translate }}</strong>
          @for (mail of store.mailboxItems(); track mail.id) {
            <article>
              <div>
                <b>{{ mail.to }}</b> — {{ mail.subject }}
              </div>
              <div class="mock-mail__body">{{ mail.body }}</div>
              @if (mail.code) {
                <div>code: <code>{{ mail.code }}</code></div>
              }
              @if (mail.token) {
                <div>token: <code>{{ mail.token }}</code></div>
              }
              @if (mail.link) {
                <button type="button" class="linkish" (click)="openMailLink(mail.link!)">
                  {{ 'mock.openLink' | translate }}
                </button>
              }
            </article>
          }
        </div>
      </aside>
    }
  `,
  styles: `
    .linkish {
      appearance: none;
      border: 0;
      background: none;
      padding: 0;
      color: var(--primary);
      text-decoration: underline;
      cursor: pointer;
      font: inherit;
      text-align: start;
    }
  `,
})
export class MockToolbar {
  protected readonly enabled = environment.showMockToolbar && environment.useMockApi;
  protected readonly store = inject(InMemoryIdentityStore);
  private readonly router = inject(Router);
  protected readonly scenarios = MOCK_JOURNEY_SCENARIOS;
  protected readonly selected = signal<string>(this.store.activeScenario());

  protected apply(): void {
    this.store.resetAndSeed(this.selected());
    void this.router.navigateByUrl('/login');
  }

  protected createIntent(appKey: string): void {
    const intent = this.store.createIntentForApp(appKey);
    this.store.pushMail({
      to: 'owner@brooch.sa',
      subject: `Login intent (${appKey})`,
      body: `Open /login?intentId=${intent.id}`,
      link: `/login?intentId=${intent.id}`,
    });
  }

  protected openMailLink(link: string): void {
    void this.router.navigateByUrl(link);
  }
}
