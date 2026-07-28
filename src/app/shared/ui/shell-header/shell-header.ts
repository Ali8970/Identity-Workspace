import { Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MyCompanyDto } from '../../../models/auth.model';

@Component({
  selector: 'app-shell-header',
  imports: [TranslatePipe],
  template: `
    <header class="shell-header">
      <div class="shell-header__start">
        <button
          type="button"
          class="shell-header__icon-btn"
          (click)="toggleSidebar.emit()"
          [attr.aria-expanded]="sidebarExpanded()"
          [attr.aria-label]="sidebarToggleLabelKey() | translate"
        >
          @if (sidebarCollapsed() && !mobileNavOpen()) {
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          } @else {
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
              <path d="M6 6 18 18M18 6 6 18" />
            </svg>
          }
        </button>

        <div class="shell-header__context">
          <p class="shell-header__eyebrow">{{ 'shell.workspace' | translate }}</p>
          <h1 class="shell-header__title">{{ tenantName() }}</h1>
        </div>
      </div>

      <div class="shell-header__actions">
        <label class="shell-header__company">
          <span class="visually-hidden">{{ 'shell.switchCompany' | translate }}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
            <path d="M4 21V8l8-4 8 4v13" />
            <path d="M9 21V12h6v9" />
          </svg>
          <select
            [value]="currentMembershipId()"
            (change)="switchCompany.emit($any($event.target).value)"
            [disabled]="switching() || companies().length < 2"
          >
            @for (company of companies(); track company.tenantMembershipId) {
              <option [value]="company.tenantMembershipId" [disabled]="!company.isSelectable">
                {{ companyLabel(company.companyNameAr, company.companyNameEn) }}
              </option>
            }
          </select>
        </label>

        <div class="shell-header__lang" role="group" [attr.aria-label]="'shell.language' | translate">
          <button
            type="button"
            class="shell-header__lang-btn"
            [class.shell-header__lang-btn--active]="currentLanguage() === 'en'"
            (click)="setLanguage('en')"
          >
            EN
          </button>
          <button
            type="button"
            class="shell-header__lang-btn"
            [class.shell-header__lang-btn--active]="currentLanguage() === 'ar'"
            (click)="setLanguage('ar')"
          >
            AR
          </button>
        </div>

        <div class="shell-header__user" [attr.title]="userEmail()">
          <span class="shell-header__avatar" aria-hidden="true">{{ userInitial() }}</span>
          <span class="shell-header__user-name">{{ userName() }}</span>
        </div>

        <button
          type="button"
          class="shell-header__icon-btn shell-header__icon-btn--danger"
          (click)="logout.emit()"
          [disabled]="loggingOut()"
          [attr.aria-label]="'shell.logout' | translate"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
            <path d="M10 17l-1 1H5a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1h4l1 1" />
            <path d="M14 12H8M18 8l3 4-3 4" />
          </svg>
        </button>
      </div>
    </header>
  `,
})
export class ShellHeader {
  readonly sidebarCollapsed = input(false);
  readonly mobileNavOpen = input(false);
  readonly companies = input.required<MyCompanyDto[]>();
  readonly currentMembershipId = input('');
  readonly tenantName = input('');
  readonly userName = input('');
  readonly userEmail = input('');
  readonly userInitial = input('?');
  readonly currentLanguage = input<'en' | 'ar'>('en');
  readonly switching = input(false);
  readonly loggingOut = input(false);

  readonly toggleSidebar = output<void>();
  readonly switchCompany = output<string>();
  readonly languageChange = output<'en' | 'ar'>();
  readonly logout = output<void>();

  protected readonly sidebarExpanded = computed(
    () => this.mobileNavOpen() || !this.sidebarCollapsed(),
  );

  protected readonly sidebarToggleLabelKey = computed(() =>
    this.sidebarExpanded() ? 'shell.closeSidebar' : 'shell.openSidebar',
  );

  protected companyLabel(ar: string, en: string): string {
    return this.currentLanguage() === 'ar' ? ar || en : en || ar;
  }

  protected setLanguage(lang: 'en' | 'ar'): void {
    if (lang !== this.currentLanguage()) {
      this.languageChange.emit(lang);
    }
  }
}
