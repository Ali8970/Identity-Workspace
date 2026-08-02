/**
 * Small presentation helpers shared by workspace pages.
 *
 * These are pure functions rather than a service: they take everything they need as
 * arguments, so they are trivially testable and carry no injection context.
 */

/**
 * Application keys that have a dedicated icon / colour treatment in SCSS.
 * Must stay in step with the `&--<key>` modifiers in `_workspace.scss`.
 */
const STYLED_APPLICATION_KEYS = new Set(['account', 'crm', 'hr']);

/**
 * BEM modifier for an application tile. Unknown applications (the catalogue is
 * open-ended) fall back to the neutral `default` treatment.
 */
export function applicationModifier(applicationKey: string): string {
  return STYLED_APPLICATION_KEYS.has(applicationKey) ? applicationKey : 'default';
}

/**
 * Up to two letters for an avatar chip: initials of the first two name parts, the
 * first two characters of a single-word name, else the first two of the email.
 */
export function nameInitials(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return email.slice(0, 2).toUpperCase();
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}
