import { AvailableApplicationDto } from '../../../../models/auth.model';

/** Product codes shown on the applications launcher, in reading order. */
export const PRODUCT_CODES = ['mos', 'aos', 'los', 'ios', 'dos', 'sos'] as const;

export type ProductCode = (typeof PRODUCT_CODES)[number];

export interface LauncherApplication {
  code: ProductCode;
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
  entry('mos', 'var(--app-mos)'),
  entry('aos', 'var(--app-aos)'),
  entry('los', 'var(--app-los)'),
  entry('ios', 'var(--app-ios)'),
  entry('dos', 'var(--app-dos)'),
  entry('sos', 'var(--app-sos)'),
];

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

/**
 * Registry keys from `availableApplications` that are one of the six products.
 * Account is the hub the user is already in, so it does not light up a card.
 * CRM is RE SOS (sales); landlord is RE MOS; listing is RE LOS.
 */
const KEY_ALIASES: Readonly<Record<string, ProductCode>> = {
  listing: 'los',
  listings: 'los',
  landlord: 'mos',
  crm: 'sos',
};

/**
 * Maps a backend application onto a catalogue product.
 * Accepts the registry keys (`listing`, `landlord`, `crm`) and the product codes
 * (`mos`, `re-mos`, `RE MOS`), including the code inside a display name.
 */
export function productCodeFromApplication(
  app: Pick<AvailableApplicationDto, 'key' | 'nameEn' | 'nameAr'>,
): ProductCode | null {
  const alias = KEY_ALIASES[compact(app.key)];
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

/**
 * Every catalogue product, with `active` set for the ones the backend returned.
 * Products the payload does not mention stay inactive.
 * Available apps are listed first (catalogue order within each group) so the
 * first grid row is filled with openable cards.
 */
export function buildLauncherApps(
  returned: readonly AvailableApplicationDto[],
  canLaunch: (url: string | null | undefined) => boolean,
): LauncherApplication[] {
  const byCode = new Map<ProductCode, AvailableApplicationDto>();
  for (const app of returned) {
    const code = productCodeFromApplication(app);
    if (code && !byCode.has(code)) {
      byCode.set(code, app);
    }
  }

  const apps = CATALOGUE.map((item) => {
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

  return [...apps.filter((item) => item.active), ...apps.filter((item) => !item.active)];
}
