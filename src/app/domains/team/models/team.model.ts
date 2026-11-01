import { TeamKind } from '../enums/team.enums';

/** GET /teams/tree — TeamNodeDto */
export interface TeamNode {
  id: string;
  name: string;
  applicationKey: string | null;
  kind: TeamKind | string;
  managerTenantMembershipId: string | null;
  isMissingManager: boolean;
  memberCount: number;
  children: TeamNode[];
}

export interface TeamListItem {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  applicationKey: string | null;
  kind: TeamKind | string;
  parentTeamId: string | null;
  managerTenantMembershipId: string | null;
  isMissingManager: boolean;
  status: string;
  memberCount: number;
  version: number;
}

export interface CreateTeamRequest {
  name: string;
  description: string | null;
  parentTeamId: string;
  managerTenantMembershipId: string | null;
}

export interface UpdateTeamRequest {
  name: string;
  description: string | null;
  parentTeamId: string | null;
}

export interface AddTeamMemberRequest {
  tenantMembershipId: string;
}

/** Localized label used by DDL endpoints (`title.ar` / `title.en`). */
export interface LocalizedTitle {
  ar: string;
  en: string;
}

/** GET /teams/{teamId}/memberships/ddl */
export interface TeamMembershipDdlItem {
  id: string;
  title: LocalizedTitle;
}

/** PUT /teams/{teamId}/manager */
export interface SetTeamManagerRequest {
  managerTenantMembershipId: string | null;
}

/** PUT /teams/{teamId}/manager — response data */
export interface TeamDetailDto {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  applicationKey: string | null;
  kind: TeamKind | string;
  parentTeamId: string | null;
  managerTenantMembershipId: string | null;
  isMissingManager: boolean;
  status: string;
  memberCount: number;
  version: number;
}

export interface TeamListFilters {
  applicationKey?: string;
  tenantMembershipId?: string;
}
