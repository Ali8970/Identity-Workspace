import { Service, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, of, switchMap, tap, throwError } from 'rxjs';
import { SessionStage } from '../../enums/domain.enums';
import {
  CurrentUserResponse,
  LoginRequest,
  LoginResponse,
  MyCompanyDto,
  SelectMembershipRequest,
  SelectMembershipResponse,
} from '../../models/auth.model';
import { BroochError } from '../error/error.model';
import { AuthApi } from './auth-api.service';
import { AuthFlowStore } from './auth-flow.store';
import { CsrfService } from './csrf.service';
import { MeApi } from './me-api.service';

@Service()
export class SessionStore {
  private readonly authApi = inject(AuthApi);
  private readonly meApi = inject(MeApi);
  private readonly csrf = inject(CsrfService);
  private readonly flow = inject(AuthFlowStore);
  private readonly router = inject(Router);

  private readonly stageSignal = signal<SessionStage>(SessionStage.Unknown);
  private readonly userSignal = signal<CurrentUserResponse | null>(null);
  private readonly companiesSignal = signal<MyCompanyDto[]>([]);
  private readonly bootstrappingSignal = signal(false);

  readonly stage = this.stageSignal.asReadonly();
  readonly current = this.userSignal.asReadonly();
  readonly companies = this.companiesSignal.asReadonly();
  readonly bootstrapping = this.bootstrappingSignal.asReadonly();

  readonly isAuthenticated = computed(
    () =>
      this.stageSignal() === SessionStage.Active || this.stageSignal() === SessionStage.Selection,
  );
  readonly isActive = computed(() => this.stageSignal() === SessionStage.Active);
  readonly isSelection = computed(() => this.stageSignal() === SessionStage.Selection);
  readonly permissions = computed(() => this.userSignal()?.permissions ?? []);
  readonly currentTenant = computed(() => this.userSignal()?.currentTenant ?? null);

  hasPermission(permission: string): boolean {
    return this.permissions().includes(permission);
  }

  bootstrap(): Observable<SessionStage> {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/access-denied')) {
      this.stageSignal.set(SessionStage.Anonymous);
      return of(SessionStage.Anonymous);
    }

    this.bootstrappingSignal.set(true);
    return this.refresh().pipe(
      catchError(() => {
        this.clear();
        this.stageSignal.set(SessionStage.Anonymous);
        return of(SessionStage.Anonymous);
      }),
      finalize(() => this.bootstrappingSignal.set(false)),
    );
  }

  refresh(): Observable<SessionStage> {
    return this.meApi.me().pipe(
      switchMap((me) =>
        this.meApi.companies().pipe(
          catchError(() => of([] as MyCompanyDto[])),
          map((companies) => ({ me, companies })),
        ),
      ),
      tap(({ me, companies }) => {
        this.userSignal.set(me);
        this.companiesSignal.set(companies);
        this.stageSignal.set(me.currentTenant ? SessionStage.Active : SessionStage.Selection);
        this.csrf.invalidate();
      }),
      map(() => this.stageSignal()),
      catchError((error: unknown) => {
        this.clear();
        this.stageSignal.set(SessionStage.Anonymous);
        const failure = error as BroochError;
        if (failure?.code === 'Auth.SessionExpired') {
          const returnUrl = this.router.url.startsWith('/login') ? null : this.router.url;
          void this.router.navigate(['/session-expired'], {
            queryParams: returnUrl ? { returnUrl } : {},
          });
        }
        return throwError(() => error);
      }),
    );
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.authApi.login(request).pipe(
      tap((response) => {
        this.csrf.invalidate();
        if (response.requiresTenantSelection) {
          this.stageSignal.set(SessionStage.Selection);
          this.flow.setAvailableCompanies(response.availableCompanies);
        } else {
          this.stageSignal.set(SessionStage.Active);
        }
      }),
      switchMap((response) => this.csrf.prime().pipe(map(() => response))),
    );
  }

  selectMembership(request: SelectMembershipRequest): Observable<SelectMembershipResponse> {
    return this.authApi.selectMembership(request).pipe(
      tap(() => {
        this.csrf.invalidate();
        this.flow.clearTenantSelection();
        this.stageSignal.set(SessionStage.Active);
      }),
      switchMap((response) => this.csrf.prime().pipe(map(() => response))),
    );
  }

  switchCompany(tenantMembershipId: string): Observable<SelectMembershipResponse> {
    return this.selectMembership({ tenantMembershipId, intentId: null }).pipe(
      switchMap((response) => this.refresh().pipe(map(() => response))),
    );
  }

  logout(): Observable<void> {
    return this.authApi.logout().pipe(
      tap(() => {
        this.clear();
        this.csrf.invalidate();
        this.flow.clear();
        this.stageSignal.set(SessionStage.Anonymous);
      }),
    );
  }

  logoutAll(): Observable<void> {
    return this.authApi.logoutAll().pipe(
      tap(() => {
        this.clear();
        this.csrf.invalidate();
        this.flow.clear();
        this.stageSignal.set(SessionStage.Anonymous);
      }),
    );
  }

  clear(): void {
    this.userSignal.set(null);
    this.companiesSignal.set([]);
  }
}
