import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { ACCESS_ENDPOINTS } from '../constants/access.endpoints';
import { PermissionCatalogItem } from '../models/access.model';
import { unwrapData } from '@core/http/unwrap';
import { toParams } from '@core/http/http-params';
import { ApiResponse } from '@shared/models/api-response.model';

@Service()
export class PermissionsApi {
  private readonly http = inject(HttpClient);

  /** Omit applicationKey for the whole catalogue. */
  catalog(applicationKey?: string): Observable<PermissionCatalogItem[]> {
    return this.http
      .get<ApiResponse<PermissionCatalogItem[]>>(ACCESS_ENDPOINTS.permissions, {
        withCredentials: true,
        params: toParams({ applicationKey }),
      })
      .pipe(unwrapData());
  }
}
