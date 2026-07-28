# Brooch Identity

Angular **22.0.8** SPA for Brooch SSO + tenant Identity workspace.

## Stack

- Zoneless, Signal Forms, signals
- SASS (no UI libraries)
- ngx-translate (`en` / `ar` + RTL)
- Cookie session + CSRF (contract-aligned)
- **Mock API enabled in development** until Brooch API is deployed

## Run

```bash
npm start
```

Open http://localhost:4200/

Default mock user: `owner@brooch.sa` / `P@ssw0rd!2026`

Use the **Mock API** toolbar (bottom-right) to switch Identity-cycle scenarios and read set-password / reset codes from the mailbox.

## Switch to real API

In `src/environments/environment.ts` (or production env):

```ts
useMockApi: false,
showMockToolbar: false,
apiBaseUrl: 'https://your-api-host/api/v1',
```

## AI quality gates

- `.cursor/rules/*` — Angular + Identity domain + i18n + SASS
- `.cursor/mcp.json` — Angular CLI MCP
- `AGENTS.md` / `CLAUDE.md`
- Official skills: `npx skills add https://github.com/angular/skills`
