import { Service } from '@angular/core';

@Service()
export class SsoHandshakeService {
  navigate(url: string): void {
    window.location.assign(url);
  }
}
