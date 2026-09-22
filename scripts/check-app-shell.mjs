/**
 * Guards the pre-boot app shell in `src/index.html`.
 *
 * The shell paints the auth hero before Angular boots so LCP does not wait on main.js +
 * /i18n + the cross-origin /me probe. That makes the `auth.layout.*` strings live in two
 * places: the translation files and the shell markup. This check fails when they drift,
 * when the shell stops mirroring the classes `AuthLayout` renders (which is what keeps CLS
 * at 0 during the hand-off), and when the inline script stops behaving.
 *
 * Run: `npm run check:app-shell`
 */
import { readFileSync } from 'node:fs';
import { CookieJar, JSDOM } from 'jsdom';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const indexHtml = read('src/index.html');
const authLayout = read('src/app/shared/ui/auth-layout/auth-layout.ts');
const flatten = (value) => value.replace(/\s+/g, ' ').trim();

/**
 * Parts the pre-boot shell and AuthLayout both paint. Class strings are compared
 * so a Tailwind edit on one side cannot drift from the other (that drift is CLS).
 */
const SHELL_PARTS = [
  'page',
  'hero',
  'hero-inner',
  'logo',
  'mark',
  'logo-name',
  'logo-sub',
  'hero-title',
  'hero-lead',
  'features',
  'feature-icon',
  'main',
  'strip',
  'strip-mark',
  'strip-name',
  'strip-sub',
];

const ORIGIN = 'https://dev.account.brooch.sa';
const failures = [];
const fail = (message) => failures.push(message);

const translations = Object.fromEntries(
  ['en', 'ar'].map((lang) => [lang, JSON.parse(read(`public/i18n/${lang}.json`)).auth?.layout ?? {}]),
);

/** Renders index.html the way a browser would: the inline script runs during parse. */
function paint(path, lang) {
  const url = `${ORIGIN}${path}`;
  const cookieJar = new CookieJar();
  if (lang) {
    cookieJar.setCookieSync(`brooch.lang=${lang}; Path=/`, url);
  }
  const dom = new JSDOM(indexHtml, { url, runScripts: 'dangerously', cookieJar });
  return dom.window.document;
}

/** The hero copy the shell actually painted, keyed the same way as auth.layout.*. */
function paintedStrings(document) {
  const painted = {};
  for (const element of document.querySelectorAll('[data-shell]')) {
    painted[element.dataset.shell] = flatten(element.textContent);
  }
  return painted;
}

// 1. Every auth.layout string must be what the shell paints, in both languages.
for (const [lang, layout] of Object.entries(translations)) {
  const keys = Object.keys(layout);
  if (keys.length === 0) {
    fail(`public/i18n/${lang}.json has no auth.layout strings`);
    continue;
  }

  const painted = paintedStrings(paint('/login', lang));

  for (const [key, expected] of Object.entries(layout)) {
    if (painted[key] === undefined) {
      fail(`the shell paints no [data-shell="${key}"] element, so auth.layout.${key} is missing`);
    } else if (painted[key] !== flatten(expected)) {
      fail(
        `${lang} auth.layout.${key} drifted:\n` +
          `      i18n  : ${JSON.stringify(flatten(expected))}\n` +
          `      shell : ${JSON.stringify(painted[key])}`,
      );
    }
  }
}

// 2. The hand-off only stays shift-free while the shell mirrors AuthLayout's classes.
const loginDocument = paint('/login', 'en');
const classOf = (source, part) => {
  const pattern = new RegExp(`data-shell-part="${part}"[^>]*class="([^"]+)"`);
  return source.match(pattern)?.[1] ?? null;
};
for (const part of SHELL_PARTS) {
  const shellClass = classOf(indexHtml, part);
  const layoutClass = classOf(authLayout, part);
  if (!shellClass || !layoutClass) {
    fail(`data-shell-part="${part}" is missing a class in the shell or AuthLayout`);
    continue;
  }
  if (shellClass !== layoutClass) {
    fail(
      `data-shell-part="${part}" classes drifted:\n` +
        `      shell : ${shellClass}\n` +
        `      layout: ${layoutClass}`,
    );
  }
  if (!loginDocument.querySelector(`[data-shell-part="${part}"]`)) {
    fail(`the shell no longer renders [data-shell-part="${part}"]`);
  }
}

// 3. Arabic must flip direction before the first paint, not after Angular boots.
const arabicDocument = paint('/login', 'ar');
if (arabicDocument.documentElement.dir !== 'rtl' || arabicDocument.documentElement.lang !== 'ar') {
  fail('the shell does not switch to RTL for the Arabic cookie — Arabic users get an LTR flash');
}

// 4. Feature rows keep their icon when translated (the text node is swapped, not the node).
if (arabicDocument.querySelectorAll('[data-feature-icon] svg').length !== 3) {
  fail('translating the shell dropped the feature icons');
}

// 5. Routes outside AuthLayout must not flash the auth hero.
for (const path of ['/', '/applications', '/members']) {
  if (paint(path, 'en').querySelector('[data-auth-shell]')) {
    fail(`the shell paints the auth hero on ${path}, which does not use AuthLayout`);
  }
}

// 6. The preconnect keeps the cross-origin session probe off the boot path.
if (!loginDocument.querySelector('link[rel="preconnect"][href*="brooch.sa"]')) {
  fail('src/index.html lost the preconnect to the API origin');
}

if (failures.length > 0) {
  console.error(`app shell check failed:\n${failures.map((line) => `  - ${line}`).join('\n')}`);
  console.error(
    '\nThe shell in src/index.html mirrors shared/ui/auth-layout/auth-layout.ts.\n' +
      'Update both, or the pre-boot paint will not match what Angular renders.',
  );
  process.exit(1);
}

console.log('app shell check passed');
