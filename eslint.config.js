// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

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
    ignores: ['dist/**', '.angular/**', 'node_modules/**'],
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
);
