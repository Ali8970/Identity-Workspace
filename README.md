# Brooch Identity

Angular **22.0.8** SPA for Brooch SSO + tenant Identity workspace.

## Stack

- Zoneless, Signal Forms, signals
- SASS (no UI libraries)
- ngx-translate (`en` / `ar` + RTL)
- Cookie session + CSRF (contract-aligned)
- Real Brooch API: `https://stg.api.brooch.sa/api/v1`

## Run (same pattern as CRM)

```bash
npm start
```

Opens **https://my.dev.brooch.sa:4200/** (`host` + `ssl` in `angular.json`).

Requires `my.dev.brooch.sa` in your hosts file (same as CRM):

```text
127.0.0.1  my.dev.brooch.sa
```

API calls go **directly** to staging. Backend must CORS-allow `https://my.dev.brooch.sa:4200`.

## Environments

```ts
apiBaseUrl: 'https://stg.api.brooch.sa/api/v1'
```

## AI quality gates

- `.cursor/rules/*` — Angular + Identity domain + i18n + SASS
- `.cursor/mcp.json` — Angular CLI MCP
- `AGENTS.md` / `CLAUDE.md`
- Journey acceptance: `docs/JOURNEY-MATRIX.md`
