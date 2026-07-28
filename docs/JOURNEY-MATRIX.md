# Journey matrix (mock)

| Journey id | How to run | Expected outcome |
|---|---|---|
| register-company | Toolbar → Register new email | Mailbox set-password → set password → login |
| register-existing | Toolbar → Register with `owner@brooch.sa` | Existing-user message → login |
| invite-user | Login → Members → Add | Mailbox SetPassword for invitee |
| accept-invitation | Toolbar → open mailbox link | Set password → login |
| login-single-one-app | Toolbar → login | Redirect to `/mock-target/crm` |
| login-single-multi-app | Toolbar → login | Applications launcher |
| login-multi-tenant | Toolbar → login | Select Company |
| login-intent | Open mailbox intent link → login | Redirect to CRM mock target |
| intent-multi-tenant | Mailbox intent → login → pick company | Redirect after pick |
| forgot-password | Forgot form (any email) | Anti-enumeration success; mailbox if known |
| reset-password | Mailbox reset link | Reset → login (no auto session) |
| switch-company | Multi-tenant seed → shell switcher / Account | Membership switch + refresh |
| switch-application | Applications → Open CRM/HR | `/mock-target/:app` |
| logout | Account → Sign out (this device) | Session cleared → login |
| logout-all | Shell Sign out / Account logout-all | All sessions cleared |
| invalid-credentials | Wrong password | `Identity.InvalidCredentials` |
| user-disabled | Toolbar seed → login | `Identity.Account.Disabled` |
| no-membership | Toolbar seed → login | `Identity.NoActiveTenantMembership` |
| tenant-disabled | Toolbar seed → login | `Membership.TenantDisabled` |
| membership-suspended | Toolbar seed → login | `Membership.Suspended` |
| app-denied-tenant | Intent mailbox → login | App denied / redirect denied |
| app-denied-user | Intent mailbox → login | App denied |
| intent-tenant-ineligible | Intent → pick ineligible company | Stay on picker with error |
| permission-denied | Login → Members → Add | `Auth.PermissionDenied` + correlation id |
| intent-expired | Mailbox expired intent → login | `Identity.LoginIntent.Expired` |
| intent-replayed | Mailbox completed intent → login | `Identity.LoginIntent.AlreadyCompleted` |
| session-expired | Seed then open workspace | `/session-expired` banner |
| csrf-failure | Login then unsafe action | Auto re-prime + single retry |
| rate-limit | Toolbar → login | 429 + cooldown UI |
| onboarding | Toolbar → login | Company → package → free trial → `/login?onboarded=1` |

Default credentials: `owner@brooch.sa` / `P@ssw0rd!2026`

## Go-live

1. Set `apiBaseUrl` to real API  
2. `useMockApi: false`  
3. `showMockToolbar: false`  
