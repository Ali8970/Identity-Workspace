import { Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MyCompanyDto } from '../../../models/auth.model';
import { LanguageService } from '../../../core/i18n/language.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-shell-header',
  imports: [TranslatePipe, ConfirmDialog, RouterLink],
  template: `
    <header
      class="sticky top-0 z-20 flex h-[52px] items-center gap-3 border-b-[1.468px] border-border-button bg-surface px-4 md:px-6"
    >
      <button
        type="button"
        class="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border-[1.468px] border-border-button bg-surface-muted text-text-muted md:hidden"
        [attr.aria-label]="'shell.openSidebar' | translate"
        (click)="menu.emit()"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M2 4h12M2 8h12M2 12h12"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </button>

      <button
        type="button"
        class="hidden size-9 cursor-pointer items-center justify-center rounded-lg border-[1.468px] border-border-button bg-surface-muted text-text-muted hover:bg-surface-hover md:inline-flex"
        [attr.aria-expanded]="!desktopSidebarCollapsed()"
        aria-controls="app-main-sidebar"
        [attr.aria-label]="
          (desktopSidebarCollapsed() ? 'shell.openSidebar' : 'shell.closeSidebar') | translate
        "
        (click)="toggleDesktopSidebar.emit()"
      >
        @if (desktopSidebarCollapsed()) {
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M2 4h12M2 8h12M2 12h12"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        } @else if (currentLanguage() === 'ar') {
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M5 3.5 9.5 8 5 12.5M10.5 3.5 15 8l-4.5 4.5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        } @else {
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M11 3.5 6.5 8 11 12.5M5.5 3.5 1 8l4.5 4.5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        }
      </button>

      <div class="ms-auto flex items-center gap-2">
        <!-- Account-only: company switcher (tenant context is this app's job). -->
        <div class="relative">
          @if (tenantMenuOpen()) {
            <button
              type="button"
              class="fixed inset-0 z-10 cursor-default border-0 bg-transparent"
              [attr.aria-label]="'shell.closeCompanyMenu' | translate"
              (click)="closeTenantMenu()"
            ></button>
          }

          <button
            type="button"
            class="relative z-20 inline-flex max-w-[14rem] cursor-pointer items-center gap-2 rounded-lg border-[1.468px] border-border-button bg-surface-muted px-2 py-1.5 text-start text-[13px] font-semibold text-text hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
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
              <span
                class="grid size-7 shrink-0 place-items-center rounded-xl text-[11px] font-bold text-white"
                style="background: var(--primary-gradient)"
                aria-hidden="true"
              >
                {{ tenantInitial() }}
              </span>
            }
            <span class="min-w-0 flex-1">
              <span class="block truncate leading-tight">{{ tenantName() }}</span>
              <span class="block truncate text-[11px] font-medium text-text-muted">
                {{ currentStanding() | translate }}
              </span>
            </span>
            <svg
              class="size-3.5 shrink-0 text-text-muted"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path d="m5 9 7 7 7-7" />
            </svg>
          </button>

          @if (tenantMenuOpen()) {
            <div
              class="absolute end-0 z-30 mt-2 w-72 overflow-hidden rounded-lg border-[1.468px] border-border-button bg-surface shadow-[var(--shadow-card)]"
              role="menu"
            >
              @if (companies().length > 7) {
                <div class="border-b-[1.468px] border-border-subtle px-3 py-2">
                  <input
                    type="search"
                    class="field-control"
                    [value]="tenantSearch()"
                    (input)="tenantSearch.set($any($event.target).value)"
                    [placeholder]="'shell.findCompany' | translate"
                    [attr.aria-label]="'shell.findCompany' | translate"
                  />
                </div>
              }
              <div class="max-h-72 overflow-y-auto py-1">
                @for (company of filteredCompanies(); track company.tenantMembershipId) {
                  <button
                    type="button"
                    role="menuitemradio"
                    class="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-start text-[13px] hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                    [class.bg-primary-light]="isCurrent(company)"
                    [attr.aria-checked]="isCurrent(company)"
                    [disabled]="!company.isSelectable || switching()"
                    (click)="chooseCompany(company)"
                  >
                    <span
                      class="grid size-8 shrink-0 place-items-center rounded-2xl text-xs font-bold text-white"
                      style="background: var(--primary-gradient)"
                      aria-hidden="true"
                    >
                      {{ initialFor(company) }}
                    </span>
                    <span class="min-w-0 flex-1">
                      <span class="block truncate font-semibold text-text">
                        {{ companyLabel(company) }}
                      </span>
                      <span class="block truncate text-[11px] text-text-muted">
                        {{ companyMeta(company) }}
                      </span>
                    </span>
                    @if (isCurrent(company)) {
                      <svg
                        class="size-4 shrink-0 text-info"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.25"
                        aria-hidden="true"
                      >
                        <path d="m5 12.5 4.5 4.5L19 7" />
                      </svg>
                    }
                  </button>
                } @empty {
                  <p class="px-3 py-4 text-[13px] text-text-muted">
                    {{ 'shell.noCompanyMatch' | translate }}
                  </p>
                }
              </div>
            </div>
          }
        </div>

        <button
          type="button"
          class="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border-[1.468px] border-border-button bg-surface-muted text-text-muted hover:bg-surface-hover"
          [attr.aria-pressed]="isDark()"
          [attr.aria-label]="(isDark() ? 'shell.themeLight' : 'shell.themeDark') | translate"
          (click)="theme.toggle()"
        >
          @if (isDark()) {
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.9"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="4" />
              <path
                d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"
              />
            </svg>
          } @else {
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.9"
              aria-hidden="true"
            >
              <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
            </svg>
          }
        </button>

        <button
          type="button"
          class="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-[1.468px] border-border-button bg-surface-muted px-2.5 text-xs font-semibold text-text hover:bg-surface-hover"
          [attr.aria-label]="'shell.language' | translate"
          (click)="toggleLanguage()"
        >
          {{ currentLanguage() === 'en' ? 'EN' : 'عربي' }}
        </button>

        <div class="relative">
          <button
            type="button"
            class="inline-flex cursor-pointer items-center gap-2 rounded-lg border-0 bg-transparent px-1 py-1 text-[13px] font-semibold text-text hover:bg-surface-muted"
            [attr.aria-expanded]="userMenuOpen()"
            [attr.aria-label]="'shell.userMenu' | translate"
            (click)="userMenuOpen.update((open) => !open)"
          >
            <span
              class="grid size-8 place-items-center rounded-2xl text-xs font-bold text-white"
              style="background: var(--primary-gradient)"
              aria-hidden="true"
            >
              {{ userInitial() }}
            </span>
            <span class="hidden max-w-[8rem] truncate sm:inline">{{ userName() }}</span>
          </button>
          @if (userMenuOpen()) {
            <button
              type="button"
              class="fixed inset-0 z-10 cursor-default border-0 bg-transparent"
              [attr.aria-label]="'common.close' | translate"
              (click)="userMenuOpen.set(false)"
            ></button>
            <div
              class="absolute end-0 z-20 mt-2 w-44 overflow-hidden rounded-lg border-[1.468px] border-border-button bg-surface shadow-[var(--shadow-card)]"
              role="menu"
            >
              <a
                routerLink="/account"
                class="flex w-full cursor-pointer items-center px-4 py-3 text-start text-sm text-text no-underline hover:bg-surface-muted"
                role="menuitem"
                (click)="userMenuOpen.set(false)"
              >
                {{ 'shell.account' | translate }}
              </a>
              <button
                type="button"
                class="flex w-full cursor-pointer items-center px-4 py-3 text-start text-sm hover:bg-surface-muted"
                role="menuitem"
                (click)="askSignOut()"
              >
                {{ 'shell.logout' | translate }}
              </button>
            </div>
          }
        </div>
      </div>
    </header>

    @if (confirmingSignOut()) {
      <app-confirm-dialog
        title="shell.logout"
        body="shell.signOutConfirm"
        confirmLabel="common.confirm"
        cancelLabel="common.cancel"
        busyLabel="shell.signingOut"
        [destructive]="true"
        [busy]="loggingOut()"
        (confirmed)="confirmSignOut()"
        (cancelled)="cancelSignOut()"
      />
    }
  `,
})
export class ShellHeader {
  protected readonly theme = inject(ThemeService);
  private readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);

  protected readonly isDark = computed(() => this.theme.resolved() === 'dark');

  readonly desktopSidebarCollapsed = input(false);
  readonly companies = input.required<MyCompanyDto[]>();
  readonly currentMembershipId = input('');
  readonly tenantName = input('');
  readonly userName = input('');
  readonly userEmail = input('');
  readonly userInitial = input('?');
  readonly currentLanguage = input<'en' | 'ar'>('en');
  readonly switching = input(false);
  readonly loggingOut = input(false);

  readonly menu = output<void>();
  readonly toggleDesktopSidebar = output<void>();
  readonly switchCompany = output<string>();
  readonly languageChange = output<'en' | 'ar'>();
  readonly logout = output<void>();

  protected readonly tenantMenuOpen = signal(false);
  protected readonly tenantSearch = signal('');
  protected readonly userMenuOpen = signal(false);
  protected readonly confirmingSignOut = signal(false);

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

  protected readonly currentStanding = computed(() => {
    const company = this.currentCompany();
    if (company?.isOwner) {
      return 'shell.roleOwner';
    }
    return 'shell.roleMember';
  });

  protected readonly tenantInitial = computed(() => {
    const company = this.currentCompany();
    return company ? this.initialFor(company) : this.tenantName().trim().charAt(0) || '?';
  });

  private readonly duplicateNameKeys = computed(() => {
    const counts = new Map<string, number>();
    for (const company of this.companies()) {
      const key = this.companyLabel(company).toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key));
  });

  protected toggleLanguage(): void {
    this.languageChange.emit(this.currentLanguage() === 'en' ? 'ar' : 'en');
  }

  protected toggleTenantMenu(): void {
    this.tenantMenuOpen.update((open) => !open);
    if (!this.tenantMenuOpen()) {
      this.tenantSearch.set('');
    }
  }

  protected closeTenantMenu(): void {
    this.tenantMenuOpen.set(false);
    this.tenantSearch.set('');
  }

  protected chooseCompany(company: MyCompanyDto): void {
    if (!company.isSelectable || this.isCurrent(company)) {
      this.closeTenantMenu();
      return;
    }
    this.closeTenantMenu();
    this.switchCompany.emit(company.tenantMembershipId);
  }

  protected isCurrent(company: MyCompanyDto): boolean {
    return company.tenantMembershipId === this.currentMembershipId();
  }

  protected companyLabel(company: MyCompanyDto): string {
    return (
      this.language.pick(company.companyNameAr, company.companyNameEn).trim() ||
      company.code ||
      '?'
    );
  }

  protected companyMeta(company: MyCompanyDto): string {
    const parts: string[] = [];
    if (this.duplicateNameKeys().has(this.companyLabel(company).toLowerCase()) && company.code) {
      parts.push(company.code);
    }
    if (!company.isSelectable) {
      parts.push(this.translate.instant('shell.companyUnavailable'));
    } else if (company.isOwner) {
      parts.push(this.translate.instant('shell.roleOwner'));
    }
    return parts.join(' · ');
  }

  protected initialFor(company: MyCompanyDto): string {
    return this.companyLabel(company).trim().charAt(0).toUpperCase() || '?';
  }

  protected askSignOut(): void {
    this.userMenuOpen.set(false);
    this.confirmingSignOut.set(true);
  }

  protected cancelSignOut(): void {
    if (this.loggingOut()) {
      return;
    }
    this.confirmingSignOut.set(false);
  }

  protected confirmSignOut(): void {
    this.logout.emit();
  }
}
