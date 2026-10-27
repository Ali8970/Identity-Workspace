import { describe, expect, it } from 'vitest';
import { AvailableApplicationDto } from '../../../../models/auth.model';
import {
  buildLauncherApps,
  isDeveloperPersona,
  productCodeFromApplication,
} from './application-catalogue';

function app(
  partial: Partial<AvailableApplicationDto> & Pick<AvailableApplicationDto, 'key'>,
): AvailableApplicationDto {
  return {
    nameAr: '',
    nameEn: '',
    url: 'https://apps.brooch.example',
    isCurrent: false,
    ...partial,
  };
}

describe('productCodeFromApplication', () => {
  it('matches a bare product key', () => {
    expect(productCodeFromApplication(app({ key: 'mos' }))).toBe('mos');
  });

  it('matches a prefixed or spaced product code', () => {
    expect(productCodeFromApplication(app({ key: 'RE-LOS' }))).toBe('los');
    expect(productCodeFromApplication(app({ key: 'other', nameEn: 'RE AOS' }))).toBe('aos');
  });

  it('maps the registry keys the backend returns', () => {
    expect(productCodeFromApplication(app({ key: 'listing', nameEn: 'Listing' }))).toBe('los');
    expect(productCodeFromApplication(app({ key: 'landlord', nameEn: 'Landlord' }))).toBe('mos');
    expect(productCodeFromApplication(app({ key: 'crm', nameEn: 'CRM' }))).toBe('sos');
  });

  it('brands CRM as RE DOS for the developer persona', () => {
    expect(productCodeFromApplication(app({ key: 'crm', nameEn: 'CRM' }), { developer: true })).toBe(
      'dos',
    );
  });

  it('ignores the account hub', () => {
    expect(productCodeFromApplication(app({ key: 'account', nameEn: 'Account' }))).toBeNull();
  });

  it('ignores administration — it is injected only when the API returns it', () => {
    expect(
      productCodeFromApplication(app({ key: 'administration', nameEn: 'Administration' })),
    ).toBeNull();
  });
});

describe('isDeveloperPersona', () => {
  it('detects CRM-only access with no workspace permissions', () => {
    expect(
      isDeveloperPersona({
        roles: [],
        permissions: [],
        availableApplications: [
          { key: 'account' },
          { key: 'crm' },
        ],
      }),
    ).toBe(true);
  });

  it('keeps agency users with listing or landlord on the sales brand', () => {
    expect(
      isDeveloperPersona({
        roles: [],
        permissions: [],
        availableApplications: [
          { key: 'account' },
          { key: 'crm' },
          { key: 'listing' },
        ],
      }),
    ).toBe(false);
  });

  it('detects the CRM developer-owner role', () => {
    expect(
      isDeveloperPersona({
        roles: [{ code: 'CRM_DEVELOPER_OWNER' }],
        permissions: [],
        availableApplications: [{ key: 'account' }, { key: 'crm' }, { key: 'listing' }],
      }),
    ).toBe(true);
  });
});

describe('buildLauncherApps', () => {
  const canLaunch = (url: string | null | undefined) => !!url?.startsWith('https://');

  it('keeps every product and activates only the ones the backend returned', () => {
    const apps = buildLauncherApps(
      [
        app({ key: 'account', url: 'https://account.brooch.example', isCurrent: true }),
        app({ key: 'crm', url: 'https://crm.brooch.example' }),
        app({ key: 'listing', url: 'https://listing.brooch.example' }),
        app({ key: 'landlord', url: 'https://landlord.brooch.example' }),
      ],
      canLaunch,
    );

    expect(apps.map((item) => item.code)).toEqual(['los', 'mos', 'sos', 'aos', 'dos', 'ios']);
    expect(apps.filter((item) => item.active).map((item) => item.code)).toEqual(['los', 'mos', 'sos']);
    expect(apps.find((item) => item.code === 'mos')).toMatchObject({
      launchable: true,
      url: 'https://landlord.brooch.example',
    });
    expect(apps.find((item) => item.code === 'los')?.url).toBe('https://listing.brooch.example');
    expect(apps.find((item) => item.code === 'sos')?.url).toBe('https://crm.brooch.example');
    expect(apps.find((item) => item.code === 'aos')?.active).toBe(false);
  });

  it('keeps a returned app inactive to launch when its url is not navigable', () => {
    const [mos] = buildLauncherApps([app({ key: 'mos', url: '' })], canLaunch);
    expect(mos.active).toBe(true);
    expect(mos.launchable).toBe(false);
    expect(mos.url).toBeNull();
  });

  it('activates RE DOS from CRM for developers and keeps the CRM url', () => {
    const apps = buildLauncherApps(
      [
        app({ key: 'account', url: 'https://account.brooch.example', isCurrent: true }),
        app({ key: 'crm', url: 'https://crm.brooch.example' }),
      ],
      canLaunch,
      { developer: true },
    );

    expect(apps.filter((item) => item.active).map((item) => item.code)).toEqual(['dos']);
    expect(apps.find((item) => item.code === 'dos')).toMatchObject({
      launchable: true,
      url: 'https://crm.brooch.example',
    });
    expect(apps.find((item) => item.code === 'sos')?.active).toBe(false);
  });

  it('prepends Administration only when the API returns it', () => {
    const withoutAdmin = buildLauncherApps(
      [
        app({ key: 'account', url: 'https://account.brooch.example', isCurrent: true }),
        app({ key: 'crm', url: 'https://crm.brooch.example' }),
      ],
      canLaunch,
    );
    expect(withoutAdmin.some((item) => item.code === 'administration')).toBe(false);

    const withAdmin = buildLauncherApps(
      [
        app({ key: 'account', url: 'https://account.brooch.example', isCurrent: true }),
        app({ key: 'crm', url: 'https://crm.brooch.example' }),
        app({
          key: 'administration',
          nameEn: 'Administration',
          nameAr: 'الإدارة',
          url: 'https://administration.brooch.example',
        }),
        app({ key: 'listing', url: 'https://listing.brooch.example' }),
      ],
      canLaunch,
    );

    expect(withAdmin[0]).toMatchObject({
      code: 'administration',
      active: true,
      launchable: true,
      url: 'https://administration.brooch.example',
    });
    expect(withAdmin.filter((item) => item.active).map((item) => item.code)).toEqual([
      'administration',
      'los',
      'sos',
    ]);
  });
});
