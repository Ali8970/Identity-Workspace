import { Page, Route } from '@playwright/test';

export type SessionMode = 'anonymous' | 'selection' | 'onboarding' | 'active';

const TENANT = '11111111-1111-4111-8111-111111111111';
const MEMBERSHIP = '22222222-2222-4222-8222-222222222222';
const USER = '33333333-3333-4333-8333-333333333333';
const ROLE = '44444444-4444-4444-8444-444444444444';
const TEAM = '55555555-5555-4555-8555-555555555555';
const PACKAGE_FREE = '66666666-6666-4666-8666-666666666666';
const PACKAGE_PAID = '77777777-7777-4777-8777-777777777777';

const PERMISSIONS = [
  'identity.memberships.read',
  'identity.memberships.manage',
  'identity.roles.read',
  'identity.roles.manage',
  'identity.permissions.read',
  'tenant.teams.read',
  'tenant.teams.manage',
];

function envelope(data: unknown) {
  return { statusCode: 200, message: 'OK', data };
}

function company(overrides: Record<string, unknown> = {}) {
  return {
    tenantMembershipId: MEMBERSHIP,
    tenantId: TENANT,
    code: 'BRC',
    companyNameAr: 'استوديو بروش',
    companyNameEn: 'Brooch Studio',
    tenantMembershipStatus: 'Active',
    isOwner: true,
    isPrimary: true,
    jobTitle: 'Owner',
    tenantStatus: 'Active',
    isSelectable: true,
    unavailableReason: null,
    isCurrent: true,
    ...overrides,
  };
}

function me(mode: SessionMode) {
  const active = mode === 'active' || mode === 'onboarding';
  return {
    user: {
      id: USER,
      email: 'owner@brooch.example',
      nameAr: 'ليان الحسن',
      nameEn: 'Layan Alhassan',
      status: 'Active',
    },
    currentApplication: { key: 'account', nameAr: 'الحساب', nameEn: 'Account' },
    currentTenant: active
      ? {
          tenantId: TENANT,
          tenantMembershipId: MEMBERSHIP,
          nameAr: 'استوديو بروش',
          nameEn: 'Brooch Studio',
          jobTitle: 'Owner',
          isPrimary: true,
          isOwner: true,
        }
      : null,
    teams: active ? [{ teamId: TEAM, name: 'Platform', isPrimary: true }] : [],
    roles: active
      ? [{ id: ROLE, code: 'owner', nameAr: 'المالك', nameEn: 'Owner' }]
      : [],
    permissions: mode === 'active' ? PERMISSIONS : [],
    availableApplications: active
      ? [
          {
            key: 'account',
            nameAr: 'الحساب',
            nameEn: 'Account',
            url: 'https://account.brooch.example',
            isCurrent: true,
          },
          {
            key: 'crm',
            nameAr: 'إدارة العملاء',
            nameEn: 'CRM',
            url: 'https://crm.brooch.example',
            isCurrent: false,
          },
          {
            key: 'hr',
            nameAr: 'الموارد البشرية',
            nameEn: 'HR',
            url: 'https://hr.brooch.example',
            isCurrent: false,
          },
        ]
      : [],
  };
}

function companies(mode: SessionMode) {
  if (mode === 'anonymous') {
    return [];
  }
  if (mode === 'selection') {
    return [
      company({ isCurrent: false, tenantStatus: 'Active' }),
      company({
        tenantMembershipId: '22222222-2222-4222-8222-222222222223',
        tenantId: '11111111-1111-4111-8111-111111111112',
        code: 'NRD',
        companyNameAr: 'شمال للتجارة',
        companyNameEn: 'Northwind Trade',
        isPrimary: false,
        isCurrent: false,
        jobTitle: 'Admin',
      }),
    ];
  }
  if (mode === 'onboarding') {
    return [company({ tenantStatus: 'Onboarding', isCurrent: true })];
  }
  return [
    company(),
    company({
      tenantMembershipId: '22222222-2222-4222-8222-222222222223',
      tenantId: '11111111-1111-4111-8111-111111111112',
      code: 'NRD',
      companyNameAr: 'شمال للتجارة',
      companyNameEn: 'Northwind Trade',
      isPrimary: false,
      isOwner: false,
      isCurrent: false,
      jobTitle: 'Admin',
    }),
  ];
}

const members = [
  {
    tenantMembershipId: MEMBERSHIP,
    userId: USER,
    email: 'owner@brooch.example',
    arabicName: 'ليان الحسن',
    englishName: 'Layan Alhassan',
    tenantMembershipStatus: 'Active',
    userStatus: 'Active',
    isOwner: true,
    isPrimary: true,
    jobTitle: 'Owner',
    roles: [{ roleId: ROLE, code: 'owner', nameAr: 'المالك', nameEn: 'Owner' }],
    applicationKeys: ['account', 'crm'],
  },
  {
    tenantMembershipId: '22222222-2222-4222-8222-222222222224',
    userId: '33333333-3333-4333-8333-333333333334',
    email: 'sara@brooch.example',
    arabicName: 'سارة قحطاني',
    englishName: 'Sara Alqahtani',
    tenantMembershipStatus: 'Active',
    userStatus: 'Active',
    isOwner: false,
    isPrimary: false,
    jobTitle: 'Recruiter',
    roles: [{ roleId: ROLE, code: 'member', nameAr: 'عضو', nameEn: 'Member' }],
    applicationKeys: ['hr'],
  },
];

const roles = [
  {
    id: ROLE,
    tenantId: TENANT,
    applicationKey: 'account',
    code: 'owner',
    nameAr: 'المالك',
    nameEn: 'Owner',
    description: 'Full access to Account',
    isSystem: true,
    isOwnerRole: true,
    isActive: true,
    permissionKeys: PERMISSIONS,
  },
  {
    id: '44444444-4444-4444-8444-444444444445',
    tenantId: TENANT,
    applicationKey: 'crm',
    code: 'crm-agent',
    nameAr: 'وكيل',
    nameEn: 'Agent',
    description: 'Works the pipeline',
    isSystem: false,
    isOwnerRole: false,
    isActive: true,
    permissionKeys: ['crm.contacts.read'],
  },
];

const permissions = [
  {
    key: 'identity.memberships.read',
    module: 'identity',
    resource: 'memberships',
    action: 'read',
    nameAr: 'عرض الأعضاء',
    nameEn: 'View members',
    description: null,
    sortOrder: 1,
    isActive: true,
    applicationKeys: ['account'],
  },
  {
    key: 'identity.roles.manage',
    module: 'identity',
    resource: 'roles',
    action: 'manage',
    nameAr: 'إدارة الأدوار',
    nameEn: 'Manage roles',
    description: null,
    sortOrder: 2,
    isActive: true,
    applicationKeys: ['account'],
  },
  {
    key: 'crm.contacts.read',
    module: 'crm',
    resource: 'contacts',
    action: 'read',
    nameAr: 'عرض جهات الاتصال',
    nameEn: 'View contacts',
    description: null,
    sortOrder: 3,
    isActive: true,
    applicationKeys: ['crm'],
  },
];

const teamTree = [
  {
    id: TEAM,
    name: 'Platform',
    applicationKey: 'account',
    kind: 'Application',
    managerTenantMembershipId: MEMBERSHIP,
    isMissingManager: false,
    memberCount: 2,
    children: [
      {
        id: '55555555-5555-4555-8555-555555555556',
        name: 'Support',
        applicationKey: 'account',
        kind: 'Team',
        managerTenantMembershipId: null,
        isMissingManager: true,
        memberCount: 1,
        children: [],
      },
    ],
  },
];

const teamList = [
  {
    id: TEAM,
    tenantId: TENANT,
    name: 'Platform',
    description: 'Account application root',
    applicationKey: 'account',
    kind: 'Application',
    parentTeamId: null,
    managerTenantMembershipId: MEMBERSHIP,
    isMissingManager: false,
    status: 'Active',
    memberCount: 2,
    version: 1,
  },
];

function packages() {
  return [
    {
      packageId: PACKAGE_FREE,
      code: 'starter',
      nameAr: 'البداية',
      nameEn: 'Starter',
      descriptionAr: 'جرّب بروش بدون بطاقة',
      descriptionEn: 'Try Brooch with no card',
      price: 0,
      currency: 'SAR',
      billingPeriod: 'Month',
      durationMonths: 1,
      isFree: true,
      requiresPayment: false,
      isTrialAvailable: true,
      trialPeriodDays: 14,
      displayOrder: 1,
      includedApplications: ['account'],
      features: [
        { code: 'members', nameAr: 'الأعضاء', nameEn: 'Members', isEnabled: true, limit: 5 },
      ],
      limits: { members: 5 },
      isAvailable: true,
      disabledReason: null,
    },
    {
      packageId: PACKAGE_PAID,
      code: 'growth',
      nameAr: 'النمو',
      nameEn: 'Growth',
      descriptionAr: 'للفرق التي تحتاج إدارة العملاء',
      descriptionEn: 'For teams that need CRM',
      price: 199,
      currency: 'SAR',
      billingPeriod: 'Month',
      durationMonths: 1,
      isFree: false,
      requiresPayment: true,
      isTrialAvailable: false,
      trialPeriodDays: null,
      displayOrder: 2,
      includedApplications: ['account', 'crm'],
      features: [
        { code: 'members', nameAr: 'الأعضاء', nameEn: 'Members', isEnabled: true, limit: 25 },
      ],
      limits: { members: 25 },
      isAvailable: true,
      disabledReason: null,
    },
  ];
}

function operation(id: string) {
  const base = {
    operationId: id,
    requiresPayment: true,
    subscriptionStatus: null,
    redirectUrl: null,
    targetPackageId: PACKAGE_PAID,
    amount: 199,
    currency: 'SAR',
    subscriptionId: null,
    failureCode: null,
    createdAt: '2026-09-22T10:00:00.000Z',
    expiresAt: '2026-09-23T12:00:00.000Z',
    completedAt: null,
  };
  switch (id) {
    case 'op-done':
      return {
        ...base,
        status: 'Completed',
        paymentState: 'Paid',
        canRetryPayment: false,
        provisioningStatus: 'Succeeded',
        subscriptionStatus: 'Active',
        subscriptionId: '88888888-8888-4888-8888-888888888888',
        completedAt: '2026-09-22T11:00:00.000Z',
      };
    case 'op-failed':
      return {
        ...base,
        status: 'PaymentFailed',
        paymentState: 'Failed',
        canRetryPayment: true,
        provisioningStatus: null,
        failureCode: 'CardDeclined',
      };
    case 'op-processing':
      return {
        ...base,
        status: 'PaymentConfirmed',
        paymentState: 'Paid',
        canRetryPayment: false,
        provisioningStatus: 'Running',
      };
    case 'op-return':
      return {
        ...base,
        status: 'PendingPayment',
        paymentState: null,
        canRetryPayment: false,
        provisioningStatus: null,
      };
    default:
      return {
        ...base,
        status: 'PendingPayment',
        paymentState: 'Pending',
        canRetryPayment: true,
        provisioningStatus: null,
      };
  }
}

function pathOf(url: string): string {
  const parsed = new URL(url);
  return parsed.pathname.replace(/\/$/, '');
}

async function fulfill(route: Route, status: number, body: unknown): Promise<void> {
  const origin = route.request().headers()['origin'] ?? 'http://127.0.0.1:4310';
  await route.fulfill({
    status,
    contentType: 'application/json',
    headers: {
      'access-control-allow-origin': origin,
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    },
    body: JSON.stringify(body),
  });
}

/** Fulfills every staging API call so screenshots never depend on a live session. */
export async function installApiMocks(page: Page, mode: SessionMode): Promise<void> {
  await page.route('https://stg.api.brooch.sa/**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await fulfill(route, 204, {});
      return;
    }

    const path = pathOf(request.url());

    if (path.endsWith('/auth/csrf')) {
      await fulfill(route, 200, { token: 'visual-csrf-token' });
      return;
    }

    if (mode === 'anonymous' && (path.endsWith('/me') || path.endsWith('/me/companies'))) {
      await fulfill(route, 401, {
        status: 401,
        code: 'Auth.NotAuthenticated',
        message: { en: 'Not signed in', ar: 'غير مسجل الدخول' },
      });
      return;
    }

    if (path.endsWith('/me')) {
      await fulfill(route, 200, envelope(me(mode)));
      return;
    }
    if (path.endsWith('/me/companies')) {
      await fulfill(route, 200, envelope(companies(mode)));
      return;
    }
    if (path.endsWith('/me/profile')) {
      await fulfill(route, 200, envelope({
        userId: USER,
        displayNameAr: 'ليان الحسن',
        displayNameEn: 'Layan Alhassan',
        email: 'owner@brooch.example',
        identityNumber: null,
        phone: '+966500000000',
        preferredLanguage: 'en',
        accountStatus: 'Active',
        tenantTitles: [
          {
            tenantMembershipId: MEMBERSHIP,
            companyNameAr: 'استوديو بروش',
            companyNameEn: 'Brooch Studio',
            jobTitle: 'Owner',
            displayTitle: 'Owner',
          },
        ],
      }));
      return;
    }
    if (path.endsWith('/me/access')) {
      await fulfill(route, 200, envelope({
        isOwner: true,
        roles: [
          {
            id: ROLE,
            code: 'owner',
            nameAr: 'المالك',
            nameEn: 'Owner',
            description: null,
            isSystem: true,
            application: { id: 'account', code: 'account', nameAr: 'الحساب', nameEn: 'Account' },
            permissionKeys: PERMISSIONS,
          },
        ],
        teams: [
          {
            id: TEAM,
            name: 'Platform',
            parentTeamId: null,
            parentTeamName: null,
            isManager: true,
          },
        ],
        summary: { rolesCount: 1, permissionsCount: PERMISSIONS.length, teamsCount: 1 },
      }));
      return;
    }
    if (path.endsWith('/me/sessions')) {
      await fulfill(route, 200, envelope([
        {
          sessionRef: 'sess-current',
          stage: 'Active',
          isCurrent: true,
          userAgent: 'Chrome',
          ip: '10.0.0.8',
          issuedAt: '2026-09-22T08:00:00.000Z',
          lastSeenAt: '2026-09-22T11:30:00.000Z',
          absoluteExpiresAt: '2026-09-29T08:00:00.000Z',
        },
      ]));
      return;
    }
    if (path.endsWith('/memberships')) {
      await fulfill(route, 200, envelope(members));
      return;
    }
    if (path.endsWith('/roles') || path.includes('/roles?')) {
      await fulfill(route, 200, envelope(roles));
      return;
    }
    if (path.endsWith('/permissions')) {
      await fulfill(route, 200, envelope(permissions));
      return;
    }
    if (path.endsWith('/teams/tree')) {
      await fulfill(route, 200, envelope(teamTree));
      return;
    }
    if (path.endsWith('/teams/missing-manager')) {
      await fulfill(route, 200, envelope([]));
      return;
    }
    if (path.endsWith('/teams')) {
      await fulfill(route, 200, envelope(teamList));
      return;
    }
    if (path.endsWith('/tenant')) {
      await fulfill(route, 200, envelope({
        tenantId: TENANT,
        code: 'BRC',
        email: 'owner@brooch.example',
        status: mode === 'onboarding' ? 'Onboarding' : 'Active',
        onboardingState: mode === 'onboarding' ? 'Registered' : 'Completed',
        onboardingCompleted: mode !== 'onboarding',
        companyNameAr: 'استوديو بروش',
        companyNameEn: 'Brooch Studio',
        phone: '+966500000000',
        createdAt: '2026-09-01T00:00:00.000Z',
        emailVerifiedAt: '2026-09-01T00:00:00.000Z',
        activatedAt: null,
        onboardingCompletedAt: null,
      }));
      return;
    }
    if (path.endsWith('/subscriptions/available-packages')) {
      await fulfill(route, 200, envelope(packages()));
      return;
    }
    if (path.endsWith('/subscriptions/current')) {
      await fulfill(route, 200, envelope({
        subscription: null,
        hasActiveSubscription: false,
        pendingOperation: null,
        pendingPayment: null,
      }));
      return;
    }
    const operationMatch = path.match(/\/subscription-operations\/([^/]+)$/);
    if (operationMatch) {
      await fulfill(route, 200, envelope(operation(operationMatch[1])));
      return;
    }

    await fulfill(route, 200, envelope([]));
  });
}
