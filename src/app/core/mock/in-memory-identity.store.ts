import { Service, computed, signal } from '@angular/core';
import {
  MembershipStatus,
  SessionStage,
  TenantStatus,
  UserStatus,
} from '../../enums/domain.enums';

export interface MockUser {
  id: string;
  email: string;
  password: string | null;
  nameAr: string;
  nameEn: string;
  firstNameAr: string;
  lastNameAr: string;
  firstNameEn: string;
  lastNameEn: string;
  status: UserStatus;
}

export interface MockTenant {
  id: string;
  nameAr: string;
  nameEn: string;
  status: TenantStatus;
  managerUserId: string;
}

export interface MockMembership {
  id: string;
  userId: string;
  tenantId: string;
  status: MembershipStatus;
  isOwner: boolean;
  isPrimary: boolean;
  jobTitle: string | null;
  roleIds: string[];
  hasActiveSubscription: boolean;
}

export interface MockRole {
  id: string;
  tenantId: string;
  applicationKey: string;
  code: string;
  nameAr: string;
  nameEn: string;
  permissionKeys: string[];
}

export interface MockApplication {
  key: string;
  nameAr: string;
  nameEn: string;
  baseUrl: string;
  isActive: boolean;
  sortOrder: number;
}

export interface MockSession {
  id: string;
  userId: string;
  stage: SessionStage.Selection | SessionStage.Active;
  tenantId: string | null;
  tenantMembershipId: string | null;
}

export interface MockIntent {
  id: string;
  applicationKey: string;
  returnUrl: string;
  state: 'Created' | 'Completed' | 'Expired' | 'Discarded';
  resolvedUserId: string | null;
}

export interface MockTeam {
  id: string;
  tenantId: string;
  nameAr: string;
  nameEn: string;
  parentId: string | null;
}

export interface MockMailboxItem {
  id: string;
  to: string;
  subject: string;
  body: string;
  code?: string;
  token?: string;
  userId?: string;
  link?: string;
  createdAt: string;
}

export interface MockMember {
  membership: MockMembership;
  user: MockUser;
}

export interface MockFlags {
  csrfFailOnce: boolean;
  rateLimitLogin: boolean;
  sessionExpiredOnMe: boolean;
}

const uid = () => crypto.randomUUID();

const MOCK_ORIGIN =
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200';

const MOCK_STORE_KEY = 'brooch.identity.mock.store.v1';

interface MockSnapshot {
  scenario: string;
  users: MockUser[];
  tenants: MockTenant[];
  memberships: MockMembership[];
  roles: MockRole[];
  applications: MockApplication[];
  sessions: MockSession[];
  intents: MockIntent[];
  teams: MockTeam[];
  setPasswordCodes: Record<string, string>;
  resetTokens: Record<string, string>;
  csrfToken: string | null;
  currentSessionId: string | null;
  mailbox: MockMailboxItem[];
  flags: MockFlags;
}

@Service()
export class InMemoryIdentityStore {
  private readonly users = signal<MockUser[]>([]);
  private readonly tenants = signal<MockTenant[]>([]);
  private readonly memberships = signal<MockMembership[]>([]);
  private readonly roles = signal<MockRole[]>([]);
  private readonly applications = signal<MockApplication[]>([]);
  private readonly sessions = signal<MockSession[]>([]);
  private readonly intents = signal<MockIntent[]>([]);
  private readonly teams = signal<MockTeam[]>([]);
  private readonly setPasswordCodes = signal<Record<string, string>>({});
  private readonly resetTokens = signal<Record<string, string>>({});
  private readonly csrfToken = signal<string | null>(null);
  private readonly currentSessionId = signal<string | null>(null);
  private readonly mailbox = signal<MockMailboxItem[]>([]);
  private readonly scenario = signal<string>('login-single-multi-app');
  private readonly flags = signal<MockFlags>({
    csrfFailOnce: false,
    rateLimitLogin: false,
    sessionExpiredOnMe: false,
  });
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  readonly mailboxItems = this.mailbox.asReadonly();
  readonly activeScenario = this.scenario.asReadonly();
  readonly sessionId = this.currentSessionId.asReadonly();
  readonly currentSession = computed(() => {
    const id = this.currentSessionId();
    return this.sessions().find((s) => s.id === id) ?? null;
  });

  constructor() {
    if (!this.hydrate()) {
      this.seedDefault();
      this.applyScenario(this.scenario());
      this.persist();
    }
  }

  resetAndSeed(scenario: string): void {
    this.scenario.set(scenario);
    this.users.set([]);
    this.tenants.set([]);
    this.memberships.set([]);
    this.roles.set([]);
    this.applications.set([]);
    this.sessions.set([]);
    this.intents.set([]);
    this.teams.set([]);
    this.setPasswordCodes.set({});
    this.resetTokens.set({});
    this.csrfToken.set(null);
    this.currentSessionId.set(null);
    this.mailbox.set([]);
    this.flags.set({
      csrfFailOnce: false,
      rateLimitLogin: false,
      sessionExpiredOnMe: false,
    });
    this.seedDefault();
    this.applyScenario(scenario);
    this.persist();
  }

  private hydrate(): boolean {
    if (typeof sessionStorage === 'undefined') {
      return false;
    }
    try {
      const raw = sessionStorage.getItem(MOCK_STORE_KEY);
      if (!raw) {
        return false;
      }
      const snap = JSON.parse(raw) as MockSnapshot;
      this.scenario.set(snap.scenario || 'login-single-multi-app');
      this.users.set(snap.users ?? []);
      this.tenants.set(snap.tenants ?? []);
      this.memberships.set(snap.memberships ?? []);
      this.roles.set(snap.roles ?? []);
      this.applications.set(snap.applications ?? []);
      this.sessions.set(snap.sessions ?? []);
      this.intents.set(snap.intents ?? []);
      this.teams.set(snap.teams ?? []);
      this.setPasswordCodes.set(snap.setPasswordCodes ?? {});
      this.resetTokens.set(snap.resetTokens ?? {});
      this.csrfToken.set(snap.csrfToken ?? null);
      this.currentSessionId.set(snap.currentSessionId ?? null);
      this.mailbox.set(snap.mailbox ?? []);
      this.flags.set(
        snap.flags ?? {
          csrfFailOnce: false,
          rateLimitLogin: false,
          sessionExpiredOnMe: false,
        },
      );
      return this.users().length > 0 || this.mailbox().length > 0;
    } catch {
      return false;
    }
  }

  private persist(): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
    }
    this.persistTimer = setTimeout(() => {
      const snap: MockSnapshot = {
        scenario: this.scenario(),
        users: this.users(),
        tenants: this.tenants(),
        memberships: this.memberships(),
        roles: this.roles(),
        applications: this.applications(),
        sessions: this.sessions(),
        intents: this.intents(),
        teams: this.teams(),
        setPasswordCodes: this.setPasswordCodes(),
        resetTokens: this.resetTokens(),
        csrfToken: this.csrfToken(),
        currentSessionId: this.currentSessionId(),
        mailbox: this.mailbox(),
        flags: this.flags(),
      };
      sessionStorage.setItem(MOCK_STORE_KEY, JSON.stringify(snap));
    }, 0);
  }

  consumeCsrfFailOnce(): boolean {
    if (!this.flags().csrfFailOnce) {
      return false;
    }
    this.flags.update((f) => ({ ...f, csrfFailOnce: false }));
    this.persist();
    return true;
  }

  shouldRateLimitLogin(): boolean {
    return this.flags().rateLimitLogin;
  }

  consumeSessionExpiredOnMe(): boolean {
    if (!this.flags().sessionExpiredOnMe) {
      return false;
    }
    this.flags.update((f) => ({ ...f, sessionExpiredOnMe: false }));
    this.currentSessionId.set(null);
    this.persist();
    return true;
  }

  issueCsrf(): string {
    const token = `csrf-${uid().slice(0, 8)}`;
    this.csrfToken.set(token);
    this.persist();
    return token;
  }

  validateCsrf(token: string | null): boolean {
    return !!token && token === this.csrfToken();
  }

  getUserByEmail(email: string): MockUser | undefined {
    return this.users().find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  getUser(id: string): MockUser | undefined {
    return this.users().find((u) => u.id === id);
  }

  getTenant(id: string): MockTenant | undefined {
    return this.tenants().find((t) => t.id === id);
  }

  getMembership(id: string): MockMembership | undefined {
    return this.memberships().find((m) => m.id === id);
  }

  getMembershipsForUser(userId: string): MockMembership[] {
    return this.memberships().filter((m) => m.userId === userId);
  }

  getActiveMembershipsForUser(userId: string): MockMembership[] {
    return this.memberships().filter(
      (m) => m.userId === userId && m.status === MembershipStatus.Active,
    );
  }

  getRolesForMembership(membership: MockMembership, applicationKey: string): MockRole[] {
    return this.roles().filter(
      (r) =>
        r.tenantId === membership.tenantId &&
        r.applicationKey === applicationKey &&
        membership.roleIds.includes(r.id),
    );
  }

  getApplications(): MockApplication[] {
    return this.applications();
  }

  getApplication(key: string): MockApplication | undefined {
    return this.applications().find((a) => a.key === key);
  }

  createSession(session: MockSession): void {
    this.sessions.update((list) => [...list, session]);
    this.currentSessionId.set(session.id);
    this.persist();
  }

  revokeSession(id: string): void {
    this.sessions.update((list) => list.filter((s) => s.id !== id));
    if (this.currentSessionId() === id) {
      this.currentSessionId.set(null);
    }
    this.persist();
  }

  revokeAllForUser(userId: string): void {
    this.sessions.update((list) => list.filter((s) => s.userId !== userId));
    this.currentSessionId.set(null);
    this.persist();
  }

  setCurrentSession(id: string | null): void {
    this.currentSessionId.set(id);
    this.persist();
  }

  updateSession(id: string, patch: Partial<MockSession>): void {
    this.sessions.update((list) =>
      list.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
    this.persist();
  }

  addUser(user: MockUser): void {
    this.users.update((list) => [...list, user]);
    this.persist();
  }

  updateUser(id: string, patch: Partial<MockUser>): void {
    this.users.update((list) => list.map((u) => (u.id === id ? { ...u, ...patch } : u)));
    this.persist();
  }

  addTenant(tenant: MockTenant): void {
    this.tenants.update((list) => [...list, tenant]);
    this.persist();
  }

  updateTenant(id: string, patch: Partial<MockTenant>): void {
    this.tenants.update((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    this.persist();
  }

  addMembership(membership: MockMembership): void {
    this.memberships.update((list) => [...list, membership]);
    this.persist();
  }

  updateMembership(id: string, patch: Partial<MockMembership>): void {
    this.memberships.update((list) =>
      list.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    );
    this.persist();
  }

  addRole(role: MockRole): void {
    this.roles.update((list) => [...list, role]);
    this.persist();
  }

  addTeam(team: MockTeam): void {
    this.teams.update((list) => [...list, team]);
    this.persist();
  }

  listTeams(tenantId: string): MockTeam[] {
    return this.teams().filter((t) => t.tenantId === tenantId);
  }

  storeSetPasswordCode(userId: string, code: string): void {
    this.setPasswordCodes.update((map) => ({ ...map, [userId]: code }));
    this.persist();
  }

  consumeSetPasswordCode(userId: string, code: string): boolean {
    const current = this.setPasswordCodes()[userId];
    if (!current || current !== code) {
      return false;
    }
    this.setPasswordCodes.update((map) => {
      const next = { ...map };
      delete next[userId];
      return next;
    });
    this.persist();
    return true;
  }

  peekSetPasswordCode(userId: string): string | undefined {
    return this.setPasswordCodes()[userId];
  }

  storeResetToken(userId: string, token: string): void {
    this.resetTokens.update((map) => ({ ...map, [userId]: token }));
    this.persist();
  }

  consumeResetToken(userId: string, token: string): boolean {
    const current = this.resetTokens()[userId];
    if (!current || current !== token) {
      return false;
    }
    this.resetTokens.update((map) => {
      const next = { ...map };
      delete next[userId];
      return next;
    });
    this.persist();
    return true;
  }

  peekResetToken(userId: string): string | undefined {
    return this.resetTokens()[userId];
  }

  addIntent(intent: MockIntent): void {
    this.intents.update((list) => [...list, intent]);
    this.persist();
  }

  getIntent(id: string): MockIntent | undefined {
    return this.intents().find((i) => i.id === id);
  }

  updateIntent(id: string, patch: Partial<MockIntent>): void {
    this.intents.update((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    this.persist();
  }

  createIntentForApp(
    applicationKey: string,
    state: MockIntent['state'] = 'Created',
  ): MockIntent {
    const app = this.getApplication(applicationKey)!;
    const intent: MockIntent = {
      id: uid().replace(/-/g, '').slice(0, 32),
      applicationKey,
      returnUrl: `${app.baseUrl}/`,
      state,
      resolvedUserId: null,
    };
    this.addIntent(intent);
    return intent;
  }

  pushMail(item: Omit<MockMailboxItem, 'id' | 'createdAt'>): void {
    this.mailbox.update((list) => [
      {
        ...item,
        id: uid(),
        createdAt: new Date().toISOString(),
      },
      ...list,
    ]);
    this.persist();
  }

  listMembers(tenantId: string): MockMember[] {
    return this.memberships()
      .filter((m) => m.tenantId === tenantId && m.status !== MembershipStatus.Removed)
      .map((membership) => ({
        membership,
        user: this.getUser(membership.userId)!,
      }))
      .filter((row) => !!row.user);
  }

  listRolesForTenant(tenantId: string): MockRole[] {
    return this.roles().filter((r) => r.tenantId === tenantId);
  }

  private seedDefault(): void {
    this.applications.set([
      {
        key: 'identity',
        nameAr: 'الهوية',
        nameEn: 'Identity',
        baseUrl: MOCK_ORIGIN,
        isActive: true,
        sortOrder: 0,
      },
      {
        key: 'crm',
        nameAr: 'إدارة العملاء',
        nameEn: 'CRM',
        baseUrl: `${MOCK_ORIGIN}/mock-target/crm`,
        isActive: true,
        sortOrder: 1,
      },
      {
        key: 'hr',
        nameAr: 'الموارد البشرية',
        nameEn: 'HR',
        baseUrl: `${MOCK_ORIGIN}/mock-target/hr`,
        isActive: true,
        sortOrder: 2,
      },
    ]);
  }

  private applyScenario(scenario: string): void {
    const ownerId = uid();
    const tenantA = uid();
    const tenantB = uid();
    const memA = uid();
    const memB = uid();
    const roleIdentity = uid();
    const roleCrm = uid();
    const roleHr = uid();
    const roleIdentityReadOnly = uid();

    const owner: MockUser = {
      id: ownerId,
      email: 'owner@brooch.sa',
      password: 'P@ssw0rd!2026',
      nameAr: 'مصطفى عبدالحميد',
      nameEn: 'Mostafa Abdelhamy',
      firstNameAr: 'مصطفى',
      lastNameAr: 'عبدالحميد',
      firstNameEn: 'Mostafa',
      lastNameEn: 'Abdelhamy',
      status: UserStatus.Active,
    };

    this.addUser(owner);

    const fullPerms = [
      'identity.users.create',
      'identity.users.read',
      'identity.roles.read',
      'identity.applications.manage',
    ];
    const readPerms = ['identity.users.read', 'identity.roles.read'];

    this.addRole({
      id: roleIdentity,
      tenantId: tenantA,
      applicationKey: 'identity',
      code: 'identity-owner',
      nameAr: 'مالك الهوية',
      nameEn: 'Identity Owner',
      permissionKeys: fullPerms,
    });
    this.addRole({
      id: roleIdentityReadOnly,
      tenantId: tenantA,
      applicationKey: 'identity',
      code: 'identity-viewer',
      nameAr: 'عارض الهوية',
      nameEn: 'Identity Viewer',
      permissionKeys: readPerms,
    });
    this.addRole({
      id: roleCrm,
      tenantId: tenantA,
      applicationKey: 'crm',
      code: 'crm-owner',
      nameAr: 'مالك CRM',
      nameEn: 'CRM Owner',
      permissionKeys: ['crm.leads.read'],
    });
    this.addRole({
      id: roleHr,
      tenantId: tenantA,
      applicationKey: 'hr',
      code: 'hr-owner',
      nameAr: 'مالك HR',
      nameEn: 'HR Owner',
      permissionKeys: ['hr.employees.read'],
    });

    this.addTenant({
      id: tenantA,
      nameAr: 'بروش للتقنية',
      nameEn: 'Brooch Technologies',
      status: TenantStatus.Active,
      managerUserId: ownerId,
    });

    this.addMembership({
      id: memA,
      userId: ownerId,
      tenantId: tenantA,
      status: MembershipStatus.Active,
      isOwner: true,
      isPrimary: true,
      jobTitle: 'Founder',
      roleIds: [roleIdentity, roleCrm, roleHr],
      hasActiveSubscription: true,
    });

    this.addTeam({
      id: uid(),
      tenantId: tenantA,
      nameAr: 'الإدارة',
      nameEn: 'Leadership',
      parentId: null,
    });

    const addSecondTenant = () => {
      const roleIdentityB = uid();
      this.addRole({
        id: roleIdentityB,
        tenantId: tenantB,
        applicationKey: 'identity',
        code: 'identity-owner',
        nameAr: 'مالك الهوية',
        nameEn: 'Identity Owner',
        permissionKeys: fullPerms,
      });
      this.addTenant({
        id: tenantB,
        nameAr: 'مجموعة النيل العقارية',
        nameEn: 'Nile Property Group',
        status: TenantStatus.Active,
        managerUserId: ownerId,
      });
      this.addMembership({
        id: memB,
        userId: ownerId,
        tenantId: tenantB,
        status: MembershipStatus.Active,
        isOwner: true,
        isPrimary: false,
        jobTitle: null,
        roleIds: [roleIdentityB],
        hasActiveSubscription: false,
      });
      return roleIdentityB;
    };

    const seedInvitee = () => {
      const inviteeId = uid();
      const code = '4821';
      this.addUser({
        id: inviteeId,
        email: 'invitee@brooch.sa',
        password: null,
        nameAr: 'مدعو جديد',
        nameEn: 'New Invitee',
        firstNameAr: 'مدعو',
        lastNameAr: 'جديد',
        firstNameEn: 'New',
        lastNameEn: 'Invitee',
        status: UserStatus.PendingActivation,
      });
      this.addMembership({
        id: uid(),
        userId: inviteeId,
        tenantId: tenantA,
        status: MembershipStatus.Active,
        isOwner: false,
        isPrimary: true,
        jobTitle: null,
        roleIds: [roleIdentityReadOnly],
        hasActiveSubscription: true,
      });
      this.storeSetPasswordCode(inviteeId, code);
      const link = `/set-password?userId=${inviteeId}&code=${code}`;
      this.pushMail({
        to: 'invitee@brooch.sa',
        subject: 'You were invited to Brooch',
        body: `Accept invitation and set password: ${link}`,
        code,
        userId: inviteeId,
        link,
      });
      return inviteeId;
    };

    switch (scenario) {
      case 'login-single-one-app':
        this.updateMembership(memA, { roleIds: [roleIdentity, roleCrm] });
        this.applications.update((list) =>
          list.map((a) => (a.key === 'hr' ? { ...a, isActive: false } : a)),
        );
        this.pushMail({
          to: owner.email,
          subject: 'Journey: login-single-one-app',
          body: 'Sign in → Active session redirects to CRM mock target (single eligible app).',
        });
        break;

      case 'login-single-multi-app':
      case 'switch-application':
      case 'logout':
      case 'logout-all':
      case 'switch-company':
        if (scenario === 'switch-company') {
          addSecondTenant();
        }
        this.pushMail({
          to: owner.email,
          subject: `Journey: ${scenario}`,
          body: `Sign in with ${owner.email} / P@ssw0rd!2026`,
        });
        break;

      case 'login-multi-tenant':
      case 'intent-multi-tenant':
        addSecondTenant();
        if (scenario === 'intent-multi-tenant') {
          const intent = this.createIntentForApp('crm');
          this.pushMail({
            to: owner.email,
            subject: 'CRM login intent (multi-tenant)',
            body: `Open /login?intentId=${intent.id} then pick a company.`,
            link: `/login?intentId=${intent.id}`,
          });
        } else {
          this.pushMail({
            to: owner.email,
            subject: 'Journey: login-multi-tenant',
            body: 'Sign in → Select Company picker.',
          });
        }
        break;

      case 'login-intent': {
        const intent = this.createIntentForApp('crm');
        this.pushMail({
          to: owner.email,
          subject: 'CRM login intent',
          body: `Deep link: /login?intentId=${intent.id}`,
          link: `/login?intentId=${intent.id}`,
        });
        break;
      }

      case 'onboarding':
      case 'register-company':
        this.updateTenant(tenantA, { status: TenantStatus.Onboarding });
        this.updateMembership(memA, {
          roleIds: [roleIdentity],
          hasActiveSubscription: false,
        });
        if (scenario === 'register-company') {
          this.pushMail({
            to: 'newco@brooch.sa',
            subject: 'Journey: register-company',
            body: 'Use Register with a new email → set-password from mailbox → login.',
          });
        } else {
          this.pushMail({
            to: owner.email,
            subject: 'Journey: onboarding',
            body: 'Sign in → onboarding wizard (company → package → free trial).',
          });
        }
        break;

      case 'register-existing':
        this.pushMail({
          to: owner.email,
          subject: 'Journey: register-existing',
          body: `Register with ${owner.email} → should say already registered; then login.`,
        });
        break;

      case 'invite-user':
        this.pushMail({
          to: owner.email,
          subject: 'Journey: invite-user',
          body: 'Sign in → Members → Add member with a new email → check mailbox for SetPassword.',
        });
        break;

      case 'accept-invitation':
        seedInvitee();
        break;

      case 'forgot-password':
      case 'reset-password': {
        const token = uid().replace(/-/g, '').slice(0, 24);
        this.storeResetToken(ownerId, token);
        const link = `/reset-password?userId=${ownerId}&token=${token}`;
        this.pushMail({
          to: owner.email,
          subject: 'Reset your Brooch password',
          body: `Open ${link}`,
          token,
          userId: ownerId,
          link,
        });
        break;
      }

      case 'invalid-credentials':
        this.pushMail({
          to: owner.email,
          subject: 'Journey: invalid-credentials',
          body: 'Sign in with wrong password to see Identity.InvalidCredentials.',
        });
        break;

      case 'user-disabled':
        this.updateUser(ownerId, { status: UserStatus.Suspended });
        this.pushMail({
          to: owner.email,
          subject: 'Journey: user-disabled',
          body: 'Sign in → Identity.Account.Disabled.',
        });
        break;

      case 'no-membership':
        this.memberships.set([]);
        this.pushMail({
          to: owner.email,
          subject: 'Journey: no-membership',
          body: 'Sign in → Identity.NoActiveTenantMembership.',
        });
        break;

      case 'tenant-disabled':
        this.updateTenant(tenantA, { status: TenantStatus.Disabled });
        this.pushMail({
          to: owner.email,
          subject: 'Journey: tenant-disabled',
          body: 'Sign in → Membership.TenantDisabled.',
        });
        break;

      case 'membership-suspended':
        this.updateMembership(memA, { status: MembershipStatus.Suspended });
        this.pushMail({
          to: owner.email,
          subject: 'Journey: membership-suspended',
          body: 'Sign in → Membership.Suspended.',
        });
        break;

      case 'app-denied-tenant':
      case 'app-denied-user':
      case 'intent-tenant-ineligible': {
        this.updateMembership(memA, { roleIds: [roleIdentity], hasActiveSubscription: false });
        if (scenario === 'intent-tenant-ineligible') {
          addSecondTenant();
          this.updateMembership(memB, {
            roleIds: [],
            hasActiveSubscription: false,
          });
        }
        const intent = this.createIntentForApp('crm');
        this.pushMail({
          to: owner.email,
          subject: `Journey: ${scenario}`,
          body: `Open /login?intentId=${intent.id} — CRM access should be denied.`,
          link: `/login?intentId=${intent.id}`,
        });
        break;
      }

      case 'permission-denied':
        this.updateMembership(memA, { roleIds: [roleIdentityReadOnly] });
        this.pushMail({
          to: owner.email,
          subject: 'Journey: permission-denied',
          body: 'Sign in → Members → Add member → Auth.PermissionDenied (no create permission).',
        });
        break;

      case 'intent-expired': {
        const intent = this.createIntentForApp('crm', 'Expired');
        this.pushMail({
          to: owner.email,
          subject: 'Journey: intent-expired',
          body: `Open /login?intentId=${intent.id}`,
          link: `/login?intentId=${intent.id}`,
        });
        break;
      }

      case 'intent-replayed': {
        const intent = this.createIntentForApp('crm', 'Completed');
        this.pushMail({
          to: owner.email,
          subject: 'Journey: intent-replayed',
          body: `Open /login?intentId=${intent.id}`,
          link: `/login?intentId=${intent.id}`,
        });
        break;
      }

      case 'session-expired':
        this.flags.update((f) => ({ ...f, sessionExpiredOnMe: true }));
        this.createSession({
          id: uid(),
          userId: ownerId,
          stage: SessionStage.Active,
          tenantId: tenantA,
          tenantMembershipId: memA,
        });
        this.pushMail({
          to: owner.email,
          subject: 'Journey: session-expired',
          body: 'Session is seeded but next /auth/me returns 401 — refresh or open Applications.',
        });
        break;

      case 'csrf-failure':
        this.flags.update((f) => ({ ...f, csrfFailOnce: true }));
        this.pushMail({
          to: owner.email,
          subject: 'Journey: csrf-failure',
          body: 'Sign in then try logout/switch — first unsafe call fails CSRF then retries once.',
        });
        break;

      case 'rate-limit':
        this.flags.update((f) => ({ ...f, rateLimitLogin: true }));
        this.pushMail({
          to: owner.email,
          subject: 'Journey: rate-limit',
          body: 'Sign in → 429 rate limit UI.',
        });
        break;

      default:
        this.pushMail({
          to: owner.email,
          subject: `Scenario: ${scenario}`,
          body: `Login with ${owner.email} / P@ssw0rd!2026`,
        });
    }

    this.pushMail({
      to: owner.email,
      subject: 'Mock persona ready',
      body: `Active scenario: ${scenario}. Default login: ${owner.email} / P@ssw0rd!2026`,
    });
  }
}

export function newId(): string {
  return crypto.randomUUID();
}

/** All 29 Identity-cycle journey ids (plus onboarding helper). */
export const MOCK_JOURNEY_SCENARIOS = [
  'register-company',
  'register-existing',
  'invite-user',
  'accept-invitation',
  'login-single-one-app',
  'login-single-multi-app',
  'login-multi-tenant',
  'login-intent',
  'intent-multi-tenant',
  'forgot-password',
  'reset-password',
  'switch-company',
  'switch-application',
  'logout',
  'logout-all',
  'invalid-credentials',
  'user-disabled',
  'no-membership',
  'tenant-disabled',
  'membership-suspended',
  'app-denied-tenant',
  'app-denied-user',
  'intent-tenant-ineligible',
  'permission-denied',
  'intent-expired',
  'intent-replayed',
  'session-expired',
  'csrf-failure',
  'rate-limit',
  'onboarding',
] as const;
