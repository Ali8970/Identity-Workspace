// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const fs = require('node:fs');
const path = require('node:path');

/**
 * Layer boundaries (audit ARCH-02): features → domains → shared → core, never sideways.
 * Cross-layer imports use the tsconfig aliases; these rules make the direction mechanical.
 */
const FEATURES = fs
  .readdirSync(path.join(__dirname, 'src/app/features'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const NO_FEATURES = [
  { group: ['@features/*'], message: 'Only the router may reach into a feature. Move shared code to @domains or @shared.' },
  { regex: '^(\.\./)+features/', message: 'Only the router may reach into a feature.' },
];

const boundaries = [
  ...FEATURES.map((feature) => ({
    files: [`src/app/features/${feature}/**/*.ts`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@features/*'], message: 'A feature never imports another feature. Use @domains or @shared.' },
            ...(FEATURES.length > 1
              ? [
                  {
                    regex: `^(\.\./)+(${FEATURES.filter((other) => other !== feature).join('|')})/`,
                    message: 'A feature never imports another feature. Use @domains or @shared.',
                  },
                ]
              : []),
          ],
        },
      ],
    },
  })),
  {
    files: ['src/app/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            ...NO_FEATURES,
            { group: ['@domains/*'], message: 'Shared is domain-agnostic. Domain widgets belong in @domains.' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/core/**/*.ts'],
    ignores: ['src/app/core/layout/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            ...NO_FEATURES,
            { group: ['@domains/*'], message: 'Only core/layout may host domain widgets.' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/core/layout/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: NO_FEATURES }] },
  },
  {
    // Domains are ranked (access 0, team 1): a domain may only use a lower-ranked one.
    files: ['src/app/domains/access/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            ...NO_FEATURES,
            { group: ['@domains/team/*'], message: 'access (rank 0) cannot depend on team (rank 1).' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/domains/team/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: NO_FEATURES }] },
  },
];

/**
 * Flat config mirroring the rules in CLAUDE.md / AGENTS.md so they are enforced
 * mechanically instead of by review. Anything listed under "Do not" in CLAUDE.md
 * should have a rule here.
 *
 * Deliberately NOT enabled: `prefer-on-push-component-change-detection` —
 * CLAUDE.md forbids setting `changeDetection` explicitly (OnPush is the v22 default).
 */
module.exports = tseslint.config(
  {
    ignores: ['dist/**', '.angular/**', 'node_modules/**', 'e2e/**', 'playwright.config.ts'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    // Type-aware linting — required by `no-uncalled-signals`, which catches the
    // single most common signals bug (`mySignal` where `mySignal()` was meant).
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],

      // CLAUDE.md: no NgModules, never set `standalone: true` (default in v20+)
      '@angular-eslint/prefer-standalone': 'error',

      // CLAUDE.md: no constructor DI
      '@angular-eslint/prefer-inject': 'error',

      // CLAUDE.md: no decorator @Input/@Output; signals-first
      '@angular-eslint/prefer-signals': 'error',
      '@angular-eslint/prefer-signal-model': 'error',
      '@angular-eslint/prefer-output-emitter-ref': 'error',
      '@angular-eslint/prefer-output-readonly': 'error',
      '@angular-eslint/no-input-rename': 'error',
      '@angular-eslint/no-output-rename': 'error',

      // AGENTS.md: no @HostBinding / @HostListener — use the `host` object
      '@angular-eslint/prefer-host-metadata-property': 'error',

      // AGENTS.md: prefer @Service over @Injectable({providedIn:'root'})
      '@angular-eslint/prefer-service-decorator': 'error',

      // Signal correctness — catches `mySignal` used where `mySignal()` was meant
      '@angular-eslint/no-uncalled-signals': 'error',
      '@angular-eslint/computed-must-return': 'error',

      '@angular-eslint/no-empty-lifecycle-method': 'error',
      '@angular-eslint/use-lifecycle-interface': 'error',
      '@angular-eslint/inject-at-top': 'warn',

      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
    },
  },
  {
    files: ['**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {
      // CLAUDE.md: native control flow only — no *ngIf / *ngFor / *ngSwitch
      '@angular-eslint/template/prefer-control-flow': 'error',

      // CLAUDE.md: no ngClass / ngStyle — use class/style bindings
      '@angular-eslint/template/prefer-class-binding': 'error',

      '@angular-eslint/template/prefer-self-closing-tags': 'warn',
      '@angular-eslint/template/no-duplicate-attributes': 'error',
      '@angular-eslint/template/no-positive-tabindex': 'error',
      '@angular-eslint/template/button-has-type': 'error',
      '@angular-eslint/template/eqeqeq': 'error',
    },
  },
  ...boundaries,
);
