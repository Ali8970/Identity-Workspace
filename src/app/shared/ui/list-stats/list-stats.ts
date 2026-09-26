import { Component, input } from '@angular/core';
import { MetricCard } from '../metric-card/metric-card';
import type { ListStatCard } from './list-stat-card';

@Component({
  selector: 'app-list-stats',
  imports: [MetricCard],
  template: `
    @if (loading()) {
      <div
        class="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] items-stretch gap-3"
        aria-hidden="true"
      >
        @for (i of [0, 1, 2, 3]; track i) {
          <div
            class="h-[88px] animate-pulse rounded-[10px] bg-surface shadow-[0_1px_3px_0_rgba(0,0,0,0.06)]"
          ></div>
        }
      </div>
    } @else {
      <div class="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] items-stretch gap-3">
        @for (stat of stats(); track stat.label) {
          <app-metric-card
            [label]="stat.label"
            [value]="stat.value"
            [accent]="stat.accent"
            [valueTone]="stat.valueTone ?? 'default'"
            size="md"
          >
            @switch (stat.icon) {
              @case ('active') {
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="5.25" stroke="currentColor" stroke-width="1.4" />
                  <path
                    d="M5.5 8.2 7.2 9.9 10.5 6.2"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              }
              @case ('warning') {
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M8 2.5 14 13H2L8 2.5Z"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M8 6.5v3M8 11.2v.01"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linecap="round"
                  />
                </svg>
              }
              @case ('info') {
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="5.25" stroke="currentColor" stroke-width="1.4" />
                  <path
                    d="M8 7.2V11M8 5.2v.01"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linecap="round"
                  />
                </svg>
              }
              @case ('users') {
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="5.5" r="2.25" stroke="currentColor" stroke-width="1.4" />
                  <path
                    d="M3.5 13c.6-2.2 2.2-3.3 4.5-3.3S11.9 10.8 12.5 13"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linecap="round"
                  />
                </svg>
              }
              @default {
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M3 13.5V6.5L8 3.5l5 3v7"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linejoin="round"
                  />
                  <path d="M6.5 13.5V9h3v4.5" stroke="currentColor" stroke-width="1.4" />
                </svg>
              }
            }
          </app-metric-card>
        }
      </div>
    }
  `,
  host: { class: 'block' },
})
export class ListStats {
  readonly stats = input.required<readonly ListStatCard[]>();
  readonly loading = input(false);
}
