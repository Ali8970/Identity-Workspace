import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PermissionsApi } from '../../../core/api/workspace-api.service';
import { PermissionCatalogItem } from '../models/workspace-feature.model';

@Service()
export class PermissionsService {
  private readonly permissionsApi = inject(PermissionsApi);

  loadCatalog(): Observable<PermissionCatalogItem[]> {
    return this.permissionsApi.catalog();
  }
}
