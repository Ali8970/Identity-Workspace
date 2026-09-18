import { Service, computed, inject } from '@angular/core';
import { SessionStore } from '../auth/session.store';
import { LanguageService } from './language.service';

@Service()
export class ApplicationLabels {
  private readonly session = inject(SessionStore);
  private readonly language = inject(LanguageService);

  private readonly names = computed(() => {
    const map = new Map<string, { ar: string; en: string }>();
    for (const application of this.session.current()?.availableApplications ?? []) {
      map.set(application.key, { ar: application.nameAr, en: application.nameEn });
    }
    return map;
  });

  label(applicationKey: string | null | undefined): string {
    if (!applicationKey) {
      return '';
    }
    const entry = this.names().get(applicationKey);
    if (entry) {
      return this.language.pick(entry.ar, entry.en);
    }
    return this.language.labelOr(`apps.${applicationKey}`, applicationKey);
  }
}
