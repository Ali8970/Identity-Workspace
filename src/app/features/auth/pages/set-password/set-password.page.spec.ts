import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { PasswordService } from '../../services/password.service';
import { SetPasswordPage } from './set-password.page';

interface PageHarness {
  model: { set: (value: { password: string; confirmPassword: string }) => void };
  onSubmit: (event: Event) => Promise<void>;
}

describe('SetPasswordPage', () => {
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideTranslateService({ lang: 'en', fallbackLang: 'en' }),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap({ userId: 'user-1', code: '1234' })),
          },
        },
        {
          provide: PasswordService,
          useValue: {
            setPassword: () => of(undefined),
            clearAuthFlow: () => undefined,
          },
        },
      ],
    });

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  async function submitPasswords(
    fixture: ReturnType<typeof TestBed.createComponent<SetPasswordPage>>,
  ): Promise<void> {
    const page = fixture.componentInstance as unknown as PageHarness;
    page.model.set({ password: 'Abdelrahman@21', confirmPassword: 'Abdelrahman@21' });
    await fixture.whenStable();
    await page.onSubmit(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  }

  it('leaves the setup form for login after the password is saved', async () => {
    const fixture = TestBed.createComponent(SetPasswordPage);
    await fixture.whenStable();

    await submitPasswords(fixture);

    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { activated: '1' },
      replaceUrl: true,
    });
  });

  it('replaces the setup form when login cannot be opened', async () => {
    navigate.mockResolvedValue(false);
    const fixture = TestBed.createComponent(SetPasswordPage);
    await fixture.whenStable();

    await submitPasswords(fixture);

    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(fixture.nativeElement.querySelector('.auth-success')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('auth.setPassword.goToLogin');
    expect(fixture.nativeElement.textContent).not.toContain('common.backToLogin');
  });
});
