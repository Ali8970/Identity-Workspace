import { Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { LanguageService } from '../../../../core/i18n/language.service';
import { BroochError } from '../../../../core/error/brooch-error.model';
import { PermissionCatalogItem } from '../../models/workspace-feature.model';
import { PermissionsService } from '../../services/permissions.service';

@Component({
  selector: 'app-permissions-page',
  imports: [TranslatePipe],
  template: `
    <h1 class="page-title" id="main-content-header" tabindex="-1">
      {{ 'permissions.title' | translate }}
    </h1>
    <p class="page-lead">{{ 'permissions.subtitle' | translate }}</p>
    @if (error()) {
      <div class="ui-alert ui-alert--error" role="alert">{{ error()!.message }}</div>
    }
    @for (group of groups(); track group.name) {
      <section class="ui-card" style="margin-bottom:1rem">
        <h2 class="page-title" style="font-size:1.05rem">{{ group.name }}</h2>
        <ul class="perm-tree">
          @for (item of group.items; track item.key) {
            <li>
              <strong>{{ label(item.nameAr, item.nameEn) }}</strong>
              <span class="app-card__key"> {{ item.key }}</span>
            </li>
          }
        </ul>
      </section>
    }
  `,
})
export class PermissionsPage {
  private readonly permissionsService = inject(PermissionsService);
  private readonly language = inject(LanguageService);
  protected readonly items = signal<PermissionCatalogItem[]>([]);
  protected readonly error = signal<BroochError | null>(null);
  protected readonly groups = computed(() => {
    const map = new Map<string, PermissionCatalogItem[]>();
    for (const item of this.items()) {
      const key = `${item.applicationKey}/${item.group}`;
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()].map(([name, groupItems]) => ({ name, items: groupItems }));
  });

  constructor() {
    void this.load();
  }

  protected label(ar: string, en: string): string {
    return this.language.current() === 'ar' ? ar || en : en || ar;
  }

  private async load(): Promise<void> {
    try {
      this.items.set(await firstValueFrom(this.permissionsService.loadCatalog()));
    } catch (err) {
      this.error.set(err as BroochError);
    }
  }
}
