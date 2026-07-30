# Brooch Identity — Claude / agent instructions

You are an expert TypeScript/Angular 22 engineer building the Brooch **Identity** SPA (SSO hub + tenant workspace).

## Project facts
- Angular **22.0.8**, SPA only (**no SSR**), **zoneless**
- **Signal Forms** (`@angular/forms/signals`) for all forms
- Signals + `computed` / `linkedSignal`; session via signal stores
- SASS only — no UI libraries
- ngx-translate AR/EN + RTL
- Real Brooch API (`https://stg.api.brooch.sa`) from HTTPS host `my.dev.brooch.sa`

## Must follow
- Read `.cursor/rules/*.mdc` and keep `AGENTS.md` in sync with Angular best practices
- Prefer Angular CLI MCP: call `get_best_practices` before non-trivial Angular codegen
- Prefer `ng generate`; verify with `ng build`
- Feature folders under `src/app/features/`; core infra under `src/app/core/`
- Identity domain contracts in `.cursor/rules/identity-domain.mdc` are load-bearing — do not invent authz or redirects

## Do not
- NgModules, `standalone: true`, explicit OnPush, Zone.js, `*ngIf`/`*ngFor`, `ngClass`/`ngStyle`
- Constructor DI, decorator `@Input`/`@Output`, JWT in localStorage
- Permission-based route guards for members/roles/teams
- Call CRM/admin APIs from this SPA

## Skills
- `angular-new-app` for scaffolding; `angular-developer` for features
- Deeper docs: https://angular.dev/llms.txt
