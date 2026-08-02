import { Service } from '@angular/core';

@Service()
export class SsoHandshakeService {
  /**
   * Cross-app handoff after sign-in / intent consumption.
   * Uses replace so auth pages (/login, /select-company) are not left in history.
   */
  navigate(url: string): void {
    window.location.replace(url);
  }

  /** Open a sibling app from the workspace — keeps Account in the history stack. */
  assign(url: string): void {
    window.location.assign(url);
  }
}
