/** Re-export wire DTOs for workspace feature pages. */
export type {
  AddMemberRequest,
  AddMemberResult,
  AddTeamMemberRequest,
  CreateRoleRequest,
  CreateTeamRequest,
  MemberListItem,
  MemberRolesDto,
  MyAccessResponse,
  MyAccessRoleDto,
  MyAccessTeamDto,
  PermissionCatalogItem,
  ResendActivationResult,
  RoleListItem,
  RoleMembershipsDto,
  RolePermissionsDto,
  SessionDto,
  SetTeamManagerRequest,
  TeamDetailDto,
  TeamListItem,
  TeamMembershipDdlItem,
  TeamNode,
  TenantDto,
  UpdateRoleRequest,
  UpdateTeamRequest,
} from '../../../models/workspace.model';

export interface AddMemberFormValue {
  email: string;
  arabicName: string;
  englishName: string;
  applicationKeys: string[];
  roleIds: string[];
  teamIds: string[];
}
