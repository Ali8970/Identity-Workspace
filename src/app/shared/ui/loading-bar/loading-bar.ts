import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { HttpActivityService } from '../../../core/loading/http-activity.service';

/**
 * App-wide progress bar for any in-flight API call. Non-blocking by design — the
 * page stays usable, and blocking work (logout, company switch) uses BusyOverlay.
 */
@Component({
  selector: 'app-loading-bar',
  imports: [TranslatePipe],
  template: `
    @if (activity.active()) {
      <div class="ui-loading-bar" role="status" aria-live="polite">
        <span class="ui-loading-bar__fill" aria-hidden="true"></span>
        <span class="visually-hidden">{{ 'ui.loading' | translate }}</span>
      </div>
    }
  `,
})
export class LoadingBar {
  protected readonly activity = inject(HttpActivityService);
}
