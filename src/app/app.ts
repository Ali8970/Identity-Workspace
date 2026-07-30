import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <a class="app-skip-link" href="#main-content">Skip to content</a>
    <router-outlet />
  `,
})
export class App {}
