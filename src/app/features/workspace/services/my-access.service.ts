import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MeApi } from '../../../core/auth/me-api.service';
import { MyAccessDto } from '../models/workspace-feature.model';

@Service()
export class MyAccessService {
  private readonly meApi = inject(MeApi);

  loadAccess(): Observable<MyAccessDto> {
    return this.meApi.access() as Observable<MyAccessDto>;
  }
}
