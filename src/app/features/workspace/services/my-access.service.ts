import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MeApi } from '../../../core/auth/me-api.service';
import { MyAccessResponse } from '../models/workspace-feature.model';

@Service()
export class MyAccessService {
  private readonly meApi = inject(MeApi);

  loadAccess(): Observable<MyAccessResponse> {
    return this.meApi.access();
  }
}
