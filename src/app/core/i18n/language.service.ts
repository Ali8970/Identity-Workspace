import { ApplicationRef, DOCUMENT, Service, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Observable, tap } from 'rxjs';
import { STORAGE_KEYS } from '../../constants/app.constants';
import { readSharedLanguage, writeSharedLanguage } from './shared-language-cookie';

export type AppLanguage = 'en' | 'ar';

@Service()
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly document = inject(DOCUMENT);
  private readonly appRef = inject(ApplicationRef);
  private readonly langSignal = signal<AppLanguage>(this.readInitial());

  readonly current = this.langSignal.asReadonly();

  /** Load translations before first paint (required under zoneless CD). */
  init(): Observable<unknown> {
    return this.apply(this.langSignal());
  }

  setLanguage(lang: AppLanguage): void {
    this.langSignal.set(lang);
    this.apply(lang).subscribe();
    // Shared with the other Brooch apps on `.brooch.sa` so the language survives navigation.
    writeSharedLanguage(lang);
    try {
      localStorage.setItem(STORAGE_KEYS.language, lang);
    } catch {
      /* ignore */
    }
  }

  toggle(): void {
    this.setLanguage(this.langSignal() === 'en' ? 'ar' : 'en');
  }

  /**
   * Picks the Arabic or English side of a bilingual DTO, falling back to the other
   * when the preferred one is empty.
   *
   * `.cursor/rules/i18n-rtl.mdc` asks for a `LocalizedNamePipe`, but a *pure* pipe
   * memoises on its arguments, so a language switch would not re-run it, and impure
   * pipes are ruled out (they run every CD cycle). Called from a template this reads
   * `langSignal` inside a reactive consumer, so it tracks the language correctly.
   *
   * Field names differ per DTO (`nameAr` / `arabicName` / `companyNameAr` / `title.ar`),
   * which is why this takes two values rather than an object.
   */
  pick(ar: string | null | undefined, en: string | null | undefined): string {
    return this.langSignal() === 'ar' ? ar || en || '' : en || ar || '';
  }

  /**
   * Translated label for `key`, or `fallback` when the key is absent.
   *
   * Used for keys built at runtime from API values (`permissions.apps.<applicationKey>`,
   * `permissions.groups.<resource>`, `myAccess.apps.<module>`). The API can introduce a
   * new application / resource / module at any time, and ngx-translate renders the raw
   * key when it cannot resolve one — so an unmapped value must degrade to something
   * readable instead of leaking `permissions.groups.memberships` into the UI.
   *
   * Reads `langSignal` so templates re-evaluate this on a language switch.
   */
  labelOr(key: string, fallback: string): string {
    this.langSignal();
    const translated = this.translate.instant(key);
    return typeof translated === 'string' && translated !== key ? translated : fallback;
  }

  private apply(lang: AppLanguage): Observable<unknown> {
    this.document.documentElement.lang = lang;
    this.document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    return this.translate.use(lang).pipe(
      tap(() => {
        // `setLanguage` already set the signal; this only flushes the view.
        // TranslatePipe updates via subscription; ensure zoneless CD runs.
        this.appRef.tick();
      }),
    );
  }

  /**
   * The shared `.brooch.sa` cookie wins: it is what the CRM wrote when the user switched
   * language there, so arriving from the CRM keeps the same language here.
   */
  private readInitial(): AppLanguage {
    const shared = readSharedLanguage();
    if (shared) {
      return shared;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.language);
      if (stored === 'ar' || stored === 'en') {
        return stored;
      }
    } catch {
      /* ignore */
    }
    return 'en';
  }
}
