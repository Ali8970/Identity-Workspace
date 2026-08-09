import { DOCUMENT, Service, inject, signal } from '@angular/core';
import { STORAGE_KEYS } from '../../constants/app.constants';

/** Explicit user choice only — never follows the OS / browser. */
export type ThemePreference = 'light' | 'dark';

/**
 * Owns the `data-theme` attribute on <html>.
 *
 * Default is light. Dark applies only when the user toggles it (persisted in
 * localStorage). The OS `prefers-color-scheme` media query is ignored.
 */
@Service()
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly prefSignal = signal<ThemePreference>(this.readInitial());

  /** What the user chose. */
  readonly preference = this.prefSignal.asReadonly();

  /** Called from the app initializer, before first paint. */
  init(): void {
    this.apply(this.prefSignal());
  }

  /** The theme on screen right now. */
  resolved(): ThemePreference {
    return this.prefSignal();
  }

  setTheme(preference: ThemePreference): void {
    this.prefSignal.set(preference);
    this.apply(preference);
    try {
      localStorage.setItem(STORAGE_KEYS.theme, preference);
    } catch {
      /* storage blocked — the attribute is still applied for this session */
    }
  }

  /** Flips light ↔ dark. */
  toggle(): void {
    this.setTheme(this.prefSignal() === 'dark' ? 'light' : 'dark');
  }

  private apply(preference: ThemePreference): void {
    this.document.documentElement.setAttribute('data-theme', preference);
  }

  private readInitial(): ThemePreference {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.theme);
      if (stored === 'dark') {
        return 'dark';
      }
    } catch {
      /* ignore */
    }
    return 'light';
  }
}
