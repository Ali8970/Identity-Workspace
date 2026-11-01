/**
 * What the signed-in user may hand out: an owner may grant anything an application offers; anyone
 * else only the permission keys they already hold in that application. The backend enforces the
 * same rule — this only keeps the UI from offering grants it would reject.
 */
export interface RoleGrantScope {
  isOwner: boolean;
  keysByApplication: ReadonlyMap<string, ReadonlySet<string>>;
}
