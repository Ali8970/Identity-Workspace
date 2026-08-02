import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

export interface MultiSelectOption {
  value: string;
  label: string;
  meta?: string;
  depth?: number;
  disabled?: boolean;
}

let nextPanelId = 0;

@Component({
  selector: 'app-multi-select',
  imports: [TranslatePipe],
  templateUrl: './multi-select.html',
  host: {
    class: 'ui-ms',
    '[class.ui-ms--open]': 'open()',
    '[class.ui-ms--disabled]': 'disabled()',
    '(keydown.escape)': 'onEscape($event)',
  },
})
export class MultiSelect {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  readonly options = input.required<MultiSelectOption[]>();
  readonly value = model<string[]>([]);
  readonly placeholder = input('');
  readonly filterable = input(true);
  readonly disabled = input(false);
  readonly maxChips = input(2);
  readonly emptyMessage = input('');
  readonly filterPlaceholder = input('');
  readonly labelledBy = input('');
  readonly panelId = input(`ui-ms-panel-${++nextPanelId}`);

  private readonly trigger = viewChild.required<ElementRef<HTMLElement>>('trigger');
  private readonly filterInput = viewChild<ElementRef<HTMLInputElement>>('filterInput');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  protected readonly open = signal(false);
  protected readonly panelReady = signal(false);
  protected readonly filterQuery = signal('');
  protected readonly activeIndex = signal(-1);
  protected readonly panelTop = signal(0);
  protected readonly panelLeft = signal(0);
  protected readonly panelWidth = signal(0);
  protected readonly panelMaxHeight = signal(280);
  protected readonly panelPlacement = signal<'below' | 'above'>('below');

  /** The `<ul role="listbox">` that `aria-controls` / `aria-activedescendant` point at. */
  protected readonly listboxId = computed(() => `${this.panelId()}-listbox`);

  /**
   * Id of the arrow-highlighted option, or null when nothing is active.
   * Set on the focused filter input so a screen reader announces the option as the
   * user arrows through the list — without this, keyboard navigation is silent.
   */
  protected readonly activeOptionId = computed(() => {
    const index = this.activeIndex();
    return index >= 0 && index < this.filteredOptions().length ? this.optionId(index) : null;
  });

  protected readonly selectedSet = computed(() => new Set(this.value()));

  protected readonly selectedOptions = computed(() => {
    const selected = this.selectedSet();
    return this.options().filter((option) => selected.has(option.value));
  });

  protected readonly visibleChips = computed(() =>
    this.selectedOptions().slice(0, this.maxChips()),
  );

  protected readonly overflowCount = computed(() =>
    Math.max(0, this.selectedOptions().length - this.maxChips()),
  );

  protected readonly filteredOptions = computed(() => {
    const query = this.filterQuery().trim().toLowerCase();
    const options = this.options();
    if (!query) {
      return options;
    }
    return options.filter((option) => {
      const haystack = `${option.label} ${option.meta ?? ''}`.toLowerCase();
      return haystack.includes(query);
    });
  });

  protected readonly allFilteredSelected = computed(() => {
    const filtered = this.filteredOptions().filter((option) => !option.disabled);
    if (filtered.length === 0) {
      return false;
    }
    const selected = this.selectedSet();
    return filtered.every((option) => selected.has(option.value));
  });

  constructor() {
    afterNextRender(() => {
      document.addEventListener('pointerdown', this.onDocumentPointerDown, true);
      window.addEventListener('resize', this.onViewportChange, true);
      window.addEventListener('scroll', this.onViewportChange, true);
      this.destroyRef.onDestroy(() => {
        document.removeEventListener('pointerdown', this.onDocumentPointerDown, true);
        window.removeEventListener('resize', this.onViewportChange, true);
        window.removeEventListener('scroll', this.onViewportChange, true);
        this.detachPanelFromBody();
      });
    });
  }

  private readonly onDocumentPointerDown = (event: PointerEvent): void => {
    if (!this.open()) {
      return;
    }
    const target = event.target as Node | null;
    if (!target) {
      return;
    }
    const inHost = this.host.nativeElement.contains(target);
    const inPanel = this.panel()?.nativeElement.contains(target) ?? false;
    if (!inHost && !inPanel) {
      this.close();
    }
  };

  private readonly onViewportChange = (): void => {
    if (this.open()) {
      this.updatePanelPosition();
    }
  };

  protected togglePanel(): void {
    if (this.disabled()) {
      return;
    }
    if (this.open()) {
      this.close();
      return;
    }
    this.openPanel();
  }

  protected openPanel(): void {
    this.panelReady.set(false);
    this.open.set(true);
    this.filterQuery.set('');
    this.activeIndex.set(-1);
    afterNextRender(
      () => {
        this.attachPanelToBody();
        this.updatePanelPosition();
        this.panelReady.set(true);
        requestAnimationFrame(() => {
          this.attachPanelToBody();
          this.updatePanelPosition();
          this.filterInput()?.nativeElement.focus();
        });
      },
      { injector: this.injector },
    );
  }

  protected close(): void {
    this.open.set(false);
    this.panelReady.set(false);
    this.filterQuery.set('');
    this.activeIndex.set(-1);
  }

  private attachPanelToBody(): void {
    const panelEl = this.panel()?.nativeElement;
    if (!panelEl) {
      return;
    }
    if (panelEl.parentElement !== document.body) {
      document.body.appendChild(panelEl);
    }
  }

  private detachPanelFromBody(): void {
    const panelEl = this.panel()?.nativeElement;
    if (panelEl?.parentElement === document.body) {
      panelEl.remove();
    }
  }

  private updatePanelPosition(): void {
    const triggerEl = this.trigger().nativeElement;
    const rect = triggerEl.getBoundingClientRect();
    const gap = 6;
    const viewportPadding = 8;
    const preferredMax = 320;
    const maxWidth = Math.max(160, window.innerWidth - viewportPadding * 2);
    const width = Math.min(rect.width, maxWidth);
    let left = rect.left;

    // Keep the panel inside the viewport so it cannot create horizontal scroll.
    if (left + width > window.innerWidth - viewportPadding) {
      left = window.innerWidth - viewportPadding - width;
    }
    left = Math.max(viewportPadding, left);

    const spaceBelow = window.innerHeight - rect.bottom - gap - viewportPadding;
    const spaceAbove = rect.top - gap - viewportPadding;
    const placeAbove = spaceBelow < 180 && spaceAbove > spaceBelow;

    this.panelPlacement.set(placeAbove ? 'above' : 'below');
    this.panelWidth.set(width);
    this.panelLeft.set(left);
    this.panelMaxHeight.set(
      Math.max(160, Math.min(preferredMax, placeAbove ? spaceAbove : spaceBelow)),
    );

    if (placeAbove) {
      const panelEl = this.panel()?.nativeElement;
      const measuredHeight = panelEl?.offsetHeight ?? Math.min(preferredMax, spaceAbove);
      this.panelTop.set(Math.max(viewportPadding, rect.top - gap - measuredHeight));
    } else {
      this.panelTop.set(rect.bottom + gap);
    }
  }

  protected onEscape(event: Event): void {
    if (!this.open()) {
      return;
    }
    event.stopPropagation();
    this.close();
  }

  protected stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  protected onFilterInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.filterQuery.set(target.value);
    this.activeIndex.set(this.filteredOptions().length > 0 ? 0 : -1);
    queueMicrotask(() => this.updatePanelPosition());
  }

  protected isSelected(value: string): boolean {
    return this.selectedSet().has(value);
  }

  protected setActiveIndex(index: number): void {
    this.activeIndex.set(index);
  }

  protected toggleOption(option: MultiSelectOption, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.disabled() || option.disabled) {
      return;
    }
    const current = this.value();
    if (current.includes(option.value)) {
      this.value.set(current.filter((id) => id !== option.value));
      return;
    }
    this.value.set([...current, option.value]);
  }

  protected removeChip(value: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled()) {
      return;
    }
    this.value.set(this.value().filter((id) => id !== value));
  }

  protected clearAll(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled()) {
      return;
    }
    this.value.set([]);
  }

  protected toggleSelectAll(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled()) {
      return;
    }
    const filtered = this.filteredOptions().filter((option) => !option.disabled);
    const filteredValues = filtered.map((option) => option.value);
    if (this.allFilteredSelected()) {
      const remove = new Set(filteredValues);
      this.value.set(this.value().filter((id) => !remove.has(id)));
      return;
    }
    const next = new Set(this.value());
    for (const id of filteredValues) {
      next.add(id);
    }
    this.value.set([...next]);
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (this.disabled()) {
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!this.open()) {
        this.openPanel();
      }
    }
  }

  protected onPanelKeydown(event: KeyboardEvent): void {
    const options = this.filteredOptions();
    if (options.length === 0) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex.update((index) => (index + 1) % options.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex.update((index) => (index <= 0 ? options.length - 1 : index - 1));
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      const index = this.activeIndex();
      if (index >= 0 && index < options.length) {
        event.preventDefault();
        this.toggleOption(options[index]);
      }
    }
  }

  protected optionId(index: number): string {
    return `${this.panelId()}-opt-${index}`;
  }

  protected optionIndent(depth = 0): string {
    return `${0.75 + depth * 0.85}rem`;
  }
}
