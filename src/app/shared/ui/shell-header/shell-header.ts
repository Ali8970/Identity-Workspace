import { Component, computed, inject, input, output, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MyCompanyDto } from '../../../models/auth.model';
import { ThemeService } from '../../../core/theme/theme.service';

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
        <!--
          Switching company changes every permission and every row on screen, so
          this is the highest-consequence control in the app. It used to be a bare
          <select> styled like an input. It now names the company, shows your
          standing in it, and marks the current one explicitly.
        -->
        <div class="shell-tenant">
          @if (tenantMenuOpen()) {
            <button
              type="button"
              class="shell-tenant__backdrop"
              [attr.aria-label]="'shell.closeCompanyMenu' | translate"
              (click)="closeTenantMenu()"
            ></button>
          }

          <button
            type="button"
            class="shell-tenant__btn"
            [disabled]="switching() || companies().length === 0"
            [attr.aria-busy]="switching()"
            [attr.aria-expanded]="tenantMenuOpen()"
            [attr.aria-label]="'shell.companyMenu' | translate"
            aria-haspopup="menu"
            (click)="toggleTenantMenu()"
          >
            @if (switching()) {
              <span class="ui-spinner" aria-hidden="true"></span>
            } @else {
              <span class="shell-tenant__mark" aria-hidden="true">{{ tenantInitial() }}</span>
            }
            <span class="shell-tenant__text">
              <span class="shell-tenant__name">{{ tenantName() }}</span>
              <span class="shell-tenant__role">{{ currentStanding() | translate }}</span>
            </span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m5 9 7 7 7-7" />
            </svg>
          </button>

          @if (tenantMenuOpen()) {
            <div class="shell-tenant__menu" role="menu">
              <!-- A filter only earns its place once scanning stops being instant. -->
              @if (companies().length > 7) {
                <div class="shell-tenant__search">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                    <circle cx="11" cy="11" r="6.5" />
                    <path d="m16 16 4.5 4.5" />
                  </svg>
                  <input
                    type="search"
                    [value]="tenantSearch()"
                    (input)="tenantSearch.set($any($event.target).value)"
                    [placeholder]="'shell.findCompany' | translate"
                    [attr.aria-label]="'shell.findCompany' | translate"
                  />
                </div>
              }

              <div class="shell-tenant__list">
                @for (company of filteredCompanies(); track company.tenantMembershipId) {
                  <button
                    type="button"
                    role="menuitemradio"
                    class="shell-tenant__row"
                    [class.shell-tenant__row--current]="isCurrent(company)"
                    [attr.aria-checked]="isCurrent(company)"
                    [disabled]="!company.isSelectable || switching()"
                    (click)="chooseCompany(company)"
                  >
                    <span class="shell-tenant__mark" aria-hidden="true">
                      {{ initialFor(company) }}
                    </span>
                    <span class="shell-tenant__row-body">
                      <span class="shell-tenant__row-name">{{ companyLabel(company) }}</span>
                      <span class="shell-tenant__row-meta">{{ companyMeta(company) }}</span>
                    </span>
                    @if (isCurrent(company)) {
                      <svg class="shell-tenant__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="m5 12.5 4.5 4.5L19 7" />
                      </svg>
                    }
                  </button>
                } @empty {
                  <p class="shell-tenant__empty">{{ 'shell.noCompanyMatch' | translate }}</p>
                }
              </div>
            </div>
          }
        </div>

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

        <button
          type="button"
          class="shell-header__icon-btn"
          (click)="theme.toggle()"
          [attr.aria-label]="(isDark() ? 'shell.themeLight' : 'shell.themeDark') | translate"
        >
          @if (isDark()) {
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
            </svg>
          } @else {
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
            </svg>
          }
        </button>

        <div class="shell-header__user" [attr.title]="userEmail()">
          <span class="shell-header__avatar" aria-hidden="true">{{ userInitial() }}</span>
          <span class="shell-header__user-name">{{ userName() }}</span>
        </div>

        <button
          type="button"
          class="shell-header__icon-btn shell-header__icon-btn--danger"
          (click)="logout.emit()"
          [disabled]="loggingOut()"
          [attr.aria-busy]="loggingOut()"
          [attr.aria-label]="(loggingOut() ? 'shell.signingOut' : 'shell.logout') | translate"
        >
          @if (loggingOut()) {
            <span class="ui-spinner ui-spinner--current" aria-hidden="true"></span>
          } @else {
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
              <path d="M10 17l-1 1H5a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1h4l1 1" />
              <path d="M14 12H8M18 8l3 4-3 4" />
            </svg>
          }
        </button>
      </div>
    </header>
  `,
})
export class ShellHeader {
  /**
   * Injected rather than threaded through `ShellLayout` like the language is.
   * The theme has no session coupling — nothing above this component needs to
   * react to it — so an input/output pair would be plumbing for its own sake.
   */
  protected readonly theme = inject(ThemeService);
  private readonly translate = inject(TranslateService);

  protected readonly isDark = computed(() => this.theme.resolved() === 'dark');

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

  /*
   * The old native <select> needed an afterRenderEffect to re-assert the session's
   * company after every render: a <select> keeps whatever the user picked even when
   * the switch failed, and self-selects its first option when rendered with nothing
   * selected. A menu renders the current company from state instead of holding its
   * own, so a failed switch simply leaves the menu showing the truth. That whole
   * synchronisation problem is gone.
   */
  protected readonly tenantMenuOpen = signal(false);
  protected readonly tenantSearch = signal('');

  protected readonly filteredCompanies = computed(() => {
    const term = this.tenantSearch().trim().toLowerCase();
    const all = this.companies();
    if (!term) {
      return all;
    }
    return all.filter((company) =>
      [company.companyNameEn, company.companyNameAr, company.code].some((value) =>
        (value ?? '').toLowerCase().includes(term),
      ),
    );
  });

  private readonly currentCompany = computed(() =>
    this.companies().find((company) => company.tenantMembershipId === this.currentMembershipId()),
  );

  /** Your standing in the current company — the field people actually navigate by. */
  protected readonly currentStanding = computed(() => {
    const company = this.currentCompany();
    if (company?.isOwner) {
      return 'shell.roleOwner';
    }
    return 'shell.roleMember';
  });

  protected readonly tenantInitial = computed(() => {
    const company = this.currentCompany();
    return company ? this.initialFor(company) : (this.tenantName().trim().charAt(0) || '?');
  });

  protected readonly sidebarExpanded = computed(
    () => this.mobileNavOpen() || !this.sidebarCollapsed(),
  );

  protected readonly sidebarToggleLabelKey = computed(() =>
    this.sidebarExpanded() ? 'shell.closeSidebar' : 'shell.openSidebar',
  );

  private readonly duplicateNameKeys = computed(() => {
    const counts = new Map<string, number>();
    for (const company of this.companies()) {
      const key = this.nameKey(company);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([key]) => key));
  });

  protected companyLabel(company: MyCompanyDto): string {
    const name =
      this.currentLanguage() === 'ar'
        ? company.companyNameAr || company.companyNameEn
        : company.companyNameEn || company.companyNameAr;
    if (company.code && this.duplicateNameKeys().has(this.nameKey(company))) {
      return `${name} (${company.code})`;
    }
    return name;
  }

  protected isCurrent(company: MyCompanyDto): boolean {
    return company.tenantMembershipId === this.currentMembershipId();
  }

  protected initialFor(company: MyCompanyDto): string {
    const name =
      this.currentLanguage() === 'ar'
        ? company.companyNameAr || company.companyNameEn
        : company.companyNameEn || company.companyNameAr;
    return name.trim().charAt(0).toUpperCase() || company.code.charAt(0).toUpperCase() || '?';
  }

  /**
   * The secondary line on each row. Ownership outranks a job title — it is what
   * decides whether you can do anything in that company — and an unavailable
   * company says so instead of looking identical to a usable one.
   */
  protected companyMeta(company: MyCompanyDto): string {
    // Read the language input so a switch re-runs this from the template —
    // `translate.instant` is not reactive on its own.
    this.currentLanguage();
    if (!company.isSelectable) {
      return this.translate.instant('shell.companyUnavailable');
    }
    if (company.isOwner) {
      return this.translate.instant('shell.roleOwner');
    }
    return company.jobTitle?.trim() || this.translate.instant('shell.roleMember');
  }

  protected toggleTenantMenu(): void {
    const next = !this.tenantMenuOpen();
    this.tenantMenuOpen.set(next);
    if (!next) {
      this.tenantSearch.set('');
    }
  }

  protected closeTenantMenu(): void {
    this.tenantMenuOpen.set(false);
    this.tenantSearch.set('');
  }

  protected chooseCompany(company: MyCompanyDto): void {
    this.closeTenantMenu();
    if (company.isSelectable && !this.isCurrent(company)) {
      this.switchCompany.emit(company.tenantMembershipId);
    }
  }

  protected setLanguage(lang: 'en' | 'ar'): void {
    if (lang !== this.currentLanguage()) {
      this.languageChange.emit(lang);
    }
  }

  private nameKey(company: MyCompanyDto): string {
    return `${company.companyNameEn}\0${company.companyNameAr}`.toLowerCase();
  }
}
