import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { filter, firstValueFrom } from 'rxjs';
import { SessionStore } from '../../core/auth/session.store';
import { LanguageService } from '../../core/i18n/language.service';
import { PERMISSIONS } from '../../constants/app.constants';
import { DOCUMENT } from '@angular/common';
import { ShellHeader } from '../ui/shell-header/shell-header';
import { ShellSidebar } from '../ui/shell-sidebar/shell-sidebar';
import { GlobalErrorBanner } from '../ui/global-error-banner/global-error-banner';
import { ShellNavItem } from './shell-nav.model';

const SIDEBAR_STORAGE_KEY = 'brooch.shell.sidebarCollapsed';
const MOBILE_BREAKPOINT = 860;

@Component({
  selector: 'app-shell-layout',
  imports: [RouterOutlet, TranslatePipe, ShellSidebar, ShellHeader, GlobalErrorBanner],
  host: {
    class: 'shell-host',
    '(document:keydown.escape)': 'onEscape()',
    '(window:resize)': 'onResize()',
  },
  template: `
    <div
      class="shell"
      [class.shell--sidebar-collapsed]="sidebarCollapsed()"
      [class.shell--mobile-nav-open]="mobileNavOpen()"
    >
      @if (mobileNavOpen()) {
        <button
          type="button"
          class="shell__backdrop"
          (click)="closeMobileNav()"
          [attr.aria-label]="'shell.closeSidebar' | translate"
        ></button>
      }

      <app-shell-sidebar
        [collapsed]="sidebarCollapsed() && !mobileNavOpen()"
        [mobileOpen]="mobileNavOpen()"
        [items]="navItems()"
        (navigate)="closeMobileNav()"
      />

      <div class="shell__workspace">
        <app-shell-header
          [sidebarCollapsed]="sidebarCollapsed()"
          [mobileNavOpen]="mobileNavOpen()"
          [companies]="companies()"
          [currentMembershipId]="currentMembershipId()"
          [tenantName]="tenantName()"
          [userName]="userName()"
          [userEmail]="userEmail()"
          [userInitial]="userInitial()"
          [currentLanguage]="language.current()"
          [switching]="switching()"
          [loggingOut]="loggingOut()"
          (toggleSidebar)="toggleSidebar()"
          (switchCompany)="onSwitch($event)"
          (languageChange)="setLanguage($event)"
          (logout)="logout()"
        />

        <app-global-error-banner variant="shell" />

        <main class="shell__main" id="main-content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class ShellLayout {
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  protected readonly language = inject(LanguageService);

  protected readonly loggingOut = signal(false);
  protected readonly switching = signal(false);
  protected readonly sidebarCollapsed = signal(this.readSidebarPreference());
  protected readonly mobileNavOpen = signal(false);
  protected readonly isMobile = signal(this.queryIsMobile());

  protected readonly companies = computed(() => this.session.companies());
  protected readonly currentMembershipId = computed(
    () => this.session.currentTenant()?.tenantMembershipId ?? '',
  );

  protected readonly tenantName = computed(() => {
    const tenant = this.session.currentTenant();
    if (!tenant) {
      return '';
    }
    return this.label(tenant.nameAr, tenant.nameEn);
  });

  protected readonly userName = computed(() => {
    const user = this.session.current()?.user;
    if (!user) {
      return '';
    }
    return this.label(user.nameAr, user.nameEn);
  });

  protected readonly userEmail = computed(() => this.session.current()?.user.email ?? '');

  protected readonly userInitial = computed(() => {
    const name = this.userName().trim();
    return name ? name.charAt(0).toUpperCase() : '?';
  });

  protected readonly navItems = computed(() => {
    const items: ShellNavItem[] = [
      { route: '/applications', labelKey: 'shell.applications', icon: 'applications' },
    ];
    if (this.canReadUsers()) {
      items.push({ route: '/members', labelKey: 'shell.members', icon: 'members' });
    }
    if (this.canReadRoles()) {
      items.push(
        { route: '/roles', labelKey: 'shell.roles', icon: 'roles' },
        { route: '/permissions', labelKey: 'shell.permissions', icon: 'permissions' },
      );
    }
    items.push(
      { route: '/teams', labelKey: 'shell.teams', icon: 'teams' },
      { route: '/my-access', labelKey: 'shell.myAccess', icon: 'my-access' },
      { route: '/account', labelKey: 'shell.account', icon: 'account' },
    );
    return items;
  });

  constructor() {
    effect(() => {
      this.document.body.classList.toggle('shell-nav-open', this.mobileNavOpen());
    });

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.closeMobileNav();
        queueMicrotask(() => document.getElementById('main-content-header')?.focus());
      });
  }

  protected canReadUsers(): boolean {
    return this.session.hasPermission(PERMISSIONS.membershipsManage);
  }

  protected canReadRoles(): boolean {
    return this.session.hasPermission(PERMISSIONS.rolesRead);
  }

  protected label(ar: string, en: string): string {
    return this.language.current() === 'ar' ? ar || en : en || ar;
  }

  protected toggleSidebar(): void {
    if (this.isMobile()) {
      this.mobileNavOpen.update((open) => !open);
      return;
    }
    this.sidebarCollapsed.update((collapsed) => !collapsed);
    this.persistSidebarPreference(this.sidebarCollapsed());
  }

  protected closeMobileNav(): void {
    if (this.mobileNavOpen()) {
      this.mobileNavOpen.set(false);
    }
  }

  protected onEscape(): void {
    this.closeMobileNav();
  }

  protected onResize(): void {
    const mobile = this.queryIsMobile();
    this.isMobile.set(mobile);
    if (!mobile) {
      this.closeMobileNav();
    }
  }

  protected setLanguage(lang: 'en' | 'ar'): void {
    if (lang !== this.language.current()) {
      this.language.setLanguage(lang);
    }
  }

  protected async onSwitch(tenantMembershipId: string): Promise<void> {
    if (!tenantMembershipId || tenantMembershipId === this.currentMembershipId()) {
      return;
    }
    this.switching.set(true);
    try {
      await firstValueFrom(this.session.switchCompany(tenantMembershipId));
    } finally {
      this.switching.set(false);
    }
  }

  protected async logout(): Promise<void> {
    this.loggingOut.set(true);
    try {
      await firstValueFrom(this.session.logoutAll());
      window.location.assign('/login');
    } finally {
      this.loggingOut.set(false);
    }
  }

  private readSidebarPreference(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1';
  }

  private persistSidebarPreference(collapsed: boolean): void {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? '1' : '0');
  }

  private queryIsMobile(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
  }
}
