import { Component, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { RoleListItem, RolesApi } from '../../core/api/workspace-api.service';
import { SessionStore } from '../../core/auth/session.store';
import { LanguageService } from '../../core/i18n/language.service';
import { BroochError } from '../../core/error/brooch-error.model';

@Component({
  selector: 'app-roles-page',
  imports: [TranslatePipe],
  template: `
    <h1 class="page-title" id="main-content-header" tabindex="-1">
      {{ 'roles.title' | translate }}
    </h1>
    <p class="page-lead">{{ 'roles.subtitle' | translate }}</p>
    @if (error()) {
      <div class="ui-alert ui-alert--error" role="alert">{{ error()!.message }}</div>
    }
    <div class="app-grid">
      @for (role of roles(); track role.id) {
        <article class="app-card">
          <h2>{{ label(role.nameAr, role.nameEn) }}</h2>
          <p class="app-card__key">{{ role.code }} · {{ role.applicationKey }}</p>
          <ul class="perm-tree">
            @for (key of role.permissionKeys ?? []; track key) {
              <li>{{ key }}</li>
            }
          </ul>
        </article>
      }
    </div>
  `,
})
export class RolesPage {
  private readonly rolesApi = inject(RolesApi);
  private readonly session = inject(SessionStore);
  private readonly language = inject(LanguageService);
  protected readonly roles = signal<RoleListItem[]>([]);
  protected readonly error = signal<BroochError | null>(null);

  constructor() {
    void this.load();
  }

  protected label(ar: string, en: string): string {
    return this.language.current() === 'ar' ? ar || en : en || ar;
  }

  private async load(): Promise<void> {
    const tenantId = this.session.currentTenant()?.tenantId;
    if (!tenantId) {
      return;
    }
    try {
      this.roles.set(await firstValueFrom(this.rolesApi.list(tenantId)));
    } catch (err) {
      this.error.set(err as BroochError);
    }
  }
}
