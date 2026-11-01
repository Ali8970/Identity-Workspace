import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { SessionStore } from '@core/auth/session.store';
import { SsoHandshakeService } from '@core/auth/sso-handshake.service';
import { LoginService } from '../../services/login.service';
import { LoginPage } from './login.page';

describe('LoginPage after set-password', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideTranslateService({ lang: 'en', fallbackLang: 'en' }),
        {
          provide: LoginService,
          useValue: {
            readQueryState: () => ({
              intentId: null,
              returnUrl: null,
              selectionRestartRequired: false,
              justOnboarded: false,
              justActivated: true,
              email: null,
            }),
            signIn: () => of({}),
            refreshSession: () => of(undefined),
            clearFlow: () => undefined,
            clearIntent: () => undefined,
            scrubIntentFromUrl: () => undefined,
          },
        },
        {
          provide: SessionStore,
          useValue: { isAuthenticated: () => false },
        },
        {
          provide: SsoHandshakeService,
          useValue: { navigate: () => undefined, assign: () => undefined },
        },
      ],
    });
  });

  it('shows sign-in as the step after a password is set', async () => {
    const fixture = TestBed.createComponent(LoginPage);
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('auth.login.activatedBanner');
    expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
  });
});
