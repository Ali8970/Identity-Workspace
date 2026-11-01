import { AvailableApplicationDto } from '@core/auth/auth.model';

/** Product codes shown on the applications launcher — Figma grid order (LTR). */
export const PRODUCT_CODES = ['los', 'aos', 'mos', 'sos', 'dos', 'ios'] as const;

export type ProductCode = (typeof PRODUCT_CODES)[number];

/** Permanent catalogue products plus Administration when `/me` returns it. */
export type LauncherCode = ProductCode | 'administration';

export interface LauncherApplication {
  code: LauncherCode;
  /** CSS color, usually `var(--app-mos)` and friends. */
  accent: string;
  /** Light-theme mark (navy Brooch wordmark). */
  mark: string;
  /** Dark-theme mark (white Brooch wordmark, accent kept). */
  markDark: string;
  line: string;
  lineDark: string;
  /** Present in the backend `availableApplications` payload. */
  active: boolean;
  /** Active and the backend URL is an absolute http(s) address. */
  launchable: boolean;
  url: string | null;
  isCurrent: boolean;
}

interface CatalogueEntry {
  code: ProductCode;
  accent: string;
  mark: string;
  markDark: string;
  line: string;
  lineDark: string;
}

const CATALOGUE: readonly CatalogueEntry[] = [
  entry('los', 'var(--app-los)'),
  entry('aos', 'var(--app-aos)'),
  entry('mos', 'var(--app-mos)'),
  entry('sos', 'var(--app-sos)'),
  entry('dos', 'var(--app-dos)'),
  entry('ios', 'var(--app-ios)'),
];

/** Platform Administration — shown only when `/me` includes the registry key. */
const ADMINISTRATION_CARD = {
  code: 'administration' as const,
  accent: 'var(--app-hr)',
  // Reuse AOS marks until dedicated Administration artwork ships.
  mark: '/images/apps/aos-mark.svg',
  markDark: '/images/apps/aos-mark-dark.svg',
  line: '/images/apps/aos-line.svg',
  lineDark: '/images/apps/aos-line-dark.svg',
};

function entry(code: ProductCode, accent: string): CatalogueEntry {
  return {
    code,
    accent,
    mark: `/images/apps/${code}-mark.svg`,
    markDark: `/images/apps/${code}-mark-dark.svg`,
    line: `/images/apps/${code}-line.svg`,
    lineDark: `/images/apps/${code}-line-dark.svg`,
  };
}

/** Matches CRM's developer-owner role when Identity returns it on this session. */
export const CRM_DEVELOPER_OWNER_ROLE = 'CRM_DEVELOPER_OWNER';

/** Matches CRM's portal permission key. */
export const CRM_DEVELOPER_PORTAL_PERMISSION = 'crm.developer_portal.access';

/**
 * Registry keys from `availableApplications` that are one of the six products.
 * Account is the hub the user is already in, so it does not light up a card.
 * Administration is handled separately and only appears when the API returns it.
 * CRM brands as RE SOS (sales) for agency users and RE DOS for developers;
 * landlord is RE MOS; listing is RE LOS.
 */
const KEY_ALIASES: Readonly<Record<string, ProductCode>> = {
  listing: 'los',
  listings: 'los',
  landlord: 'mos',
};

/**
 * True when this Account session is the CRM developer-owner persona.
 * Mirrors CRM `PermissionsService.isDeveloperOnly`. Account `/me` scopes roles to
 * the Account app, so developers often arrive with empty authz — CRM-only product
 * access with no identity/tenant grants is treated as developer for branding.
 */
export function isDeveloperPersona(input: {
  roles: readonly { code: string }[];
  permissions: readonly string[];
  availableApplications: readonly Pick<AvailableApplicationDto, 'key'>[];
}): boolean {
  const roleSet = new Set(input.roles.map((role) => role.code));
  const hasPortal = input.permissions.includes(CRM_DEVELOPER_PORTAL_PERMISSION);
  const otherCrm = input.permissions.some(
    (key) => key.startsWith('crm.') && key !== CRM_DEVELOPER_PORTAL_PERMISSION,
  );
  if (hasPortal) {
    return !otherCrm;
  }
  if (roleSet.size === 1 && roleSet.has(CRM_DEVELOPER_OWNER_ROLE)) {
    return true;
  }

  const productKeys = input.availableApplications
    .map((app) => compact(app.key))
    .filter((key) => key !== 'account' && key !== 'administration');
  const onlyCrm = productKeys.length === 1 && productKeys[0] === 'crm';
  const hasWorkspaceAuthz = input.permissions.some(
    (key) => key.startsWith('identity.') || key.startsWith('tenant.'),
  );
  return onlyCrm && !hasWorkspaceAuthz;
}

/**
 * Maps a backend application onto a catalogue product.
 * Accepts the registry keys (`listing`, `landlord`, `crm`) and the product codes
 * (`mos`, `re-mos`, `RE MOS`), including the code inside a display name.
 * Account and administration are not catalogue products (administration is injected
 * separately when present).
 */
export function productCodeFromApplication(
  app: Pick<AvailableApplicationDto, 'key' | 'nameEn' | 'nameAr'>,
  options: { developer?: boolean } = {},
): ProductCode | null {
  const key = compact(app.key);
  if (key === 'account' || key === 'administration') {
    return null;
  }
  if (key === 'crm') {
    return options.developer ? 'dos' : 'sos';
  }
  const alias = KEY_ALIASES[key];
  if (alias) {
    return alias;
  }
  for (const value of [app.key, app.nameEn, app.nameAr]) {
    const code = matchProductCode(value);
    if (code) {
      return code;
    }
  }
  return null;
}

function compact(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function matchProductCode(value: string | null | undefined): ProductCode | null {
  if (!value) {
    return null;
  }
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const token = compact(value);
  for (const code of PRODUCT_CODES) {
    if (token === code || token === `re${code}` || normalized.split(' ').includes(code)) {
      return code;
    }
  }
  return null;
}

function administrationFromPayload(
  returned: readonly AvailableApplicationDto[],
  canLaunch: (url: string | null | undefined) => boolean,
): LauncherApplication | null {
  const match = returned.find((app) => compact(app.key) === 'administration');
  if (!match) {
    return null;
  }
  const url = match.url ?? null;
  return {
    ...ADMINISTRATION_CARD,
    active: true,
    launchable: canLaunch(url),
    url: canLaunch(url) ? url : null,
    isCurrent: match.isCurrent ?? false,
  };
}

/**
 * Every catalogue product, with `active` set for the ones the backend returned.
 * Products the payload does not mention stay inactive.
 * Administration is appended only when `/me.availableApplications` includes it —
 * it never appears as an unavailable catalogue slot.
 * Available apps are listed first (catalogue order within each group) so the
 * first grid row is filled with openable cards.
 */
export function buildLauncherApps(
  returned: readonly AvailableApplicationDto[],
  canLaunch: (url: string | null | undefined) => boolean,
  options: { developer?: boolean } = {},
): LauncherApplication[] {
  const byCode = new Map<ProductCode, AvailableApplicationDto>();
  for (const app of returned) {
    const code = productCodeFromApplication(app, options);
    if (code && !byCode.has(code)) {
      byCode.set(code, app);
    }
  }

  const apps: LauncherApplication[] = CATALOGUE.map((item) => {
    const match = byCode.get(item.code);
    const url = match?.url ?? null;
    return {
      ...item,
      active: match !== undefined,
      launchable: match !== undefined && canLaunch(url),
      url: canLaunch(url) ? url : null,
      isCurrent: match?.isCurrent ?? false,
    };
  });

  const ordered = [
    ...apps.filter((item) => item.active),
    ...apps.filter((item) => !item.active),
  ];
  const administration = administrationFromPayload(returned, canLaunch);
  return administration ? [administration, ...ordered] : ordered;
}
