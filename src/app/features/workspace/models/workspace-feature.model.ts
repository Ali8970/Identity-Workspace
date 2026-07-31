/** Re-export wire DTOs for workspace feature pages. */
export type {
  AddMemberRequest,
  AddMemberResult,
  MemberListItem,
  MyAccessDto,
  PackageDto,
  PermissionCatalogItem,
  RoleListItem,
  SessionRowDto,
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
