import { Service, computed, inject } from '@angular/core';
import { PERMISSIONS } from './permission-keys';
import { SessionStore } from './session.store';

/**
 * The one place that turns the session's effective permissions into capabilities.
 *
 * Capabilities gate actions and navigation links only — never routes (`identity-domain.mdc`):
 * the backend's 403 is the truth, this only keeps the UI from offering what it would refuse.
 */
@Service()
export class AccessPolicy {
  private readonly session = inject(SessionStore);

  private can(permission: string) {
    return computed(() => this.session.permissions().includes(permission));
  }

  readonly canReadMembers = this.can(PERMISSIONS.membershipsRead);
  readonly canManageMembers = this.can(PERMISSIONS.membershipsManage);
  readonly canReadRoles = this.can(PERMISSIONS.rolesRead);
  readonly canManageRoles = this.can(PERMISSIONS.rolesManage);
  readonly canReadPermissions = this.can(PERMISSIONS.permissionsRead);
  readonly canReadTeams = this.can(PERMISSIONS.teamsRead);
  readonly canManageTeams = this.can(PERMISSIONS.teamsManage);
}
