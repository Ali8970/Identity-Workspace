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
const flatten = (value) => value.replace(/\s+/g, ' ').trim();

/** Classes AuthLayout renders for the hero half; the shell must use the same ones. */
const HERO_CLASSES = [
  'auth-page',
  'auth-page__hero',
  'auth-page__hero-inner',
  'auth-page__logo',
  'auth-page__mark',
  'auth-page__logo-name',
  'auth-page__logo-sub',
  'auth-page__hero-title',
  'auth-page__hero-lead',
  'auth-page__features',
  'auth-page__feature-icon',
  'auth-page__main',
  // The mobile brand strip. The hero is display:none below 920px, so on a phone
  // this is the only thing the shell paints above the card — it has to mirror
  // AuthLayout too or the hand-off shifts on exactly the devices most people
  // sign in from.
  'auth-page__strip',
  'auth-page__strip-name',
  'auth-page__strip-sub',
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
for (const className of HERO_CLASSES) {
  if (!loginDocument.querySelector(`.${className}`)) {
    fail(`the shell no longer renders .${className} — the hand-off will shift layout`);
  }
}

// 3. Arabic must flip direction before the first paint, not after Angular boots.
const arabicDocument = paint('/login', 'ar');
if (arabicDocument.documentElement.dir !== 'rtl' || arabicDocument.documentElement.lang !== 'ar') {
  fail('the shell does not switch to RTL for the Arabic cookie — Arabic users get an LTR flash');
}

// 4. Feature rows keep their icon when translated (the text node is swapped, not the node).
if (arabicDocument.querySelectorAll('.auth-page__feature-icon svg').length !== 3) {
  fail('translating the shell dropped the feature icons');
}

// 5. Routes outside AuthLayout must not flash the auth hero.
for (const path of ['/', '/applications', '/members']) {
  if (paint(path, 'en').querySelector('.auth-page')) {
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
