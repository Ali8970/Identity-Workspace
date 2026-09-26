import { Component, input } from '@angular/core';
import type { PanelTone } from '../panel-tone';

@Component({
  selector: 'app-panel-section',
  template: `
    <section class="panel-section" [attr.data-tone]="tone()">
      <header class="panel-section__header">
        <div class="panel-section__heading">
          <span class="panel-section__mark" aria-hidden="true"></span>
          <div class="min-w-0 flex-1">
            <h2 class="panel-section__title">{{ title() }}</h2>
            @if (description(); as detail) {
              <p class="panel-section__description">{{ detail }}</p>
            }
          </div>
        </div>
        <div class="panel-section__actions">
          <ng-content select="[panelActions]" />
        </div>
      </header>
      <div class="panel-section__body">
        <ng-content />
      </div>
    </section>
  `,
  host: { class: 'block h-full' },
})
export class PanelSection {
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
  readonly tone = input<PanelTone>('neutral');
}
