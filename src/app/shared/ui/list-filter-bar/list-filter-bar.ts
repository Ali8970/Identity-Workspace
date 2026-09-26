import { Component, computed, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-list-filter-bar',
  imports: [ReactiveFormsModule],
  template: `
    <div
      class="flex w-full flex-col border-b-[1.468px] border-border-subtle bg-surface"
      role="search"
    >
      <div class="flex items-center gap-2.5 px-[18px] py-[14px] max-md:flex-wrap max-md:gap-2">
        <div class="relative min-w-0 flex-1 max-md:basis-full">
          <button
            type="button"
            class="absolute start-1.5 top-1/2 z-10 inline-flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-text-muted hover:bg-surface-muted hover:text-info disabled:cursor-not-allowed disabled:opacity-50"
            [disabled]="disabled()"
            [attr.aria-label]="searchPlaceholder()"
            (click)="apply.emit()"
          >
            <svg width="15" height="15" viewBox="0 0 14 16" fill="none" aria-hidden="true">
              <circle cx="6" cy="6" r="4.25" stroke="currentColor" stroke-width="1.5" />
              <path
                d="M9.2 9.8 12 13"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </button>
          <input
            type="search"
            class="list-filter-control h-10 w-full rounded-lg border-[1.468px] border-border-button bg-surface ps-[42px] pe-3 text-[13px] text-text outline-none placeholder:text-text-muted focus:border-border-button focus:outline-none focus-visible:outline-none disabled:opacity-60 [&::-webkit-search-cancel-button]:appearance-none"
            [formControl]="searchControl()"
            [placeholder]="searchPlaceholder()"
            [attr.aria-label]="searchPlaceholder()"
            autocomplete="off"
            (keydown)="onSearchKeydown($event)"
          />
        </div>

        <button
          type="button"
          class="list-filter-control inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-info bg-surface px-[14px] py-[9px] text-[13px] font-medium text-info transition-[background-color,color] hover:bg-primary-light focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:border-border disabled:text-text-disabled"
          [class.bg-primary-light]="expanded()"
          [disabled]="disabled()"
          [attr.aria-expanded]="expanded()"
          [attr.aria-controls]="panelId"
          (click)="togglePanel()"
        >
          <span>{{ otherFiltersLabel() }}</span>
          @if (hasActiveFilters()) {
            <span
              class="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[9px] bg-info px-[5px] text-[11px] font-bold text-on-primary"
              aria-hidden="true"
            >
              {{ activeFilterCount() }}
            </span>
          }
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M2.5 4.5h11M4.5 8h7M6.5 11.5h3"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>

      @if (expanded()) {
        <div
          class="flex flex-wrap items-end justify-start gap-3 border-t border-[#dddddd]/87 px-[18px] py-3 max-md:justify-stretch"
          [id]="panelId"
        >
          <div class="flex min-w-0 flex-1 flex-wrap items-end gap-3 max-md:w-full">
            <ng-content />
          </div>
          <div class="flex shrink-0 items-center gap-3 max-md:w-full">
            <button
              type="button"
              class="list-filter-control inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-info bg-info px-4 text-[13px] font-medium text-on-primary hover:border-info-hover hover:bg-info-hover focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 max-md:flex-1"
              [disabled]="disabled()"
              (click)="apply.emit()"
            >
              {{ applyLabel() }}
            </button>
            <button
              type="button"
              class="list-filter-control inline-flex h-10 cursor-pointer items-center justify-center rounded-[10px] border border-border bg-surface px-[19px] text-[12px] font-medium text-text hover:bg-surface-muted focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 max-md:flex-1"
              [disabled]="disabled()"
              (click)="clear.emit()"
            >
              {{ clearLabel() }}
            </button>
          </div>
        </div>
      }
    </div>
  `,
  host: { class: 'block' },
})
export class ListFilterBar {
  readonly searchControl = input.required<FormControl<string>>();
  readonly searchPlaceholder = input.required<string>();
  readonly otherFiltersLabel = input.required<string>();
  readonly applyLabel = input.required<string>();
  readonly clearLabel = input.required<string>();
  readonly disabled = input(false);
  readonly activeFilterCount = input(0);
  readonly apply = output<void>();
  readonly clear = output<void>();

  readonly expanded = signal(false);
  readonly panelId = `list-filter-panel-${Math.random().toString(36).slice(2, 9)}`;
  readonly hasActiveFilters = computed(() => this.activeFilterCount() > 0);

  togglePanel(): void {
    this.expanded.update((open) => !open);
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.apply.emit();
    }
  }
}
