import { HttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, firstValueFrom, of } from 'rxjs';
import { ApiResponse } from '../../models/api-response.model';
import { RolesApi, TeamsApi } from './workspace-api.service';

/** Returns whatever body the test wants, for any GET. */
function httpReturning(body: unknown) {
  return {
    get: (): Observable<unknown> => of(body),
  } as unknown as HttpClient;
}

describe('workspace API normalisation', () => {
  function configure(body: unknown) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        TeamsApi,
        RolesApi,
        { provide: HttpClient, useValue: httpReturning(body) },
      ],
    });
  }

  describe('TeamsApi.tree', () => {
    it('returns an empty array when data is null', async () => {
      configure({ statusCode: 200, message: 'ok', data: null } as ApiResponse<null>);
      expect(await firstValueFrom(TestBed.inject(TeamsApi).tree())).toEqual([]);
    });

    // The API omits `children` on leaf nodes while TeamNode declares it non-nullable.
    // Normalising here is what lets flattenTeams / countTeams / the template read
    // `.children` without each guessing whether they must guard.
    it('fills in children the API omitted, at every depth', async () => {
      configure({
        statusCode: 200,
        message: 'ok',
        data: [
          {
            id: '1',
            name: 'Sales',
            managerTenantMembershipId: null,
            isMissingManager: false,
            memberCount: 2,
            children: [
              {
                id: '1.1',
                name: 'Inside Sales',
                managerTenantMembershipId: null,
                isMissingManager: false,
                memberCount: 1,
                // children omitted — the leaf case
              },
            ],
          },
          {
            id: '2',
            name: 'Engineering',
            managerTenantMembershipId: null,
            isMissingManager: false,
            memberCount: 0,
            // children omitted at the root too
          },
        ],
      });

      const tree = await firstValueFrom(TestBed.inject(TeamsApi).tree());

      expect(tree[0].children[0].children).toEqual([]);
      expect(tree[1].children).toEqual([]);
    });

    it('preserves the node fields it normalises around', async () => {
      configure({
        statusCode: 200,
        message: 'ok',
        data: [
          {
            id: '1',
            name: 'Sales',
            managerTenantMembershipId: 'm-1',
            isMissingManager: false,
            memberCount: 4,
          },
        ],
      });

      const [team] = await firstValueFrom(TestBed.inject(TeamsApi).tree());
      expect(team).toEqual({
        id: '1',
        name: 'Sales',
        managerTenantMembershipId: 'm-1',
        isMissingManager: false,
        memberCount: 4,
        children: [],
      });
    });
  });

  describe('RolesApi.list', () => {
    it('fills in permissionKeys the API omitted', async () => {
      configure({
        statusCode: 200,
        message: 'ok',
        data: [
          {
            id: 'r1',
            tenantId: 't1',
            applicationKey: 'identity',
            code: 'ADMIN',
            nameAr: 'مدير',
            nameEn: 'Admin',
            description: null,
            isSystem: true,
            isActive: true,
            // permissionKeys omitted
          },
        ],
      });

      const [role] = await firstValueFrom(TestBed.inject(RolesApi).list());
      expect(role.permissionKeys).toEqual([]);
    });

    it('leaves a populated permissionKeys array untouched', async () => {
      configure({
        statusCode: 200,
        message: 'ok',
        data: [
          {
            id: 'r1',
            tenantId: 't1',
            applicationKey: 'identity',
            code: 'ADMIN',
            nameAr: 'مدير',
            nameEn: 'Admin',
            description: null,
            isSystem: true,
            isActive: true,
            permissionKeys: ['identity.roles.read'],
          },
        ],
      });

      const [role] = await firstValueFrom(TestBed.inject(RolesApi).list());
      expect(role.permissionKeys).toEqual(['identity.roles.read']);
    });
  });
});
