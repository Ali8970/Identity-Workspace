import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MembersApi, RolesApi, TeamsApi } from '../../../core/api/workspace-api.service';
import { SessionStore } from '../../../core/auth/session.store';
import { TeamNode } from '../models/workspace-feature.model';
import { MembersService } from './members.service';

function node(id: string, name: string, children: TeamNode[] = []): TeamNode {
  return {
    id,
    name,
    managerTenantMembershipId: null,
    isMissingManager: false,
    memberCount: 0,
    children,
  };
}

describe('MembersService', () => {
  let service: MembersService;
  let permissions: string[];

  beforeEach(() => {
    permissions = [];
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        MembersService,
        { provide: MembersApi, useValue: {} },
        { provide: RolesApi, useValue: {} },
        { provide: TeamsApi, useValue: {} },
        {
          provide: SessionStore,
          useValue: { hasPermission: (p: string) => permissions.includes(p) },
        },
      ],
    });
    service = TestBed.inject(MembersService);
  });

  describe('flattenTeams', () => {
    it('returns an empty list for no teams', () => {
      expect(service.flattenTeams([])).toEqual([]);
    });

    it('flattens depth-first and records the nesting depth', () => {
      const tree = [
        node('1', 'Sales', [node('1.1', 'Inside Sales', [node('1.1.1', 'SDR')])]),
        node('2', 'Engineering'),
      ];

      expect(service.flattenTeams(tree)).toEqual([
        { id: '1', name: 'Sales', depth: 0 },
        { id: '1.1', name: 'Inside Sales', depth: 1 },
        { id: '1.1.1', name: 'SDR', depth: 2 },
        { id: '2', name: 'Engineering', depth: 0 },
      ]);
    });

    // Note: `children` being present is guaranteed by TeamsApi.tree(), which normalises
    // the payload — see workspace-api.service.spec.ts. flattenTeams deliberately trusts
    // that contract rather than re-defending against null at every consumer.
    it('treats an explicitly empty children array as a leaf', () => {
      expect(service.flattenTeams([node('1', 'Sales', [])])).toEqual([
        { id: '1', name: 'Sales', depth: 0 },
      ]);
    });
  });

  describe('canCreateMembers', () => {
    it('is false without identity.memberships.manage', () => {
      expect(service.canCreateMembers()).toBe(false);
    });

    it('is true with identity.memberships.manage', () => {
      permissions = ['identity.memberships.manage'];
      expect(service.canCreateMembers()).toBe(true);
    });
  });
});
