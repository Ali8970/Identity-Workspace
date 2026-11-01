import { TestBed } from '@angular/core/testing';
import { Component, provideZonelessChangeDetection } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { App } from './app';
import { OnboardedNotice } from '@core/auth/onboarded-notice';
import { ToastService } from '@shared/ui/toast/toast.service';

@Component({ template: '' })
class Blank {}

const ROUTES = [
  { path: 'login', component: Blank },
  { path: 'session-expired', component: Blank },
  { path: 'onboarding/payment-done', component: Blank },
];

describe('App', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter(ROUTES),
        // App renders the skip link through TranslatePipe.
        provideTranslateService({ lang: 'en', fallbackLang: 'en' }),
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  /**
   * After paying, the session that paid ends — by the hand-off, by a 401, or by a full page load
   * to `completionUrl`. The "payment successful" toast must survive all three: it used to be
   * spent by the first page and wiped by the reload a moment later.
   */
  describe('payment-successful toast', () => {
    const shown = (): number =>
      TestBed.inject(ToastService)
        .toasts()
        .filter((toast) => !toast.leaving).length;

    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    async function land(url: string): Promise<void> {
      TestBed.createComponent(App);
      await TestBed.inject(Router).navigateByUrl(url);
    }

    it('greets the owner wherever the ended session lands them', async () => {
      TestBed.inject(OnboardedNotice).remember();

      await land('/session-expired');

      expect(shown()).toBe(1);
    });

    it('stays out of the result screens, which already celebrate', async () => {
      TestBed.inject(OnboardedNotice).remember();

      await land('/onboarding/payment-done');

      expect(shown()).toBe(0);
    });

    it('keeps the notice until the toast has been seen out, then lets it go', async () => {
      const notice = TestBed.inject(OnboardedNotice);
      notice.remember();
      await land('/login');

      // A full reload at this point would find the notice and show the toast again.
      vi.advanceTimersByTime(1_000);
      expect(notice.pending()).toBe(true);

      vi.advanceTimersByTime(4_500);
      expect(notice.pending()).toBe(false);
    });

    it('shows one toast, not two, when the owner is routed twice', async () => {
      TestBed.inject(OnboardedNotice).remember();
      await land('/login');

      await TestBed.inject(Router).navigateByUrl('/login?onboarded=1');

      expect(shown()).toBe(1);
    });
  });
});
