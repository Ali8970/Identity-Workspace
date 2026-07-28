import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ShellNavItem } from '../../layouts/shell-nav.model';

@Component({
  selector: 'app-shell-sidebar',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  template: `
    <aside
      class="shell-sidebar"
      [class.shell-sidebar--collapsed]="collapsed()"
      [class.shell-sidebar--mobile-open]="mobileOpen()"
      aria-label="Main navigation"
    >
      <div class="shell-sidebar__head">
        <a routerLink="/applications" class="shell-sidebar__brand" (click)="onNavigate()">
          <span class="shell-sidebar__mark" aria-hidden="true">B</span>
          <span class="shell-sidebar__brand-text">
            <span class="shell-sidebar__brand-name">Brooch</span>
            <span class="shell-sidebar__brand-sub">Identity</span>
          </span>
        </a>
      </div>

      <nav class="shell-sidebar__nav">
        @for (item of items(); track item.route) {
          <a
            class="shell-sidebar__link"
            [routerLink]="item.route"
            routerLinkActive="shell-sidebar__link--active"
            ariaCurrentWhenActive="page"
            [attr.title]="collapsed() ? (item.labelKey | translate) : null"
            (click)="onNavigate()"
          >
            <span class="shell-sidebar__icon" aria-hidden="true">
              @switch (item.icon) {
                @case ('applications') {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                    <rect x="3" y="3" width="7" height="7" rx="1.5" />
                    <rect x="14" y="3" width="7" height="7" rx="1.5" />
                    <rect x="3" y="14" width="7" height="7" rx="1.5" />
                    <rect x="14" y="14" width="7" height="7" rx="1.5" />
                  </svg>
                }
                @case ('members') {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                    <circle cx="9" cy="8" r="3.5" />
                    <path d="M2.5 19.5c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" />
                    <path d="M16.5 11.5a2.5 2.5 0 1 1 0-5" />
                    <path d="M19.5 19.5a5.5 5.5 0 0 0-4-4.8" />
                  </svg>
                }
                @case ('roles') {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                    <path d="M12 3 4 7v6c0 5 3.5 7.7 8 8 4.5-.3 8-3 8-8V7l-8-4Z" />
                    <path d="m9.5 12 1.8 1.8L15 10.2" />
                  </svg>
                }
                @case ('permissions') {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                    <circle cx="8" cy="15" r="4.5" />
                    <path d="M11.5 12.5 20.5 3.5" />
                    <path d="M16.5 3.5h4v4" />
                  </svg>
                }
                @case ('teams') {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                    <circle cx="12" cy="5" r="2.5" />
                    <circle cx="5" cy="18" r="2.5" />
                    <circle cx="19" cy="18" r="2.5" />
                    <path d="M12 7.5v3M8.5 16.5 10 12M15.5 16.5 14 12" />
                  </svg>
                }
                @case ('my-access') {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                    <circle cx="12" cy="8" r="3.5" />
                    <path d="M5 20c1.2-3.2 3.8-5 7-5s5.8 1.8 7 5" />
                    <path d="M17.5 8.5 19 10l2.5-3" />
                  </svg>
                }
                @case ('account') {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                    <circle cx="12" cy="12" r="3" />
                    <path
                      d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
                    />
                  </svg>
                }
              }
            </span>
            <span class="shell-sidebar__label">{{ item.labelKey | translate }}</span>
          </a>
        }
      </nav>

      <div class="shell-sidebar__foot">
        <p class="shell-sidebar__hint">{{ 'shell.workspace' | translate }}</p>
      </div>
    </aside>
  `,
})
export class ShellSidebar {
  readonly collapsed = input(false);
  readonly mobileOpen = input(false);
  readonly items = input.required<ShellNavItem[]>();

  readonly navigate = output<void>();

  protected onNavigate(): void {
    this.navigate.emit();
  }
}
