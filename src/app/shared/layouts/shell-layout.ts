import { ApplicationRef, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DOCUMENT } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { filter, firstValueFrom } from 'rxjs';
import { PERMISSIONS } from '../../constants/app.constants';
import { SessionStore } from '../../core/auth/session.store';
import { LanguageService } from '../../core/i18n/language.service';
import { BusyOverlay } from '../ui/busy-overlay/busy-overlay';
import { GlobalErrorBanner } from '../ui/global-error-banner/global-error-banner';
import { ShellHeader } from '../ui/shell-header/shell-header';
import { ShellSidebar } from '../ui/shell-sidebar/shell-sidebar';
import { ShellNavGroup, ShellNavItem } from './shell-nav.model';

const SIDEBAR_STORAGE_KEY = 'brooch.shell.sidebarCollapsed';
const MOBILE_BREAKPOINT = 1025;

@Component({
  selector: 'app-shell-layout',
  imports: [RouterOutlet, TranslatePipe, ShellSidebar, ShellHeader, GlobalErrorBanner, BusyOverlay],
  host: {
    class: 'block',
    '(document:keydown.escape)': 'onEscape()',
    '(window:resize)': 'onResize()',
    '(window:pageshow)': 'onPageShow($event)',
  },
  template: `
    <div
      class="flex min-h-dvh bg-surface-muted text-text [--sidebar-rail:300px] max-md:[--sidebar-rail:0px] min-[1801px]:[--sidebar-rail:328px]"
      [style.--sidebar-rail]="desktopSidebarCollapsed() ? '0px' : null"
      [attr.data-desktop-sidebar-collapsed]="desktopSidebarCollapsed() || null"
    >
      <aside
        id="app-main-sidebar"
        class="sticky top-0 hidden h-dvh w-(--sidebar-rail) shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out md:flex"
        [attr.aria-hidden]="desktopSidebarCollapsed() ? 'true' : null"
      >
        <app-shell-sidebar
          [groups]="navGroups()"
          [userName]="userName()"
          [userInitial]="userInitial()"
          (navigate)="closeMobileNav()"
        />
      </aside>

      @if (menuOpen()) {
        <div class="fixed inset-0 z-30 md:hidden">
          <button
            type="button"
            class="absolute inset-0 cursor-pointer border-0 bg-secondary/40"
            [attr.aria-label]="'shell.closeSidebar' | translate"
            (click)="closeMobileNav()"
          ></button>
          <div class="relative h-full w-[min(86vw,300px)] overflow-hidden shadow-xl">
            <app-shell-sidebar
              [showClose]="true"
              [groups]="navGroups()"
              [userName]="userName()"
              [userInitial]="userInitial()"
              (navigate)="closeMobileNav()"
              (closed)="closeMobileNav()"
            />
          </div>
        </div>
      }

      <div class="flex min-w-0 flex-1 flex-col">
        <app-shell-header
          [desktopSidebarCollapsed]="desktopSidebarCollapsed()"
          [companies]="companies()"
          [currentMembershipId]="currentMembershipId()"
          [tenantName]="tenantName()"
          [userName]="userName()"
          [userEmail]="userEmail()"
          [userInitial]="userInitial()"
          [currentLanguage]="language.current()"
          [switching]="switching()"
          [loggingOut]="loggingOut()"
          (menu)="openMenu()"
          (toggleDesktopSidebar)="toggleDesktopSidebar()"
          (switchCompany)="onSwitch($event)"
          (languageChange)="setLanguage($event)"
          (logout)="logout()"
        />

        <app-global-error-banner variant="shell" />

        <div class="min-w-0 flex-1 px-4 py-4 md:px-6 md:py-[1.2rem]" [attr.aria-busy]="blocked()">
          <main id="main-content" tabindex="-1">
            <router-outlet />
          </main>
        </div>
      </div>

      @if (blockingMessageKey(); as messageKey) {
        <app-busy-overlay [messageKey]="messageKey" />
      }
    </div>
  `,
})
export class ShellLayout {
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly appRef = inject(ApplicationRef);
  protected readonly language = inject(LanguageService);

  protected readonly loggingOut = signal(false);
  protected readonly switching = signal(false);
  protected readonly desktopSidebarCollapsed = signal(this.readSidebarPreference());
  protected readonly menuOpen = signal(false);
  protected readonly isMobile = signal(this.queryIsMobile());

  protected readonly blockingMessageKey = computed(() => {
    if (this.loggingOut()) {
      return 'shell.signingOut';
    }
    return this.switching() ? 'shell.switchingCompany' : null;
  });
  protected readonly blocked = computed(() => this.blockingMessageKey() !== null);

  protected readonly companies = computed(() => this.session.companies());
  protected readonly currentMembershipId = computed(
    () =>
      this.session.currentCompany()?.tenantMembershipId ??
      this.session.currentTenant()?.tenantMembershipId ??
      '',
  );

  protected readonly tenantName = computed(() => {
    const tenant = this.session.currentTenant();
    if (!tenant) {
      return '';
    }
    return this.language.pick(tenant.nameAr, tenant.nameEn);
  });

  protected readonly userName = computed(() => {
    const user = this.session.current()?.user;
    if (!user) {
      return '';
    }
    return this.language.pick(user.nameAr, user.nameEn);
  });

  protected readonly userEmail = computed(() => this.session.current()?.user.email ?? '');

  protected readonly userInitial = computed(() => {
    const name = this.userName().trim();
    if (name) {
      return name.charAt(0).toUpperCase();
    }
    const email = this.userEmail().trim();
    return email ? email.charAt(0).toUpperCase() : '?';
  });

  protected readonly navGroups = computed((): ShellNavGroup[] => {
    const personal: ShellNavItem[] = [
      { route: '/applications', labelKey: 'shell.applications', icon: 'applications' },
      { route: '/my-access', labelKey: 'shell.myAccess', icon: 'my-access' },
      { route: '/account', labelKey: 'shell.account', icon: 'account' },
    ];

    const admin: ShellNavItem[] = [];
    if (this.canReadUsers()) {
      admin.push({ route: '/members', labelKey: 'shell.members', icon: 'members' });
    }
    if (this.canReadRoles()) {
      admin.push({ route: '/roles', labelKey: 'shell.roles', icon: 'roles' });
    }
    if (this.canReadPermissions()) {
      admin.push({ route: '/permissions', labelKey: 'shell.permissions', icon: 'permissions' });
    }
    if (this.canReadTeams()) {
      admin.push({ route: '/teams', labelKey: 'shell.teams', icon: 'teams' });
    }

    const groups: ShellNavGroup[] = [{ labelKey: 'shell.nav.workspace', items: personal }];
    if (admin.length > 0) {
      groups.push({ labelKey: 'shell.nav.directory', items: admin });
    }
    return groups;
  });

  constructor() {
    effect(() => {
      this.document.body.classList.toggle('shell-nav-open', this.menuOpen());
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

  protected onPageShow(event: PageTransitionEvent): void {
    if (!event.persisted && this.session.current()) {
      return;
    }
    if (!this.session.current()) {
      void firstValueFrom(this.session.bootstrap()).then(() => this.appRef.tick());
    }
  }

  protected canReadUsers(): boolean {
    return this.session.hasPermission(PERMISSIONS.membershipsRead);
  }

  protected canReadRoles(): boolean {
    return this.session.hasPermission(PERMISSIONS.rolesRead);
  }

  protected canReadPermissions(): boolean {
    return this.session.hasPermission(PERMISSIONS.permissionsRead);
  }

  protected canReadTeams(): boolean {
    return this.session.hasPermission(PERMISSIONS.teamsRead);
  }

  protected openMenu(): void {
    this.menuOpen.set(true);
  }

  protected toggleDesktopSidebar(): void {
    this.desktopSidebarCollapsed.update((collapsed) => !collapsed);
    this.persistSidebarPreference(this.desktopSidebarCollapsed());
  }

  protected closeMobileNav(): void {
    if (this.menuOpen()) {
      this.menuOpen.set(false);
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
    if (this.loggingOut()) {
      return;
    }
    this.loggingOut.set(true);
    try {
      await firstValueFrom(this.session.logoutAll());
      await this.router.navigate(['/login'], { replaceUrl: true });
    } catch {
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
