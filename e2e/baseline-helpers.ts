import { expect, Page } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Refactor safety net (audit 2026-11, Step 0).
 *
 * Two baselines that screenshots alone cannot give:
 *  - the API calls a screen makes, so a refactor provably sends the server the same requests;
 *  - the computed styles of every element, so moving styling into Tailwind provably changes nothing.
 *
 * Network baselines are committed under `e2e/network-baseline/`. Computed styles are large and
 * regenerable from any commit, so they live in the git-ignored `e2e/.style-baseline/`.
 * Write mode: `BASELINE_UPDATE=1`. Without it, a missing baseline is written and an existing
 * one is compared.
 */

export type Lang = 'en' | 'ar';

const dictionaries: Record<Lang, Record<string, unknown>> = {
  en: JSON.parse(readFileSync(join(__dirname, '../public/i18n/en.json'), 'utf8')),
  ar: JSON.parse(readFileSync(join(__dirname, '../public/i18n/ar.json'), 'utf8')),
};

/** The translated string for `key`; throws so a renamed key fails loudly instead of matching nothing. */
export function t(lang: Lang, key: string): string {
  const value = key.split('.').reduce<unknown>(
    (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
    dictionaries[lang],
  );
  if (typeof value !== 'string') {
    throw new Error(`Missing translation ${lang}:${key}`);
  }
  return value;
}

/** Matches an interpolated label such as "Edit roles for {{name}}" by its fixed prefix. */
export function tPrefix(lang: Lang, key: string): RegExp {
  const fixed = t(lang, key).split('{{')[0];
  return new RegExp(`^${fixed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
}

const UPDATE = process.env['BASELINE_UPDATE'] === '1';

/** Records every Brooch API call as `METHOD /path?query`, in request order. */
export function recordApiCalls(page: Page): string[] {
  const calls: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.hostname === 'stg.api.brooch.sa') {
      calls.push(`${request.method()} ${url.pathname}${url.search}`);
    }
  });
  return calls;
}

/**
 * Compares the calls as a multiset: parallel reads may start in either order, but the same
 * requests must be made the same number of times.
 */
export function expectNetworkBaseline(id: string, calls: string[]): void {
  const file = join(__dirname, 'network-baseline', `${id}.json`);
  const actual = [...calls].sort();
  if (UPDATE || !existsSync(file)) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `${JSON.stringify(actual, null, 2)}\n`);
    return;
  }
  const expected = JSON.parse(readFileSync(file, 'utf8')) as string[];
  expect(actual, `API calls for ${id}`).toEqual(expected);
}

const STYLE_PROPERTIES = [
  'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index', 'box-sizing',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius',
  'color', 'background-color', 'background-image', 'box-shadow', 'opacity', 'visibility',
  'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing',
  'text-align', 'text-transform', 'text-decoration-line', 'white-space', 'overflow-x', 'overflow-y',
  'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-self', 'flex-grow', 'flex-shrink',
  'flex-basis', 'gap', 'row-gap', 'column-gap', 'grid-template-columns', 'grid-template-rows',
  'transform', 'cursor', 'outline-style', 'outline-width', 'outline-color', 'list-style-type', 'object-fit',
] as const;

/** Every rendered element's computed style plus its rounded box, keyed by DOM path. */
export async function captureComputedStyles(page: Page): Promise<Record<string, Record<string, string>>> {
  return page.evaluate(async (properties) => {
    // Text metrics shift by a few pixels until the web font has swapped in.
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    // Entrance animations would otherwise be caught mid-flight: finish the finite ones and
    // freeze looping ones (spinners, shimmer) at their first frame.
    for (const animation of document.getAnimations()) {
      const end = animation.effect?.getComputedTiming().endTime;
      if (typeof end === 'number' && Number.isFinite(end)) {
        animation.finish();
      } else {
        animation.pause();
        animation.currentTime = 0;
      }
    }
    const result: Record<string, Record<string, string>> = {};
    const pathOf = (element: Element): string => {
      const parts: string[] = [];
      let node: Element | null = element;
      while (node && node !== document.documentElement) {
        const parent: Element | null = node.parentElement;
        const index = parent ? Array.prototype.indexOf.call(parent.children, node) : 0;
        parts.unshift(`${node.tagName.toLowerCase()}:${index}`);
        node = parent;
      }
      return parts.join('>');
    };
    for (const element of Array.from(document.body.querySelectorAll('*'))) {
      if (element.closest('svg') && element.tagName.toLowerCase() !== 'svg') {
        continue;
      }
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      const entry: Record<string, string> = {
        box: `${Math.round(box.x)},${Math.round(box.y)},${Math.round(box.width)},${Math.round(box.height)}`,
      };
      for (const property of properties) {
        entry[property] = style.getPropertyValue(property);
      }
      for (const pseudo of ['::before', '::after']) {
        const pseudoStyle = getComputedStyle(element, pseudo);
        const content = pseudoStyle.getPropertyValue('content');
        if (content && content !== 'none' && content !== 'normal') {
          entry[`${pseudo} content`] = content;
          for (const property of properties) {
            entry[`${pseudo} ${property}`] = pseudoStyle.getPropertyValue(property);
          }
        }
      }
      result[pathOf(element)] = entry;
    }
    return result;
  }, [...STYLE_PROPERTIES]);
}

/** Writes the style baseline when absent; otherwise lists every element/property that changed. */
export function expectStyleBaseline(id: string, styles: Record<string, Record<string, string>>): void {
  const file = join(__dirname, '.style-baseline', `${id}.json`);
  if (UPDATE || !existsSync(file)) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(styles));
    return;
  }
  const expected = JSON.parse(readFileSync(file, 'utf8')) as Record<string, Record<string, string>>;
  const differences: string[] = [];
  for (const path of new Set([...Object.keys(expected), ...Object.keys(styles)])) {
    const before = expected[path];
    const after = styles[path];
    if (!before || !after) {
      differences.push(`${path}: ${before ? 'removed' : 'added'}`);
      continue;
    }
    for (const property of Object.keys(before)) {
      if (before[property] !== after[property]) {
        differences.push(`${path} ${property}: ${before[property]} -> ${after[property]}`);
      }
    }
  }
  expect(differences.slice(0, 40), `computed-style drift for ${id} (${differences.length} total)`).toEqual([]);
}

/** Seeds theme and language the same way the route baseline does. */
export async function seedPreferences(page: Page, theme: 'light' | 'dark', lang: Lang): Promise<void> {
  await page.clock.install({ time: new Date('2026-09-22T12:00:00Z') });
  await page.addInitScript(
    ({ theme: nextTheme, lang: nextLang }) => {
      localStorage.setItem('brooch.theme', nextTheme);
      localStorage.setItem('brooch.lang', nextLang);
      document.cookie = `brooch.theme=${nextTheme}; path=/`;
      document.cookie = `brooch.lang=${nextLang}; path=/`;
    },
    { theme, lang },
  );
}

/** Waits until a screen has settled: heading visible, no skeletons, no loading bar. */
export async function settle(page: Page): Promise<void> {
  await expect(page.locator('#main-content-header, h1').first()).toBeVisible();
  await expect(page.locator('.ui-skeleton')).toHaveCount(0);
  await expect(page.locator('.ui-loading-bar')).toHaveCount(0);
}
