/**
 * Human-readable text for a permission code such as `crm.leads.view.all`.
 *
 * Catalogue names win when they are real copy. A name that is itself a code is
 * not copy — those, and bare keys, fall through to `roles.perm.action.*` and
 * `permissions.groups.*`, then a readable token. The raw key is never returned.
 */

export interface PermissionLabelSource {
  pick(ar: string | null | undefined, en: string | null | undefined): string;
  labelOr(key: string, fallback: string): string;
}

export interface PermissionLabelItem {
  nameAr?: string | null;
  nameEn?: string | null;
  resource?: string | null;
  action?: string | null;
}

/** Turns `nurturePool` / `bulk_import` into “Nurture pool” / “Bulk import”. */
export function humanizePermissionToken(value: string): string {
  const text = value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : value;
}

function isPermissionKeyLike(name: string, key: string): boolean {
  const trimmed = name.trim();
  return trimmed === key || (/^[\w.-]+$/.test(trimmed) && trimmed.includes('.'));
}

function splitPermissionKey(key: string): { resource: string; action: string } {
  const parts = key.split('.').filter(Boolean);
  if (parts.length >= 3) {
    return { resource: parts[1], action: parts.slice(2).join('.') };
  }
  if (parts.length === 2) {
    return { resource: parts[0], action: parts[1] };
  }
  return { resource: '', action: key };
}

function translated(language: PermissionLabelSource, key: string): string {
  return language.labelOr(key, '');
}

/**
 * A permission segment is an action when we have one (`edit`, `team`), and a
 * catalogue group otherwise (`units`, `certificates`). Humanize only when
 * neither map has the token, so Arabic never falls through to an English token.
 */
function segmentLabel(language: PermissionLabelSource, part: string): string {
  return (
    translated(language, `roles.perm.action.${part}`) ||
    translated(language, `permissions.groups.${part}`) ||
    humanizePermissionToken(part)
  );
}

function phrase(language: PermissionLabelSource, prefix: string, token: string): string {
  const segments = token.split('.').filter(Boolean);
  if (segments.length === 0) {
    return '';
  }
  if (prefix === 'roles.perm.action.') {
    return segments.map((part) => segmentLabel(language, part)).join(' · ');
  }
  return segments
    .map((part) => language.labelOr(`${prefix}${part}`, humanizePermissionToken(part)))
    .join(' · ');
}

/** Application or module heading. Never returns the raw key. */
export function permissionScopeLabel(language: PermissionLabelSource, key: string): string {
  return (
    translated(language, `myAccess.apps.${key}`) ||
    translated(language, `permissions.apps.${key}`) ||
    translated(language, `permissions.groups.${key}`) ||
    humanizePermissionToken(key)
  );
}

function catalogueName(
  language: PermissionLabelSource,
  key: string,
  item?: PermissionLabelItem | null,
): string {
  const name = item ? language.pick(item.nameAr, item.nameEn).trim() : '';
  return name && !isPermissionKeyLike(name, key) ? name : '';
}

/** Action only, for a row that already sits under its resource heading. */
export function permissionActionLabel(
  language: PermissionLabelSource,
  key: string,
  item?: PermissionLabelItem | null,
): string {
  const named = catalogueName(language, key, item);
  if (named) {
    return named;
  }
  const action = item?.action?.trim() || splitPermissionKey(key).action;
  return phrase(language, 'roles.perm.action.', action) || permissionDisplayLabel(language, key, item);
}

export function permissionDisplayLabel(
  language: PermissionLabelSource,
  key: string,
  item?: PermissionLabelItem | null,
): string {
  const name = catalogueName(language, key, item);
  if (name) {
    return name;
  }

  const parsed = splitPermissionKey(key);
  const resource = item?.resource?.trim() || parsed.resource;
  const action = item?.action?.trim() || parsed.action;
  const actionLabel = phrase(language, 'roles.perm.action.', action);
  const resourceLabel = phrase(language, 'permissions.groups.', resource);

  if (actionLabel && resourceLabel && resourceLabel.toLowerCase() !== actionLabel.toLowerCase()) {
    return `${actionLabel} — ${resourceLabel}`;
  }
  return actionLabel || resourceLabel || humanizePermissionToken(key);
}
