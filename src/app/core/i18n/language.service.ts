import { ApplicationRef, DOCUMENT, Service, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Observable, tap } from 'rxjs';
import { STORAGE_KEYS } from '../../constants/app.constants';

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
    try {
      localStorage.setItem(STORAGE_KEYS.language, lang);
    } catch {
      /* ignore */
    }
  }

  toggle(): void {
    this.setLanguage(this.langSignal() === 'en' ? 'ar' : 'en');
  }

  private apply(lang: AppLanguage): Observable<unknown> {
    this.document.documentElement.lang = lang;
    this.document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    return this.translate.use(lang).pipe(
      tap(() => {
        this.langSignal.set(lang);
        // TranslatePipe updates via subscription; ensure zoneless CD runs
        this.appRef.tick();
      }),
    );
  }

  private readInitial(): AppLanguage {
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
