import { Component, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { MeApi } from '../../core/auth/me-api.service';
import { LanguageService } from '../../core/i18n/language.service';
import { BroochError } from '../../core/error/brooch-error.model';

@Component({
  selector: 'app-my-access-page',
  imports: [TranslatePipe],
  template: `
    <h1 class="page-title" id="main-content-header" tabindex="-1">
      {{ 'myAccess.title' | translate }}
    </h1>
    <p class="page-lead">{{ 'myAccess.subtitle' | translate }}</p>
    @if (error()) {
      <div class="ui-alert ui-alert--error" role="alert">{{ error()!.message }}</div>
    }
    <section class="ui-card" style="margin-bottom:1rem">
      <h2 class="page-title" style="font-size:1.05rem">{{ 'myAccess.roles' | translate }}</h2>
      <ul class="perm-tree">
        @for (role of roles(); track role.id) {
          <li>{{ label(role.nameAr, role.nameEn) }} ({{ role.code }})</li>
        }
      </ul>
    </section>
    <section class="ui-card">
      <h2 class="page-title" style="font-size:1.05rem">{{ 'myAccess.permissions' | translate }}</h2>
      <ul class="perm-tree">
        @for (perm of permissions(); track perm) {
          <li>{{ perm }}</li>
        }
      </ul>
    </section>
  `,
})
export class MyAccessPage {
  private readonly meApi = inject(MeApi);
  private readonly language = inject(LanguageService);
  protected readonly roles = signal<{ id: string; code: string; nameAr: string; nameEn: string }[]>(
    [],
  );
  protected readonly permissions = signal<string[]>([]);
  protected readonly error = signal<BroochError | null>(null);

  constructor() {
    void this.load();
  }

  protected label(ar: string, en: string): string {
    return this.language.current() === 'ar' ? ar || en : en || ar;
  }

  private async load(): Promise<void> {
    try {
      const access = (await firstValueFrom(this.meApi.access())) as {
        roles: { id: string; code: string; nameAr: string; nameEn: string }[];
        permissions: string[];
      };
      this.roles.set(access.roles ?? []);
      this.permissions.set(access.permissions ?? []);
    } catch (err) {
      this.error.set(err as BroochError);
    }
  }
}
