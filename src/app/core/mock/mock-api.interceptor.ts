import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { delay, of, switchMap, throwError, timer } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HTTP_HEADERS } from '../../constants/app.constants';
import {
  MembershipStatus,
  SessionStage,
  TenantStatus,
  UserStatus,
} from '../../enums/domain.enums';
import { ApiResponse } from '../../models/api-response.model';
import {
  InMemoryIdentityStore,
  MockMembership,
  MockSession,
  newId,
} from './in-memory-identity.store';

function ok<T>(data: T, message = 'OK', statusCode = 200): HttpResponse<ApiResponse<T>> {
  return new HttpResponse({
    status: statusCode,
    body: { statusCode, message, data },
  });
}

function problem(
  status: number,
  code: string,
  messageEn: string,
  messageAr: string,
  extras: Record<string, unknown> = {},
): HttpErrorResponse {
  return new HttpErrorResponse({
    status,
    statusText: code,
    url: '/api/v1',
    error: {
      status,
      code,
      message: { en: messageEn, ar: messageAr },
      messageKey: code,
      correlationId: newId(),
      ...extras,
    },
  });
}

function pathOf(url: string): string {
  try {
    const u = new URL(url, 'http://local');
    return u.pathname.replace(/\/api\/v1/, '') || '/';
  } catch {
    return url;
  }
}

function eligibleNonIdentityApps(
  store: InMemoryIdentityStore,
  membership: MockMembership,
): ReturnType<InMemoryIdentityStore['getApplications']> {
  return store.getApplications().filter((app) => {
    if (!app.isActive || app.key === 'identity') {
      return false;
    }
    const roles = store.getRolesForMembership(membership, app.key);
    return roles.length > 0 && membership.hasActiveSubscription;
  });
}

function resolveDefaultRedirect(
  store: InMemoryIdentityStore,
  membership: MockMembership,
  intentId: string | null,
): string | null {
  if (intentId) {
    const intent = store.getIntent(intentId);
    if (intent && intent.state === 'Created') {
      store.updateIntent(intentId, {
        state: 'Completed',
        resolvedUserId: membership.userId,
      });
      return intent.returnUrl;
    }
  }
  const targets = eligibleNonIdentityApps(store, membership);
  return targets.length === 1 ? `${targets[0].baseUrl}/` : null;
}

function toAvailableCompanies(store: InMemoryIdentityStore, memberships: MockMembership[]) {
  return memberships.map((m) => {
    const tenant = store.getTenant(m.tenantId)!;
    return {
      tenantMembershipId: m.id,
      tenantId: m.tenantId,
      companyNameAr: tenant.nameAr,
      companyNameEn: tenant.nameEn,
      status: MembershipStatus[m.status] ?? 'Active',
      isOwner: m.isOwner,
      hasActiveSubscription: m.hasActiveSubscription,
    };
  });
}

export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.useMockApi || !req.url.includes('/api/')) {
    return next(req);
  }

  const store = inject(InMemoryIdentityStore);
  const path = pathOf(req.url);
  const method = req.method.toUpperCase();
  const latency = environment.mockLatencyMs;

  const respond = <T>(response: HttpResponse<T> | HttpErrorResponse) => {
    if (response instanceof HttpErrorResponse) {
      // Delay then error so the body/status stay intact for the error interceptor
      return timer(latency).pipe(switchMap(() => throwError(() => response)));
    }
    return of(response).pipe(delay(latency));
  };

  // CSRF
  if (method === 'GET' && path === '/auth/csrf') {
    return respond(
      new HttpResponse({ status: 200, body: { token: store.issueCsrf() } }),
    );
  }

  const csrfHeader = req.headers.get(HTTP_HEADERS.csrf);
  const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  const csrfExempt = [
    '/auth/login',
    '/auth/set-password',
    '/auth/forgot-password',
    '/auth/forgot-password/complete',
    '/auth/login-intent',
    '/auth/csrf',
    '/tenants/register',
  ].includes(path);

  if (unsafe && !csrfExempt) {
    if (store.consumeCsrfFailOnce() || !store.validateCsrf(csrfHeader)) {
      return respond(
        problem(400, 'Auth.AntiforgeryFailed', 'CSRF validation failed', 'فشل التحقق من CSRF'),
      );
    }
  }

  // Login
  if (method === 'POST' && path === '/auth/login') {
    if (store.shouldRateLimitLogin()) {
      return respond(
        problem(429, 'Auth.RateLimited', 'Too many attempts. Try again later.', 'محاولات كثيرة. حاول لاحقاً', {
          retryAfterSeconds: 30,
        }),
      );
    }
    const body = req.body as {
      email?: string;
      password?: string;
      intentId?: string | null;
    };
    const user = store.getUserByEmail(body.email ?? '');
    if (!user || user.password !== body.password) {
      return respond(
        problem(
          401,
          'Identity.InvalidCredentials',
          'Invalid email or password',
          'البريد أو كلمة المرور غير صحيحة',
        ),
      );
    }
    if (user.status !== UserStatus.Active) {
      return respond(
        problem(403, 'Identity.Account.Disabled', 'Account disabled', 'الحساب معطل'),
      );
    }

    const allMemberships = store.getMembershipsForUser(user.id);
    const memberships = store.getActiveMembershipsForUser(user.id);
    if (memberships.length === 0) {
      if (allMemberships.some((m) => m.status === MembershipStatus.Suspended)) {
        return respond(
          problem(403, 'Membership.Suspended', 'Membership suspended', 'العضوية معلقة'),
        );
      }
      return respond(
        problem(
          422,
          'Identity.NoActiveTenantMembership',
          'No active membership',
          'لا توجد عضوية نشطة',
        ),
      );
    }

    const intentId = body.intentId ?? null;
    if (intentId) {
      const intent = store.getIntent(intentId);
      if (!intent) {
        return respond(
          problem(404, 'Identity.LoginIntent.NotFound', 'Intent not found', 'النية غير موجودة'),
        );
      }
      if (intent.state === 'Expired') {
        return respond(
          problem(422, 'Identity.LoginIntent.Expired', 'Intent expired', 'انتهت صلاحية النية'),
        );
      }
      if (intent.state === 'Completed') {
        return respond(
          problem(
            409,
            'Identity.LoginIntent.AlreadyCompleted',
            'Intent already used',
            'تم استخدام النية مسبقاً',
          ),
        );
      }
    }

    if (memberships.length > 1) {
      const session: MockSession = {
        id: newId(),
        userId: user.id,
        stage: SessionStage.Selection,
        tenantId: null,
        tenantMembershipId: null,
      };
      store.createSession(session);
      return respond(
        ok(
          {
            availableCompanies: toAvailableCompanies(store, memberships),
            requiresTenantSelection: true,
            redirectUrl: null,
          },
          'Login successful',
        ),
      );
    }

    const membership = memberships[0];
    const tenant = store.getTenant(membership.tenantId);
    if (
      !tenant ||
      (tenant.status !== TenantStatus.Active && tenant.status !== TenantStatus.Onboarding)
    ) {
      return respond(
        problem(403, 'Membership.TenantDisabled', 'Company disabled', 'الشركة معطلة'),
      );
    }

    if (intentId) {
      const intent = store.getIntent(intentId)!;
      const roles = store.getRolesForMembership(membership, intent.applicationKey);
      if (roles.length === 0 && intent.applicationKey !== 'identity') {
        return respond(
          problem(
            403,
            'Auth.ApplicationAccessDenied',
            'Application access denied',
            'تم رفض الوصول للتطبيق',
            { redirectUrl: `${store.getApplication(intent.applicationKey)?.baseUrl ?? ''}/access-denied` },
          ),
        );
      }
    }

    const session: MockSession = {
      id: newId(),
      userId: user.id,
      stage: SessionStage.Active,
      tenantId: membership.tenantId,
      tenantMembershipId: membership.id,
    };
    store.createSession(session);
    const redirectUrl = resolveDefaultRedirect(store, membership, intentId);

    return respond(
      ok(
        {
          availableCompanies: toAvailableCompanies(store, memberships),
          requiresTenantSelection: false,
          redirectUrl,
        },
        'Login successful',
      ),
    );
  }

  // Select membership
  if (method === 'POST' && path === '/auth/select-membership') {
    const session = store.currentSession();
    if (!session) {
      return respond(
        problem(401, 'Auth.NotAuthenticated', 'Not authenticated', 'غير مصادق'),
      );
    }
    const body = req.body as { tenantMembershipId?: string; intentId?: string | null };
    const membership = store.getMembership(body.tenantMembershipId ?? '');
    if (!membership || membership.userId !== session.userId) {
      return respond(problem(404, 'Membership.NotFound', 'Membership not found', 'العضوية غير موجودة'));
    }
    if (membership.status !== MembershipStatus.Active) {
      return respond(problem(403, 'Membership.NotActive', 'Membership not active', 'العضوية غير نشطة'));
    }

    const intentId = body.intentId ?? null;
    if (intentId) {
      const intent = store.getIntent(intentId);
      if (!intent) {
        return respond(
          problem(404, 'Identity.LoginIntent.NotFound', 'Intent not found', 'النية غير موجودة'),
        );
      }
      if (intent.state === 'Expired') {
        return respond(
          problem(422, 'Identity.LoginIntent.Expired', 'Intent expired', 'انتهت صلاحية النية'),
        );
      }
      if (intent.state === 'Completed') {
        return respond(
          problem(
            409,
            'Identity.LoginIntent.AlreadyCompleted',
            'Intent already used',
            'تم استخدام النية مسبقاً',
          ),
        );
      }
      const roles = store.getRolesForMembership(membership, intent.applicationKey);
      const eligible =
        intent.applicationKey === 'identity' ||
        (roles.length > 0 && membership.hasActiveSubscription);
      if (!eligible) {
        return respond(
          problem(
            403,
            'Auth.TenantIneligibleForIntent',
            'This company cannot open the requested application',
            'هذه الشركة غير مؤهلة للتطبيق المطلوب',
          ),
        );
      }
    }

    const previousId = session.id;
    const next: MockSession = {
      id: newId(),
      userId: session.userId,
      stage: SessionStage.Active,
      tenantId: membership.tenantId,
      tenantMembershipId: membership.id,
    };
    store.createSession(next);
    store.revokeSession(previousId);
    store.issueCsrf();
    const redirectUrl = resolveDefaultRedirect(store, membership, intentId);
    return respond(ok({ redirectUrl }, 'Company selected'));
  }

  // Me
  if (method === 'GET' && path === '/auth/me') {
    if (store.consumeSessionExpiredOnMe()) {
      return respond(
        problem(401, 'Auth.SessionExpired', 'Session expired', 'انتهت الجلسة'),
      );
    }
    const session = store.currentSession();
    if (!session) {
      return respond(problem(401, 'Auth.NotAuthenticated', 'Not authenticated', 'غير مصادق'));
    }
    const appKey = req.headers.get(HTTP_HEADERS.application) ?? 'identity';
    if (!appKey) {
      return respond(
        problem(400, 'Application.HeaderMissing', 'Application header missing', 'رأس التطبيق مفقود'),
      );
    }
    const user = store.getUser(session.userId);
    if (!user) {
      return respond(problem(401, 'Auth.NotAuthenticated', 'Not authenticated', 'غير مصادق'));
    }

    if (session.stage === SessionStage.Selection) {
      const app = store.getApplication('identity')!;
      return respond(
        ok({
          user: {
            id: user.id,
            email: user.email,
            nameAr: user.nameAr,
            nameEn: user.nameEn,
            status: 'Active',
          },
          currentApplication: {
            key: app.key,
            nameAr: app.nameAr,
            nameEn: app.nameEn,
            baseUrl: app.baseUrl,
          },
          currentTenant: null,
          teams: [],
          roles: [],
          permissions: [],
          availableApplications: [],
        }, 'User information retrieved'),
      );
    }

    const membership = store.getMembership(session.tenantMembershipId!);
    const tenant = store.getTenant(session.tenantId!);
    if (!membership || !tenant) {
      return respond(
        problem(401, 'Tenant.SessionMembershipNotFound', 'Session membership missing', 'العضوية غير موجودة'),
      );
    }

    const roles = store.getRolesForMembership(membership, appKey);
    const permissions = [...new Set(roles.flatMap((r) => r.permissionKeys))];
    const availableApplications = store
      .getApplications()
      .filter((a) => a.isActive)
      .filter((a) => {
        if (a.key === 'identity') {
          return true;
        }
        return (
          membership.hasActiveSubscription &&
          store.getRolesForMembership(membership, a.key).length > 0
        );
      })
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((a) => ({
        key: a.key,
        nameAr: a.nameAr,
        nameEn: a.nameEn,
        baseUrl: a.baseUrl,
        isCurrent: a.key === appKey,
        isEligible: true,
        isActive: true,
      }));

    const currentApp = store.getApplication(appKey) ?? store.getApplication('identity')!;

    return respond(
      ok({
        user: {
          id: user.id,
          email: user.email,
          nameAr: user.nameAr,
          nameEn: user.nameEn,
          status: 'Active',
        },
        currentApplication: {
          key: currentApp.key,
          nameAr: currentApp.nameAr,
          nameEn: currentApp.nameEn,
          baseUrl: currentApp.baseUrl,
        },
        currentTenant: {
          tenantId: tenant.id,
          tenantMembershipId: membership.id,
          nameAr: tenant.nameAr,
          nameEn: tenant.nameEn,
          jobTitle: membership.jobTitle,
          isPrimary: membership.isPrimary,
          isOwner: membership.isOwner,
          tenantStatus: tenant.status,
        },
        teams: [],
        roles: roles.map((r) => ({
          id: r.id,
          code: r.code,
          nameAr: r.nameAr,
          nameEn: r.nameEn,
        })),
        permissions,
        availableApplications,
      }, 'User information retrieved'),
    );
  }

  // Logout all
  if (method === 'POST' && path === '/auth/logout-all') {
    const session = store.currentSession();
    if (session) {
      store.revokeAllForUser(session.userId);
    }
    return respond(ok(null, 'Logged out'));
  }

  if (method === 'POST' && path === '/auth/logout') {
    const session = store.currentSession();
    if (session) {
      store.revokeSession(session.id);
    }
    return respond(ok(null, 'Logged out'));
  }

  // Register
  if (method === 'POST' && path === '/tenants/register') {
    const body = req.body as {
      arabicCompanyName?: string;
      englishCompanyName?: string;
      managerEmail: string;
      firstName: string;
      lastName: string;
    };
    const existing = store.getUserByEmail(body.managerEmail);
    const tenantId = newId();
    const roleId = newId();
    const membershipId = newId();

    if (existing && existing.password) {
      store.addTenant({
        id: tenantId,
        nameAr: body.arabicCompanyName || 'شركة جديدة',
        nameEn: body.englishCompanyName || 'New Company',
        status: TenantStatus.Onboarding,
        managerUserId: existing.id,
      });
      store.addRole({
        id: roleId,
        tenantId,
        applicationKey: 'identity',
        code: 'identity-owner',
        nameAr: 'مالك الهوية',
        nameEn: 'Identity Owner',
        permissionKeys: [
          'identity.users.create',
          'identity.users.read',
          'identity.roles.read',
        ],
      });
      store.addMembership({
        id: membershipId,
        userId: existing.id,
        tenantId,
        status: MembershipStatus.Active,
        isOwner: true,
        isPrimary: false,
        jobTitle: null,
        roleIds: [roleId],
        hasActiveSubscription: false,
      });
      return respond(
        ok(
          {
            tenantId,
            userId: existing.id,
            isNewUser: false,
            emailAlreadyRegistered: true,
            requiresPasswordSetup: false,
            messageKey: 'Identity.EmailAlreadyRegistered.LoginWithExistingCredentials',
          },
          'Company registered successfully',
          201,
        ),
      );
    }

    const userId = existing?.id ?? newId();
    if (!existing) {
      store.addUser({
        id: userId,
        email: body.managerEmail,
        password: null,
        nameAr: `${body.firstName} ${body.lastName}`,
        nameEn: `${body.firstName} ${body.lastName}`,
        firstNameAr: body.firstName,
        lastNameAr: body.lastName,
        firstNameEn: body.firstName,
        lastNameEn: body.lastName,
        status: UserStatus.PendingActivation,
      });
    }

    store.addTenant({
      id: tenantId,
      nameAr: body.arabicCompanyName || 'شركة جديدة',
      nameEn: body.englishCompanyName || 'New Company',
      status: TenantStatus.Onboarding,
      managerUserId: userId,
    });
    store.addRole({
      id: roleId,
      tenantId,
      applicationKey: 'identity',
      code: 'identity-owner',
      nameAr: 'مالك الهوية',
      nameEn: 'Identity Owner',
      permissionKeys: [
        'identity.users.create',
        'identity.users.read',
        'identity.roles.read',
      ],
    });
    store.addMembership({
      id: membershipId,
      userId,
      tenantId,
      status: MembershipStatus.Active,
      isOwner: true,
      isPrimary: true,
      jobTitle: null,
      roleIds: [roleId],
      hasActiveSubscription: false,
    });

    const code = String(Math.floor(1000 + Math.random() * 9000));
    store.storeSetPasswordCode(userId, code);
    store.pushMail({
      to: body.managerEmail,
      subject: 'Set your Brooch password',
      body: `Your 4-digit code is embedded in this link (do not type it). Open the link to set your password.`,
      code,
      userId,
      link: `/set-password?userId=${userId}&code=${code}`,
    });

    return respond(
      ok(
        {
          tenantId,
          userId,
          isNewUser: true,
          emailAlreadyRegistered: false,
          requiresPasswordSetup: true,
          messageKey: null,
        },
        'Company registered successfully',
        201,
      ),
    );
  }

  // Set password
  if (method === 'POST' && path === '/auth/set-password') {
    const body = req.body as {
      userId: string;
      code: string;
      password: string;
      confirmPassword: string;
    };
    if (body.password !== body.confirmPassword) {
      return respond(
        problem(400, 'Identity.Password.PolicyFailed', 'Passwords do not match', 'كلمتا المرور غير متطابقتين'),
      );
    }
    const user = store.getUser(body.userId);
    if (!user) {
      return respond(problem(404, 'Identity.UserNotFound', 'User not found', 'المستخدم غير موجود'));
    }
    if (!store.consumeSetPasswordCode(body.userId, body.code)) {
      return respond(
        problem(
          422,
          'Identity.InvalidSetPasswordCode',
          'Invalid or expired code',
          'الرمز غير صالح',
        ),
      );
    }
    store.updateUser(body.userId, {
      password: body.password,
      status: UserStatus.Active,
    });
    return respond(
      ok({ userId: body.userId, message: 'Password set successfully. You can now log in.' }, 'Password set successfully'),
    );
  }

  // Forgot password
  if (method === 'POST' && path === '/auth/forgot-password') {
    const body = req.body as { email: string };
    const user = store.getUserByEmail(body.email);
    if (user) {
      const token = newId().replace(/-/g, '');
      store.storeResetToken(user.id, token);
      store.pushMail({
        to: user.email,
        subject: 'Reset your Brooch password',
        body: 'Open the link to choose a new password. The token is in the link (not typed).',
        token,
        userId: user.id,
        link: `/reset-password?userId=${user.id}&token=${token}`,
      });
    }
    return respond(ok(null, 'If the email exists, a reset link was sent'));
  }

  if (method === 'POST' && path === '/auth/forgot-password/complete') {
    const body = req.body as {
      userId: string;
      token: string;
      newPassword: string;
      confirmPassword: string;
    };
    if (body.newPassword !== body.confirmPassword) {
      return respond(
        problem(400, 'Identity.Password.PolicyFailed', 'Passwords do not match', 'كلمتا المرور غير متطابقتين'),
      );
    }
    if (!store.consumeResetToken(body.userId, body.token)) {
      return respond(
        problem(400, 'FORGOT_PASSWORD_LINK_INVALID', 'Invalid reset link', 'رابط إعادة التعيين غير صالح'),
      );
    }
    store.updateUser(body.userId, { password: body.newPassword, status: UserStatus.Active });
    return respond(ok(null, 'Password reset successfully'));
  }

  // Login intent
  if (method === 'POST' && path === '/auth/login-intent') {
    const body = req.body as {
      applicationKey: string;
      returnUrl: string;
      action?: string;
    };
    const app = store.getApplication(body.applicationKey);
    if (!app || !app.isActive) {
      return respond(
        ok(
          {
            isValid: false,
            intentId: null,
            applicationKey: null,
            normalizedReturnUrl: null,
            reason: app ? 'inactiveApplication' : 'unknownApplication',
          },
          'Login intent created',
        ),
      );
    }
    let normalized: string;
    try {
      normalized = new URL(body.returnUrl).toString();
      if (!normalized.startsWith(app.baseUrl)) {
        return respond(
          ok(
            {
              isValid: false,
              intentId: null,
              applicationKey: null,
              normalizedReturnUrl: null,
              reason: 'returnUrlNotAllowed',
            },
            'Login intent created',
          ),
        );
      }
    } catch {
      return respond(
        ok(
          {
            isValid: false,
            intentId: null,
            applicationKey: null,
            normalizedReturnUrl: null,
            reason: 'malformedReturnUrl',
          },
          'Login intent created',
        ),
      );
    }
    const intentId = newId().replace(/-/g, '').slice(0, 32);
    store.addIntent({
      id: intentId,
      applicationKey: body.applicationKey,
      returnUrl: normalized,
      state: 'Created',
      resolvedUserId: null,
    });
    return respond(
      ok(
        {
          isValid: true,
          intentId,
          applicationKey: body.applicationKey,
          normalizedReturnUrl: normalized,
          reason: null,
        },
        'Login intent created',
      ),
    );
  }

  // Me profile / companies / sessions / access / permissions
  if (method === 'GET' && path === '/me/companies') {
    const session = store.currentSession();
    if (!session) {
      return respond(problem(401, 'Auth.NotAuthenticated', 'Not authenticated', 'غير مصادق'));
    }
    const rows = store.getActiveMembershipsForUser(session.userId).map((m) => {
      const tenant = store.getTenant(m.tenantId)!;
      return {
        tenantMembershipId: m.id,
        tenantId: m.tenantId,
        companyNameAr: tenant.nameAr,
        companyNameEn: tenant.nameEn,
        tenantMembershipStatus: 'Active',
        isOwner: m.isOwner,
        isPrimary: m.isPrimary,
        jobTitle: m.jobTitle,
        tenantStatus: tenant.status,
        isSelectable: tenant.status === TenantStatus.Active,
        unavailableReason: null,
        isCurrent: m.id === session.tenantMembershipId,
        hasActiveSubscription: m.hasActiveSubscription,
      };
    });
    return respond(ok(rows));
  }

  if (method === 'GET' && path === '/me/profile') {
    const session = store.currentSession();
    const user = session ? store.getUser(session.userId) : null;
    if (!user) {
      return respond(problem(401, 'Auth.NotAuthenticated', 'Not authenticated', 'غير مصادق'));
    }
    return respond(
      ok({
        id: user.id,
        email: user.email,
        firstNameAr: user.firstNameAr,
        lastNameAr: user.lastNameAr,
        firstNameEn: user.firstNameEn,
        lastNameEn: user.lastNameEn,
      }),
    );
  }

  if (method === 'PUT' && path === '/me/profile') {
    const session = store.currentSession();
    if (!session) {
      return respond(problem(401, 'Auth.NotAuthenticated', 'Not authenticated', 'غير مصادق'));
    }
    const body = req.body as {
      firstNameAr: string;
      lastNameAr: string;
      firstNameEn: string;
      lastNameEn: string;
    };
    store.updateUser(session.userId, {
      ...body,
      nameAr: `${body.firstNameAr} ${body.lastNameAr}`,
      nameEn: `${body.firstNameEn} ${body.lastNameEn}`,
    });
    const user = store.getUser(session.userId)!;
    return respond(
      ok({
        id: user.id,
        email: user.email,
        firstNameAr: user.firstNameAr,
        lastNameAr: user.lastNameAr,
        firstNameEn: user.firstNameEn,
        lastNameEn: user.lastNameEn,
      }),
    );
  }

  if (method === 'GET' && path === '/me/sessions') {
    const session = store.currentSession();
    if (!session) {
      return respond(problem(401, 'Auth.NotAuthenticated', 'Not authenticated', 'غير مصادق'));
    }
    return respond(
      ok([
        {
          id: session.id,
          stage: session.stage,
          isCurrent: true,
        },
      ]),
    );
  }

  if (method === 'GET' && path === '/me/access') {
    const session = store.currentSession();
    if (!session?.tenantMembershipId) {
      return respond(problem(401, 'Auth.NotAuthenticated', 'Not authenticated', 'غير مصادق'));
    }
    const membership = store.getMembership(session.tenantMembershipId)!;
    const roles = store.getRolesForMembership(membership, 'identity');
    return respond(
      ok({
        roles: roles.map((r) => ({
          id: r.id,
          code: r.code,
          nameAr: r.nameAr,
          nameEn: r.nameEn,
        })),
        permissions: [...new Set(roles.flatMap((r) => r.permissionKeys))],
      }),
    );
  }

  if (method === 'GET' && path === '/auth/me/permissions') {
    const session = store.currentSession();
    if (!session?.tenantMembershipId) {
      return respond(problem(401, 'Auth.NotAuthenticated', 'Not authenticated', 'غير مصادق'));
    }
    const membership = store.getMembership(session.tenantMembershipId)!;
    const roles = store.getRolesForMembership(membership, 'identity');
    return respond(ok([...new Set(roles.flatMap((r) => r.permissionKeys))]));
  }

  if (method === 'GET' && path === '/applications') {
    return respond(
      ok(
        store.getApplications().map((a) => ({
          key: a.key,
          nameAr: a.nameAr,
          nameEn: a.nameEn,
          baseUrl: a.baseUrl,
          isActive: a.isActive,
        })),
      ),
    );
  }

  if (method === 'GET' && path === '/packages') {
    return respond(
      ok([
        {
          id: 'pkg-starter',
          code: 'starter',
          nameAr: 'الباقة الأساسية',
          nameEn: 'Starter',
          descriptionAr: 'تجربة مجانية',
          descriptionEn: 'Free trial package',
        },
      ]),
    );
  }

  if (method === 'GET' && path === '/tenant') {
    const session = store.currentSession();
    if (!session?.tenantId) {
      return respond(problem(401, 'Auth.NotAuthenticated', 'Not authenticated', 'غير مصادق'));
    }
    const tenant = store.getTenant(session.tenantId)!;
    return respond(
      ok({
        tenantId: tenant.id,
        arabicCompanyName: tenant.nameAr,
        englishCompanyName: tenant.nameEn,
        status: tenant.status,
      }),
    );
  }

  if (method === 'PUT' && path === '/tenant/profile') {
    const session = store.currentSession();
    if (!session?.tenantId) {
      return respond(problem(401, 'Auth.NotAuthenticated', 'Not authenticated', 'غير مصادق'));
    }
    const body = req.body as { arabicCompanyName: string; englishCompanyName: string };
    store.updateTenant(session.tenantId, {
      nameAr: body.arabicCompanyName,
      nameEn: body.englishCompanyName,
    });
    const tenant = store.getTenant(session.tenantId)!;
    return respond(
      ok({
        tenantId: tenant.id,
        arabicCompanyName: tenant.nameAr,
        englishCompanyName: tenant.nameEn,
        status: tenant.status,
      }),
    );
  }

  if (method === 'POST' && path === '/subscriptions/free-trial') {
    const session = store.currentSession();
    if (!session?.tenantId || !session.userId) {
      return respond(problem(401, 'Auth.NotAuthenticated', 'Not authenticated', 'غير مصادق'));
    }
    store.updateTenant(session.tenantId, { status: TenantStatus.Active });
    store.revokeAllForUser(session.userId);
    return respond(ok(null, 'Free trial activated'));
  }

  // Members list / add
  const membersMatch = path.match(/^\/companies\/([^/]+)\/members$/);
  if (membersMatch && method === 'GET') {
    const tenantId = membersMatch[1];
    const rows = store.listMembers(tenantId).map(({ membership, user }) => ({
      tenantMembershipId: membership.id,
      userId: user.id,
      email: user.email,
      nameAr: user.nameAr,
      nameEn: user.nameEn,
      status: 'Active',
      isOwner: membership.isOwner,
      roles: store.getRolesForMembership(membership, 'identity').map((r) => ({
        id: r.id,
        code: r.code,
        nameAr: r.nameAr,
        nameEn: r.nameEn,
      })),
    }));
    return respond(ok(rows));
  }

  if (membersMatch && method === 'POST') {
    const tenantId = membersMatch[1];
    const session = store.currentSession();
    if (!session?.tenantMembershipId) {
      return respond(problem(401, 'Auth.NotAuthenticated', 'Not authenticated', 'غير مصادق'));
    }
    const actor = store.getMembership(session.tenantMembershipId)!;
    const actorRoles = store.getRolesForMembership(actor, 'identity');
    const canCreate = actorRoles.some((r) => r.permissionKeys.includes('identity.users.create'));
    if (!canCreate) {
      return respond(
        problem(403, 'Auth.PermissionDenied', 'Permission denied', 'ليس لديك صلاحية'),
      );
    }
    const body = req.body as {
      email: string;
      arabicName: string;
      englishName: string;
      roleIds?: string[];
    };
    let user = store.getUserByEmail(body.email);
    const isNew = !user;
    if (!user) {
      const userId = newId();
      store.addUser({
        id: userId,
        email: body.email,
        password: null,
        nameAr: body.arabicName,
        nameEn: body.englishName,
        firstNameAr: body.arabicName,
        lastNameAr: '',
        firstNameEn: body.englishName,
        lastNameEn: '',
        status: UserStatus.PendingActivation,
      });
      user = store.getUser(userId)!;
    }
    const membershipId = newId();
    store.addMembership({
      id: membershipId,
      userId: user.id,
      tenantId,
      status: MembershipStatus.Active,
      isOwner: false,
      isPrimary: false,
      jobTitle: null,
      roleIds: body.roleIds ?? [],
      hasActiveSubscription: true,
    });
    let requiresPasswordSetup = false;
    if (!user.password) {
      requiresPasswordSetup = true;
      const code = String(Math.floor(1000 + Math.random() * 9000));
      store.storeSetPasswordCode(user.id, code);
      store.pushMail({
        to: user.email,
        subject: 'You were invited to Brooch',
        body: 'Open the invitation link to set your password. The code is in the link.',
        code,
        userId: user.id,
        link: `/set-password?userId=${user.id}&code=${code}`,
      });
    }
    return respond(
      ok(
        {
          tenantMembershipId: membershipId,
          userId: user.id,
          tenantId,
          email: user.email,
          userAlreadyExisted: !isNew,
          requiresPasswordSetup,
          emailType: requiresPasswordSetup ? 'SetPassword' : 'WelcomeBack',
          isNewUser: isNew,
          tenantMembershipStatus: 'Active',
        },
        'Member added successfully',
        201,
      ),
    );
  }

  if (method === 'GET' && path === '/permissions') {
    return respond(
      ok([
        {
          key: 'identity.users.create',
          nameAr: 'إنشاء مستخدمين',
          nameEn: 'Create users',
          applicationKey: 'identity',
          group: 'users',
        },
        {
          key: 'identity.users.read',
          nameAr: 'قراءة المستخدمين',
          nameEn: 'Read users',
          applicationKey: 'identity',
          group: 'users',
        },
        {
          key: 'identity.roles.read',
          nameAr: 'قراءة الأدوار',
          nameEn: 'Read roles',
          applicationKey: 'identity',
          group: 'roles',
        },
      ]),
    );
  }

  if (method === 'GET' && path === '/teams' || method === 'GET' && path === '/teams/tree') {
    const session = store.currentSession();
    if (!session?.tenantId) {
      return respond(problem(401, 'Auth.NotAuthenticated', 'Not authenticated', 'غير مصادق'));
    }
    const rows = store.listTeams(session.tenantId).map((t) => ({
      id: t.id,
      nameAr: t.nameAr,
      nameEn: t.nameEn,
      parentId: t.parentId,
      children: [] as unknown[],
    }));
    return respond(ok(rows));
  }

  const rolesMatch = path.match(/^\/companies\/([^/]+)\/roles$/);
  if (rolesMatch && method === 'GET') {
    const tenantId = rolesMatch[1];
    return respond(
      ok(
        store.listRolesForTenant(tenantId).map((r) => ({
          id: r.id,
          code: r.code,
          nameAr: r.nameAr,
          nameEn: r.nameEn,
          applicationKey: r.applicationKey,
          permissionKeys: r.permissionKeys,
        })),
      ),
    );
  }

  const memberRolesMatch = path.match(/^\/companies\/([^/]+)\/members\/([^/]+)\/roles$/);
  if (memberRolesMatch && method === 'PUT') {
    const membershipId = memberRolesMatch[2];
    const body = req.body as { roleIds?: string[] };
    store.updateMembership(membershipId, { roleIds: body.roleIds ?? [] });
    return respond(ok(null, 'Roles updated'));
  }

  return respond(
    problem(404, 'Mock.NotImplemented', `Mock route not implemented: ${method} ${path}`, `المسار غير مدعوم: ${method} ${path}`),
  );
};
