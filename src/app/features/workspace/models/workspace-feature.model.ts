/** Re-export wire DTOs for workspace feature pages. */
export type {
  AddMemberRequest,
  AddMemberResult,
  MemberListItem,
  MemberRolesDto,
  MyAccessResponse,
  MyAccessRoleDto,
  MyAccessTeamDto,
  PermissionCatalogItem,
  RoleListItem,
  SessionDto,
  SetTeamManagerRequest,
  TeamDetailDto,
  TeamMembershipDdlItem,
  TeamNode,
  TenantDto,
} from '../../../models/workspace.model';

export interface AddMemberFormValue {
  email: string;
  arabicName: string;
  englishName: string;
  roleIds: string[];
  teamIds: string[];
}
