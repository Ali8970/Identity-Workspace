import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { SessionStore } from '../../core/auth/session.store';
import { LanguageService } from '../../core/i18n/language.service';
import { PERMISSIONS } from '../../constants/app.constants';
import { BroochError } from '../../core/error/brooch-error.model';

@Component({
  selector: 'app-shell-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  template: `
    <div class="shell">
      <nav class="shell__nav" aria-label="Main">
        <div class="shell__brand">Brooch Identity</div>
        <a routerLink="/applications" routerLinkActive="active" ariaCurrentWhenActive="page">
          {{ 'shell.applications' | translate }}
        </a>
        @if (canReadUsers()) {
          <a routerLink="/members" routerLinkActive="active" ariaCurrentWhenActive="page">
            {{ 'shell.members' | translate }}
          </a>
        }
        @if (canReadRoles()) {
          <a routerLink="/roles" routerLinkActive="active" ariaCurrentWhenActive="page">
            {{ 'shell.roles' | translate }}
          </a>
          <a routerLink="/permissions" routerLinkActive="active" ariaCurrentWhenActive="page">
            {{ 'shell.permissions' | translate }}
          </a>
        }
        <a routerLink="/teams" routerLinkActive="active" ariaCurrentWhenActive="page">
          {{ 'shell.teams' | translate }}
        </a>
        <a routerLink="/my-access" routerLinkActive="active" ariaCurrentWhenActive="page">
          {{ 'shell.myAccess' | translate }}
        </a>
        <a routerLink="/account" routerLinkActive="active" ariaCurrentWhenActive="page">
          {{ 'shell.account' | translate }}
        </a>
      </nav>
      <div>
        <div class="shell__top">
          <div class="shell__tenant">
            <label class="ui-field" style="margin:0; min-width:12rem">
              <span class="visually-hidden">{{ 'shell.switchCompany' | translate }}</span>
              <select
                [value]="currentMembershipId()"
                (change)="onSwitch($any($event.target).value)"
                [disabled]="switching() || companies().length < 2"
              >
                @for (c of companies(); track c.tenantMembershipId) {
                  <option [value]="c.tenantMembershipId" [disabled]="!c.isSelectable">
                    {{ label(c.companyNameAr, c.companyNameEn) }}
                  </option>
                }
              </select>
            </label>
          </div>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap">
            <button type="button" class="ui-btn ui-btn--ghost" (click)="toggleLanguage()">
              {{ 'shell.language' | translate }} ({{ language.current() }})
            </button>
            <button type="button" class="ui-btn ui-btn--ghost" (click)="logout()" [disabled]="loggingOut()">
              {{ 'shell.logout' | translate }}
            </button>
          </div>
        </div>
        @if (switchError()) {
          <div class="ui-alert ui-alert--error" role="alert">{{ switchError()!.message }}</div>
        }
        <main class="shell__main" id="main-content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class ShellLayout {
  private readonly session = inject(SessionStore);
  protected readonly language = inject(LanguageService);
  protected readonly loggingOut = signal(false);
  protected readonly switching = signal(false);
  protected readonly switchError = signal<BroochError | null>(null);

  protected readonly companies = computed(() => this.session.companies());
  protected readonly currentMembershipId = computed(
    () => this.session.currentTenant()?.tenantMembershipId ?? '',
  );

  protected canReadUsers(): boolean {
    return this.session.hasPermission(PERMISSIONS.usersRead);
  }

  protected canReadRoles(): boolean {
    return this.session.hasPermission(PERMISSIONS.rolesRead);
  }

  protected label(ar: string, en: string): string {
    return this.language.current() === 'ar' ? ar || en : en || ar;
  }

  protected toggleLanguage(): void {
    this.language.toggle();
  }

  protected async onSwitch(tenantMembershipId: string): Promise<void> {
    if (!tenantMembershipId || tenantMembershipId === this.currentMembershipId()) {
      return;
    }
    this.switching.set(true);
    this.switchError.set(null);
    try {
      await firstValueFrom(this.session.switchCompany(tenantMembershipId));
    } catch (err) {
      this.switchError.set(err as BroochError);
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
}
