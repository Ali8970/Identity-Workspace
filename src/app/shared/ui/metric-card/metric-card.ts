import { Component, input } from '@angular/core';

@Component({
  selector: 'app-metric-card',
  template: `
    <div
      class="box-border flex h-full w-full flex-col gap-2 overflow-hidden rounded-[10px] border-s-4 bg-surface px-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.06)]"
      [class.min-h-[88px]]="size() === 'lg'"
      [class.min-h-[72px]]="size() === 'md'"
      [class.py-[14px]]="size() === 'lg'"
      [class.py-3]="size() === 'md'"
      [style.border-inline-start-color]="accent()"
    >
      <div class="flex w-full items-start gap-3">
        <div
          class="grid shrink-0 place-items-center rounded-lg"
          [class.size-9]="size() === 'lg'"
          [class.size-8]="size() === 'md'"
          [style.background]="'color-mix(in srgb, ' + accent() + ' 8%, transparent)'"
          [style.color]="accent()"
          aria-hidden="true"
        >
          <ng-content />
        </div>
        <div class="min-w-0 flex-1 text-start">
          <p class="m-0 text-[11px] leading-[16.5px] font-semibold text-text-muted">{{ label() }}</p>
          <p
            class="mt-1 mb-0 break-words"
            [class.text-[26px]]="size() === 'lg'"
            [class.leading-[26px]]="size() === 'lg'"
            [class.font-extrabold]="size() === 'lg'"
            [class.tabular-nums]="size() === 'lg'"
            [class.text-[15px]]="size() === 'md'"
            [class.leading-snug]="size() === 'md'"
            [class.font-bold]="size() === 'md'"
            [class.text-text]="valueTone() !== 'danger'"
            [class.text-error]="valueTone() === 'danger'"
          >
            {{ value() }}
          </p>
          @if (hint()) {
            <p class="m-0 pt-[3px] text-[11px] leading-[16.5px] text-[#9ca3af]">{{ hint() }}</p>
          }
        </div>
      </div>
    </div>
  `,
  host: { class: 'block h-full min-w-0' },
})
export class MetricCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly accent = input('#2b5bf9');
  readonly hint = input<string>();
  readonly valueTone = input<'default' | 'danger'>('default');
  readonly size = input<'lg' | 'md'>('md');
}
