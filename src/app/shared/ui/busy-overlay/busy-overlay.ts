import { Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Blocking overlay for actions the user must not interrupt — signing out,
 * switching company, handing off to another app.
 */
@Component({
  selector: 'app-busy-overlay',
  imports: [TranslatePipe],
  template: `
    <div class="ui-overlay" role="status" aria-live="polite" aria-busy="true">
      <div class="ui-overlay__panel">
        <span class="ui-overlay__spinner" aria-hidden="true"></span>
        <span>{{ messageKey() | translate }}</span>
      </div>
    </div>
  `,
})
export class BusyOverlay {
  /** Translation key for the message shown next to the spinner. */
  readonly messageKey = input.required<string>();
}
