import { HttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, firstValueFrom, of } from 'rxjs';
import { RolesApi } from './roles-api.service';

/** Returns whatever body the test wants, for any GET. */
function httpReturning(body: unknown) {
  return {
    get: (): Observable<unknown> => of(body),
  } as unknown as HttpClient;
}

describe('RolesApi normalisation', () => {
  function configure(body: unknown) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        RolesApi,
        { provide: HttpClient, useValue: httpReturning(body) },
      ],
    });
  }

  describe('RolesApi.list', () => {
    it('fills in permissionKeys the API omitted', async () => {
      configure({
        statusCode: 200,
        message: 'ok',
        data: [
          {
            id: 'r1',
            tenantId: 't1',
            applicationKey: 'account',
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
            applicationKey: 'account',
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
