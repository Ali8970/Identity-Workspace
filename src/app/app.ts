import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { environment } from '../environments/environment';
import { MockToolbar } from './core/mock/mock-toolbar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MockToolbar],
  template: `
    <a class="app-skip-link" href="#main-content">Skip to content</a>
    <router-outlet />
    @if (showMock) {
      <app-mock-toolbar />
    }
  `,
})
export class App {
  protected readonly showMock = environment.showMockToolbar && environment.useMockApi;
}
