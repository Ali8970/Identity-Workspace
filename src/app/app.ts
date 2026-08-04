import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LoadingBar } from './shared/ui/loading-bar/loading-bar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TranslatePipe, LoadingBar],
  template: `
    <a class="app-skip-link" href="#main-content">{{ 'ui.skipToContent' | translate }}</a>
    <app-loading-bar />
    <router-outlet />
  `,
})
export class App {}
