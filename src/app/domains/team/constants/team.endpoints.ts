import { API_BASE as base } from '@core/http/api-base';

/** Teams (Tenant module). */
export const TEAM_ENDPOINTS = {
  teams: `${base}/teams`,
  teamsTree: `${base}/teams/tree`,
  teamsMissingManager: `${base}/teams/missing-manager`,
  team: (teamId: string) => `${base}/teams/${teamId}`,
  teamMembershipsDdl: (teamId: string) => `${base}/teams/${teamId}/memberships/ddl`,
  teamManager: (teamId: string) => `${base}/teams/${teamId}/manager`,
  teamMembers: (teamId: string) => `${base}/teams/${teamId}/members`,
  teamMember: (teamId: string, membershipId: string) =>
    `${base}/teams/${teamId}/members/${membershipId}`,
} as const;
