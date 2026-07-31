import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { TeamsApi } from '../../../core/api/workspace-api.service';
import {
  TeamDetailDto,
  TeamMembershipDdlItem,
  TeamNode,
} from '../models/workspace-feature.model';

@Service()
export class TeamsService {
  private readonly teamsApi = inject(TeamsApi);

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
