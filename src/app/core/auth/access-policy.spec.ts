import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccessPolicy } from './access-policy';
import { SessionStore } from './session.store';

describe('AccessPolicy', () => {
  const permissions = signal<string[]>([]);
  let policy: AccessPolicy;

  beforeEach(() => {
    permissions.set([]);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: SessionStore, useValue: { permissions } },
      ],
    });
    policy = TestBed.inject(AccessPolicy);
  });

  const capabilities = [
    ['canReadMembers', 'identity.memberships.read'],
    ['canManageMembers', 'identity.memberships.manage'],
    ['canReadRoles', 'identity.roles.read'],
    ['canManageRoles', 'identity.roles.manage'],
    ['canReadPermissions', 'identity.permissions.read'],
    ['canReadTeams', 'tenant.teams.read'],
    ['canManageTeams', 'tenant.teams.manage'],
  ] as const;

  it.each(capabilities)('%s follows %s', (capability, permission) => {
    expect(policy[capability]()).toBe(false);
    permissions.set([permission]);
    expect(policy[capability]()).toBe(true);
  });

  it('never infers manage from read', () => {
    permissions.set(['identity.memberships.read', 'identity.roles.read', 'tenant.teams.read']);
    expect(policy.canManageMembers()).toBe(false);
    expect(policy.canManageRoles()).toBe(false);
    expect(policy.canManageTeams()).toBe(false);
  });

  it('updates when the session changes (company switch, re-login)', () => {
    permissions.set(['identity.roles.manage']);
    expect(policy.canManageRoles()).toBe(true);
    permissions.set([]);
    expect(policy.canManageRoles()).toBe(false);
  });
});
