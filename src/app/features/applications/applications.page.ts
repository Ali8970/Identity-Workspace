import { Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { SessionStore } from '../../core/auth/session.store';
import { SsoHandshakeService } from '../../core/auth/sso-handshake.service';
import { LanguageService } from '../../core/i18n/language.service';
import { isNavigableRedirect } from '../../core/error/brooch-error.model';

@Component({
  selector: 'app-applications-page',
  imports: [TranslatePipe],
  template: `
    <h1 class="page-title" id="main-content-header" tabindex="-1">
      {{ 'applications.title' | translate }}
    </h1>
    <p class="page-lead">{{ 'applications.subtitle' | translate }}</p>
    <div class="app-grid">
      @for (app of apps(); track app.key) {
        <article class="app-card">
          <h2>{{ label(app.nameAr, app.nameEn) }}</h2>
          <p class="app-card__key">{{ app.key }}</p>
          @if (app.isCurrent) {
            <span class="app-card__badge">{{ 'applications.current' | translate }}</span>
          } @else if (canLaunch(app.baseUrl)) {
            <button type="button" class="ui-btn ui-btn--primary" (click)="open(app.baseUrl)">
              {{ 'applications.open' | translate }}
            </button>
          }
        </article>
      }
    </div>
  `,
})
export class ApplicationsPage {
  private readonly session = inject(SessionStore);
  private readonly sso = inject(SsoHandshakeService);
  private readonly language = inject(LanguageService);

  protected readonly apps = computed(
    () => this.session.current()?.availableApplications ?? [],
  );

  protected label(ar: string, en: string): string {
    return this.language.current() === 'ar' ? ar || en : en || ar;
  }

  protected canLaunch(baseUrl: string): boolean {
    return isNavigableRedirect(baseUrl);
  }

  protected open(baseUrl: string): void {
    if (isNavigableRedirect(baseUrl)) {
      this.sso.navigate(baseUrl);
    }
  }
}
