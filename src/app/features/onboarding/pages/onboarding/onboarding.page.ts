import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { LanguageService } from '../../../../core/i18n/language.service';
import { BroochError } from '../../../../core/error/brooch-error.model';
import { PackageDto } from '../../models/onboarding-feature.model';
import { OnboardingService } from '../../services/onboarding.service';

@Component({
  selector: 'app-onboarding-page',
  imports: [TranslatePipe, FormField],
  template: `
    <div class="auth-shell">
      <div class="auth-shell__panel ui-card">
        <h1 class="auth-shell__brand"><span>Brooch</span> Identity</h1>
        <p class="auth-shell__lead">{{ 'onboarding.subtitle' | translate }}</p>

        @if (error()) {
          <div class="ui-alert ui-alert--error" role="alert">{{ error()!.message }}</div>
        }

        @if (step() === 'company') {
          <h2 class="page-title" style="font-size:1.15rem">{{ 'onboarding.companyTitle' | translate }}</h2>
          <form (submit)="saveCompany($event)">
            <div class="ui-field">
              <label for="ar">{{ 'onboarding.arabicName' | translate }}</label>
              <input id="ar" type="text" [formField]="companyForm.arabicCompanyName" />
            </div>
            <div class="ui-field">
              <label for="en">{{ 'onboarding.englishName' | translate }}</label>
              <input id="en" type="text" [formField]="companyForm.englishCompanyName" />
            </div>
            <button class="ui-btn ui-btn--primary ui-btn--block" type="submit" [disabled]="busy()">
              {{ 'onboarding.continue' | translate }}
            </button>
          </form>
        } @else {
          <h2 class="page-title" style="font-size:1.15rem">{{ 'onboarding.packageTitle' | translate }}</h2>
          <div class="app-grid" style="margin-bottom:1rem">
            @for (pkg of packages(); track pkg.id) {
              <article
                class="app-card"
                [class.app-card--selected]="selectedPackage() === pkg.id"
                (click)="selectedPackage.set(pkg.id)"
                (keydown.enter)="selectedPackage.set(pkg.id)"
                tabindex="0"
                role="button"
              >
                <h3>{{ label(pkg.nameAr, pkg.nameEn) }}</h3>
                <p>{{ label(pkg.descriptionAr, pkg.descriptionEn) }}</p>
              </article>
            }
          </div>
          <button
            class="ui-btn ui-btn--primary ui-btn--block"
            type="button"
            [disabled]="busy() || !selectedPackage()"
            (click)="startTrial()"
          >
            {{ 'onboarding.startTrial' | translate }}
          </button>
        }
      </div>
    </div>
  `,
})
export class OnboardingPage {
  private readonly onboardingService = inject(OnboardingService);
  private readonly language = inject(LanguageService);
  private readonly router = inject(Router);

  protected readonly step = signal<'company' | 'package'>(
    window.location.pathname.includes('/package') ? 'package' : 'company',
  );
  protected readonly packages = signal<PackageDto[]>([]);
  protected readonly selectedPackage = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<BroochError | null>(null);
  protected readonly companyModel = signal({ arabicCompanyName: '', englishCompanyName: '' });
  protected readonly companyForm = form(this.companyModel, (schema) => {
    required(schema.arabicCompanyName);
    required(schema.englishCompanyName);
  });

  constructor() {
    void this.bootstrap();
  }

  protected label(ar: string, en: string): string {
    return this.language.current() === 'ar' ? ar || en : en || ar;
  }

  private async bootstrap(): Promise<void> {
    try {
      const tenant = await firstValueFrom(this.onboardingService.loadTenant());
      this.companyModel.set({
        arabicCompanyName: tenant.arabicCompanyName,
        englishCompanyName: tenant.englishCompanyName,
      });
      if (this.step() === 'package') {
        const packages = await firstValueFrom(this.onboardingService.loadPackages());
        this.packages.set(packages);
        this.selectedPackage.set(packages[0]?.id ?? null);
      }
    } catch (err) {
      this.error.set(err as BroochError);
    }
  }

  protected saveCompany(event: Event): void {
    event.preventDefault();
    void submit(this.companyForm, async () => {
      this.busy.set(true);
      this.error.set(null);
      try {
        const value = this.companyModel();
        await firstValueFrom(this.onboardingService.saveCompanyProfile(value));
        await this.router.navigate(['/onboarding/package']);
        this.step.set('package');
        const packages = await firstValueFrom(this.onboardingService.loadPackages());
        this.packages.set(packages);
        this.selectedPackage.set(packages[0]?.id ?? null);
      } catch (err) {
        this.error.set(err as BroochError);
      } finally {
        this.busy.set(false);
      }
    });
  }

  protected async startTrial(): Promise<void> {
    const packageId = this.selectedPackage();
    if (!packageId) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.onboardingService.startFreeTrial(packageId));
      window.location.assign('/login?onboarded=1');
    } catch (err) {
      this.error.set(err as BroochError);
      this.busy.set(false);
    }
  }
}
