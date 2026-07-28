import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { TeamsApi } from '../../../core/api/workspace-api.service';
import { TeamNode } from '../models/workspace-feature.model';

@Service()
export class TeamsService {
  private readonly teamsApi = inject(TeamsApi);

  loadTree(): Observable<TeamNode[]> {
    return this.teamsApi.tree();
  }
}
