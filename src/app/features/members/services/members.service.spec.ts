import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MembersApi } from '@domains/access/services/members-api.service';
import { RolesApi } from '@domains/access/services/roles-api.service';
import { TeamsApi } from '@domains/team/services/teams-api.service';
import { TeamNode } from '@domains/team/models/team.model';
import { MembersService } from './members.service';

function node(id: string, name: string, children: TeamNode[] = []): TeamNode {
  return {
    id,
    name,
    applicationKey: null,
    kind: 'Team',
    managerTenantMembershipId: null,
    isMissingManager: false,
    memberCount: 0,
    children,
  };
}

describe('MembersService', () => {
  let service: MembersService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        MembersService,
        { provide: MembersApi, useValue: {} },
        { provide: RolesApi, useValue: {} },
        { provide: TeamsApi, useValue: {} },
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
        { id: '1', name: 'Sales', depth: 0, kind: 'Team' },
        { id: '1.1', name: 'Inside Sales', depth: 1, kind: 'Team' },
        { id: '1.1.1', name: 'SDR', depth: 2, kind: 'Team' },
        { id: '2', name: 'Engineering', depth: 0, kind: 'Team' },
      ]);
    });

    // Note: `children` being present is guaranteed by TeamsApi.tree(), which normalises
    // the payload — see workspace-api.service.spec.ts. flattenTeams deliberately trusts
    // that contract rather than re-defending against null at every consumer.
    it('treats an explicitly empty children array as a leaf', () => {
      expect(service.flattenTeams([node('1', 'Sales', [])])).toEqual([
        { id: '1', name: 'Sales', depth: 0, kind: 'Team' },
      ]);
    });
  });
});
