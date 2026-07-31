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

Opens **https://dev.account.brooch.sa:4300/** (`host` + `ssl` + port `4300` in `angular.json`).

Requires `dev.account.brooch.sa` in your hosts file (same as CRM):

```text
127.0.0.1  dev.account.brooch.sa
```

API calls go **directly** to staging. Backend must CORS-allow `https://dev.account.brooch.sa:4300`.

## Environments

```ts
apiBaseUrl: 'https://stg.api.brooch.sa/api/v1'
```

## AI quality gates

- `.cursor/rules/*` — Angular + Identity domain + i18n + SASS
- `.cursor/mcp.json` — Angular CLI MCP
- `AGENTS.md` / `CLAUDE.md`
- Journey acceptance: `docs/JOURNEY-MATRIX.md`
