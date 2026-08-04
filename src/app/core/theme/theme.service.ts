import { DOCUMENT, Service, inject, signal } from '@angular/core';
import { STORAGE_KEYS } from '../../constants/app.constants';

/** `system` follows the OS; the other two override it. */
export type ThemePreference = 'system' | 'light' | 'dark';

/** What the user actually sees once `system` is resolved. */
export type ResolvedTheme = 'light' | 'dark';

/**
 * Owns the `data-theme` attribute on <html>.
 *
 * The token layer already themes itself from `prefers-color-scheme`, so the app
 * is correct with no attribute at all — this only exists so a user can override
 * the OS. `data-theme` is written for both explicit values (not just dark) so
 * the attribute wins in *both* directions: someone on a dark OS who picks light
 * needs the light tokens back.
 */
@Service()
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly media = this.matchMedia();
  private readonly prefSignal = signal<ThemePreference>(this.readInitial());
  private readonly systemSignal = signal<ResolvedTheme>(this.media?.matches ? 'dark' : 'light');

  /** What the user chose, including `system`. */
  readonly preference = this.prefSignal.asReadonly();

  /** Called from the app initializer, before first paint. */
  init(): void {
    this.apply(this.prefSignal());
    // Keep `system` live: a user changing their OS theme mid-session should follow.
    this.media?.addEventListener('change', (event) => {
      this.systemSignal.set(event.matches ? 'dark' : 'light');
      if (this.prefSignal() === 'system') {
        this.apply('system');
      }
    });
  }

  /** The theme on screen right now, with `system` resolved. */
  resolved(): ResolvedTheme {
    const preference = this.prefSignal();
    return preference === 'system' ? this.systemSignal() : preference;
  }

  setTheme(preference: ThemePreference): void {
    this.prefSignal.set(preference);
    this.apply(preference);
    try {
      if (preference === 'system') {
        localStorage.removeItem(STORAGE_KEYS.theme);
      } else {
        localStorage.setItem(STORAGE_KEYS.theme, preference);
      }
    } catch {
      /* storage blocked — the attribute is still applied for this session */
    }
  }

  /**
   * Flips to the opposite of what is *on screen*, so the first click always
   * visibly changes something — including for a `system` user.
   */
  toggle(): void {
    this.setTheme(this.resolved() === 'dark' ? 'light' : 'dark');
  }

  private apply(preference: ThemePreference): void {
    const root = this.document.documentElement;
    if (preference === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', preference);
    }
  }

  private matchMedia(): MediaQueryList | null {
    return typeof this.document.defaultView?.matchMedia === 'function'
      ? this.document.defaultView.matchMedia('(prefers-color-scheme: dark)')
      : null;
  }

  private readInitial(): ThemePreference {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.theme);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    } catch {
      /* ignore */
    }
    return 'system';
  }
}
