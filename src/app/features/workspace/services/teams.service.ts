import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PERMISSIONS } from '../../../constants/app.constants';
import { TeamsApi } from '../../../core/api/workspace-api.service';
import { SessionStore } from '../../../core/auth/session.store';
import {
  TeamDetailDto,
  TeamMembershipDdlItem,
  TeamNode,
} from '../models/workspace-feature.model';

@Service()
export class TeamsService {
  private readonly teamsApi = inject(TeamsApi);
  private readonly session = inject(SessionStore);

  canManageTeams(): boolean {
    return this.session.hasPermission(PERMISSIONS.teamsManage);
  }

  loadTree(): Observable<TeamNode[]> {
    return this.teamsApi.tree();
  }

  loadMembershipsDdl(teamId: string): Observable<TeamMembershipDdlItem[]> {
    return this.teamsApi.membershipsDdl(teamId);
  }

  assignManager(teamId: string, managerTenantMembershipId: string): Observable<TeamDetailDto> {
    return this.teamsApi.setManager(teamId, { managerTenantMembershipId });
  }
}
