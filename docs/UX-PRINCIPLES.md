# Account UX principles

Short rules for every Account surface. Visual tokens live in `docs/SHARED-UI.md`; this doc is about **jobs and comprehension**.

## Mental model

Account is the **SSO hub + tenant admin**, not CRM/HR themselves. Users come here to:

1. Sign in / recover access
2. Pick a company
3. Activate a subscription (owners)
4. Open a Brooch app
5. Invite people and manage roles/teams (admins)

## Journeys (happy path)

`Register → set-password email → Login → (select-company?) → Onboarding? → Applications → open app`

Admin branch from shell: `Members / Roles / Teams` (manage perms) · `My Access / Account` (everyone).

## Interaction kit

| Pattern | Use when |
|---------|----------|
| **Page + table/list** | Browse many rows (members, roles) |
| **Cards** | Choose one of few options (apps, packages, companies) |
| **Wizard (≤3 steps)** | Multi-decision create (invite) |
| **Dialog** | Confirm or short form |
| **Drawer / panel** | Inspect one entity without leaving the list |
| **Tree** | Permission grants — start collapsed |

Never show four job areas at once in one scrollable dialog.

## Copy

- Verb-first CTAs: “Invite member”, “Continue”, “Open CRM”
- One primary action per view
- Explain *what happens next* after submit (email, redirect, payment verify)
- Prefer human names over keys; put technical keys behind secondary detail
- AR and EN must say the same thing

## Feedback

- Loading: skeleton for first paint; busy control/`aria-busy` for actions
- Errors: global banner only (no page-local HTTP error panels)
- Empty: name the job + one CTA when the user can act
- Success: short notice, then clear next step

## Authz UI

Permissions gate **buttons and links**, never routes. Hide or disable actions the caller cannot perform; never offer edits the API will reject (system/owner roles).

## Accessibility & RTL

- Focus the main heading after navigation and step changes
- Icon-only controls need accessible names
- Logical CSS (`ps`/`pe`, `start`/`end`); verify AR
- WCAG AA contrast on CRM tokens

## Shipping

One page or one dialog family per PR when possible. No invented APIs.
