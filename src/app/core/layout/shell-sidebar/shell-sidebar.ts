import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ShellNavGroup } from '../shell/shell-nav.model';

/**
 * Shell sidebar — Figma Identity redesign (node 96:9):
 * 14px / 21px Medium nav, 20px icons, 44px rows, 11px section titles.
 */
@Component({
  selector: 'app-shell-sidebar',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  host: {
    class: 'flex h-full min-h-dvh w-full flex-col',
    style:
      "background: var(--sidebar-bg); color: var(--sidebar-text, #ffffff); font-family: 'Lama Sans', var(--font-family), sans-serif;",
  },
  template: `
    <div
      class="m-0 flex h-16 shrink-0 items-center justify-center border-b-[1.468px] border-solid border-white/10 px-[18px]"
    >
      <a
        routerLink="/applications"
        class="block text-inherit no-underline"
        style="color: var(--sidebar-text, #ffffff)"
        (click)="navigate.emit()"
        [attr.aria-label]="'shell.applications' | translate"
      >
        <img
          class="block h-[49px] w-[156px]"
          src="images/brooch-logo.svg"
          width="156"
          height="49"
          alt="Brooch"
        />
      </a>
      @if (showClose()) {
        <button
          type="button"
          class="ms-2 inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border-[1.468px] border-solid border-white/10 text-white hover:bg-white/10"
          [attr.aria-label]="'shell.closeSidebar' | translate"
          (click)="closed.emit()"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </button>
      }
    </div>

    <nav
      class="min-h-0 flex-1 overflow-y-auto px-[18px] py-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-[3px] [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-track]:bg-transparent"
      style="font-family: 'Lama Sans', var(--font-family), sans-serif"
      [attr.aria-label]="'shell.workspace' | translate"
    >
      @for (group of groups(); track group.labelKey; let first = $first) {
        <div
          class="m-0 p-0 [&+&]:mt-[19px] [&+&]:border-t-[0.993px] [&+&]:border-solid [&+&]:border-white/10"
        >
          @if (!first) {
            <div class="flex items-center px-[13px] pt-[18px] pb-2">
              <span class="text-[11px] leading-[16.5px] font-semibold text-white/50">
                {{ group.labelKey | translate }}
              </span>
            </div>
          }
          <ul class="m-0 flex list-none flex-col gap-1 p-0" [class.mt-2]="first">
            @for (item of group.items; track item.route) {
              <li>
                <a
                  class="relative flex h-11 w-full cursor-pointer items-center gap-2 rounded-xl px-[13px] text-start text-[14px] leading-[21px] font-medium text-white no-underline transition-colors duration-200 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  style="color: #ffffff; font-family: 'Lama Sans', var(--font-family), sans-serif"
                  [routerLink]="item.route"
                  routerLinkActive="is-active bg-white/15 font-medium ltr:shadow-[inset_3px_0_0_0_#fff] rtl:shadow-[inset_-3px_0_0_0_#fff]"
                  ariaCurrentWhenActive="page"
                  (click)="navigate.emit()"
                >
                  <svg
                    class="size-5 shrink-0 text-white"
                    style="color: var(--sidebar-text, #ffffff)"
                    viewBox="0 0 16 16"
                    width="20"
                    height="20"
                    fill="none"
                    aria-hidden="true"
                  >
                    @switch (item.icon) {
                      @case ('applications') {
                        <rect x="2" y="2.5" width="5" height="5" rx="1.2" stroke="currentColor" stroke-width="1.4" />
                        <rect x="9" y="2.5" width="5" height="5" rx="1.2" stroke="currentColor" stroke-width="1.4" />
                        <rect x="2" y="9.5" width="5" height="4" rx="1.2" stroke="currentColor" stroke-width="1.4" />
                        <rect x="9" y="9.5" width="5" height="4" rx="1.2" stroke="currentColor" stroke-width="1.4" />
                      }
                      @case ('members') {
                        <circle cx="8" cy="5.5" r="2.25" stroke="currentColor" stroke-width="1.4" />
                        <path d="M3.5 13c.6-2.2 2.2-3.3 4.5-3.3S11.9 10.8 12.5 13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
                      }
                      @case ('roles') {
                        <path d="M8 2.5 13 4.5v4.2c0 2.8-2 4.6-5 5.3-3-.7-5-2.5-5-5.3V4.5L8 2.5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" />
                      }
                      @case ('teams') {
                        <circle cx="8" cy="3.5" r="1.75" stroke="currentColor" stroke-width="1.4" />
                        <circle cx="3.5" cy="12" r="1.75" stroke="currentColor" stroke-width="1.4" />
                        <circle cx="12.5" cy="12" r="1.75" stroke="currentColor" stroke-width="1.4" />
                        <path d="M8 5.5v2M5.5 10.5 7 8M10.5 10.5 9 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
                      }
                      @case ('my-access') {
                        <circle cx="8" cy="5.5" r="2.25" stroke="currentColor" stroke-width="1.4" />
                        <path d="M3.5 13c.6-2.2 2.2-3.3 4.5-3.3S11.9 10.8 12.5 13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
                        <path d="M11.5 5.5 12.5 6.5 14.5 4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
                      }
                      @case ('account') {
                        <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.4" />
                        <path d="M8 2.5v1.5M8 12v1.5M2.5 8h1.5M12 8h1.5M4.1 4.1l1.1 1.1M10.8 10.8l1.1 1.1M4.1 11.9l1.1-1.1M10.8 5.2l1.1-1.1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
                      }
                    }
                  </svg>
                  <span
                    class="min-w-0 flex-1 text-[14px] leading-[21px] font-medium text-white"
                    style="color: var(--sidebar-text, #ffffff)"
                  >
                    {{ item.labelKey | translate }}
                  </span>
                </a>
              </li>
            }
          </ul>
        </div>
      }
    </nav>

    @if (userName()) {
      <div class="shrink-0 border-t-[1.468px] border-solid border-white/10 px-2.5 py-3">
        <div class="flex items-center gap-2.5 rounded-lg px-3 py-2.5">
          <div
            class="grid size-8 shrink-0 place-items-center rounded-2xl bg-white text-[13px] leading-[19.5px] font-bold text-[#2a52f2]"
            aria-hidden="true"
          >
            {{ userInitial() }}
          </div>
          <div class="min-w-0 flex-1 text-start">
            <p
              class="m-0 truncate text-xs leading-[18px] font-semibold text-white"
              style="color: #ffffff; font-family: 'Lama Sans', var(--font-family), sans-serif"
            >
              {{ userName() }}
            </p>
            <p class="shell-sidebar-muted m-0 truncate text-[11px] leading-[16.5px] font-normal">
              {{ 'auth.layout.product' | translate }}
            </p>
          </div>
        </div>
      </div>
    }
  `,
})
export class ShellSidebar {
  readonly showClose = input(false);
  readonly groups = input.required<ShellNavGroup[]>();
  readonly userName = input('');
  readonly userInitial = input('?');

  readonly navigate = output<void>();
  readonly closed = output<void>();
}
