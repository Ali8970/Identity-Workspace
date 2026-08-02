import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TranslatePipe],
  template: `
    <a class="app-skip-link" href="#main-content">{{ 'ui.skipToContent' | translate }}</a>
    <router-outlet />
  `,
})
export class App {}
