import { Service, inject } from '@angular/core';
import { SessionStore } from '../../../core/auth/session.store';
import { SsoHandshakeService } from '../../../core/auth/sso-handshake.service';
import { isNavigableRedirect } from '../../../core/error/error.model';

@Service()
export class ApplicationsService {
  private readonly session = inject(SessionStore);
  private readonly sso = inject(SsoHandshakeService);

  readonly availableApplications = () => this.session.current()?.availableApplications ?? [];

  canLaunch(baseUrl: string): boolean {
    return isNavigableRedirect(baseUrl);
  }

  open(baseUrl: string): void {
    if (isNavigableRedirect(baseUrl)) {
      this.sso.navigate(baseUrl);
    }
  }
}
