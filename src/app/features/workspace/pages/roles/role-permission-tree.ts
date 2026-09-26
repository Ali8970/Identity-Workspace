import { Component, computed, inject, input, model, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../../core/i18n/language.service';
import { PermissionCatalogItem } from '../../models/workspace-feature.model';

interface PermissionEntry {
  key: string;
  label: string;
  action: string;
  haystack: string;
}

interface ResourceNode {
  resource: string;
  label: string;
  entries: PermissionEntry[];
}

interface ModuleNode {
  module: string;
  label: string;
  resources: ResourceNode[];
  keys: string[];
}

type EntryState = 'selected' | 'available' | 'locked';

function humanize(value: string): string {
  const text = value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[._-]+/g, ' ')
    .trim()
    .toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : value;
}

function isKeyLike(name: string, key: string): boolean {
  return name === key || (/^[\w.-]+$/.test(name) && name.includes('.'));
}

@Component({
  selector: 'app-role-permission-tree',
  imports: [TranslatePipe],
  host: { class: 'workspace-perm-tree' },
  template: `
    <div class="workspace-perm-tree__toolbar">
      <div class="workspace-listbar__search workspace-perm-tree__search">
        <span class="workspace-listbar__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4.5 4.5" />
          </svg>
        </span>
        <input
          type="search"
          class="workspace-listbar__input"
          [id]="idPrefix() + '-search'"
          [value]="search()"
          (input)="search.set($any($event.target).value)"
          [placeholder]="'roles.perm.search' | translate"
          [attr.aria-label]="'roles.perm.search' | translate"
          [attr.aria-controls]="idPrefix() + '-modules'"
        />
      </div>

      <div class="workspace-perm-tree__tools" role="group" [attr.aria-label]="'roles.perm.tools' | translate">
        @if (modules().length > 1 && !searching()) {
          <button type="button" class="workspace-perm-tree__tool" (click)="expandAll()">
            {{ 'roles.perm.expandAll' | translate }}
          </button>
          <button type="button" class="workspace-perm-tree__tool" (click)="collapseAll()">
            {{ 'roles.perm.collapseAll' | translate }}
          </button>
        }
        @if (editable()) {
          <button
            type="button"
            class="workspace-perm-tree__tool workspace-perm-tree__tool--accent"
            [disabled]="visibleUnselectedGrantable().length === 0"
            (click)="selectVisible()"
          >
            {{ (searching() ? 'roles.perm.selectMatching' : 'roles.perm.selectAll') | translate }}
          </button>
          <button
            type="button"
            class="workspace-perm-tree__tool workspace-perm-tree__tool--muted"
            [disabled]="visibleSelectedGrantable().length === 0"
            (click)="clearVisible()"
          >
            {{ (searching() ? 'roles.perm.clearMatching' : 'roles.perm.clearAll') | translate }}
          </button>
        }
      </div>
    </div>

    <div class="workspace-perm-tree__summary">
      <span class="workspace-perm-tree__count" aria-live="polite">
        @if (editable()) {
          {{
            'roles.perm.selectedCount'
              | translate: { selected: selectedSet().size, total: allKeys().length }
          }}
        } @else {
          {{ 'roles.permissionCount' | translate: { count: allKeys().length } }}
        }
      </span>
      @if (editable()) {
        <ul class="workspace-perm-tree__legend" [attr.aria-label]="'roles.perm.legend' | translate">
          <li class="workspace-perm-tree__legend-item">
            <span class="workspace-perm-tree__swatch workspace-perm-tree__swatch--selected" aria-hidden="true"></span>
            {{ 'roles.perm.legendSelected' | translate }}
          </li>
          <li class="workspace-perm-tree__legend-item">
            <span class="workspace-perm-tree__swatch" aria-hidden="true"></span>
            {{ 'roles.perm.legendAvailable' | translate }}
          </li>
          @if (hasLocked()) {
            <li class="workspace-perm-tree__legend-item">
              <span
                class="workspace-perm-tree__swatch workspace-perm-tree__swatch--locked"
                aria-hidden="true"
              ></span>
              {{ 'roles.perm.legendNotGrantable' | translate }}
            </li>
          }
        </ul>
      }
    </div>

    @if (modules().length === 0) {
      <div class="workspace-perm-tree__empty" role="status">
        {{ (editable() ? 'roles.perm.noneAvailable' : 'roles.perm.none') | translate }}
      </div>
    } @else if (visibleModules().length === 0) {
      <div class="workspace-perm-tree__empty" role="status">
        {{ 'roles.perm.noMatches' | translate: { term: search().trim() } }}
      </div>
    } @else {
      <div class="workspace-perm-tree__modules" [id]="idPrefix() + '-modules'">
        @for (module of visibleModules(); track module.module) {
          @let open = isModuleOpen(module.module);
          @let moduleId = idPrefix() + '-module-' + $index;
          <section class="workspace-perm-tree__module">
            <header class="workspace-perm-tree__module-head">
              @if (editable()) {
                @let moduleState = moduleSelection(module);
                <input
                  type="checkbox"
                  class="workspace-perm-tree__check"
                  [checked]="moduleState === 'all'"
                  [indeterminate]="moduleState === 'some'"
                  [disabled]="moduleGrantable(module).length === 0"
                  [attr.aria-label]="'roles.perm.moduleToggle' | translate: { module: module.label }"
                  (change)="toggleModule(module, $any($event.target).checked)"
                />
              }
              <button
                type="button"
                class="workspace-perm-tree__module-toggle"
                [attr.aria-expanded]="open"
                [attr.aria-controls]="open ? moduleId : null"
                [disabled]="searching()"
                (click)="toggleCollapsed(module.module)"
              >
                <span class="workspace-perm-tree__module-title">{{ module.label }}</span>
                <span class="workspace-perm-tree__module-count">
                  @if (editable()) {
                    {{ selectedIn(module) }}/{{ module.keys.length }}
                  } @else {
                    {{ module.keys.length }}
                  }
                </span>
                <svg
                  class="workspace-perm-tree__chevron"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </header>

            @if (open) {
              <div class="workspace-perm-tree__module-body" [id]="moduleId">
                @for (resource of module.resources; track resource.resource) {
                  @if (editable()) {
                    <fieldset class="workspace-perm-tree__resource">
                      <legend class="workspace-perm-tree__resource-title">
                        {{ resource.label }}
                      </legend>
                      <ul class="workspace-perm-tree__options">
                        @for (entry of resource.entries; track entry.key) {
                          @let state = entryState(entry.key);
                          @let optionId = moduleId + '-' + entry.key;
                          <li>
                            <label
                              class="workspace-perm-tree__option"
                              [class.workspace-perm-tree__option--selected]="
                                selectedSet().has(entry.key)
                              "
                              [class.workspace-perm-tree__option--locked]="state === 'locked'"
                            >
                              <input
                                type="checkbox"
                                class="workspace-perm-tree__check"
                                [id]="optionId"
                                [checked]="selectedSet().has(entry.key)"
                                [disabled]="state === 'locked'"
                                [attr.aria-labelledby]="optionId + '-label'"
                                [attr.aria-describedby]="
                                  state === 'locked' ? optionId + '-reason' : optionId + '-key'
                                "
                                (change)="toggle(entry.key, $any($event.target).checked)"
                              />
                              <span class="workspace-perm-tree__option-body">
                                <span
                                  class="workspace-perm-tree__option-label"
                                  [id]="optionId + '-label'"
                                >
                                  {{ entry.label }}
                                </span>
                                <code
                                  class="workspace-perm-tree__key ltr-text"
                                  dir="ltr"
                                  [id]="optionId + '-key'"
                                  >{{ entry.key }}</code
                                >
                              </span>
                              @if (state === 'locked') {
                                <span
                                  class="workspace-perm-tree__reason"
                                  [id]="optionId + '-reason'"
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="1.75"
                                    aria-hidden="true"
                                  >
                                    <rect x="5" y="11" width="14" height="10" rx="2" />
                                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                                  </svg>
                                  {{ lockReason(entry.key) | translate }}
                                </span>
                              }
                            </label>
                          </li>
                        }
                      </ul>
                    </fieldset>
                  } @else {
                    <div class="workspace-perm-tree__resource">
                      <h4 class="workspace-perm-tree__resource-title">{{ resource.label }}</h4>
                      <ul class="workspace-perm-tree__options">
                        @for (entry of resource.entries; track entry.key) {
                          <li class="workspace-perm-tree__option workspace-perm-tree__option--view">
                            <svg
                              class="workspace-perm-tree__granted"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                              aria-hidden="true"
                            >
                              <path d="m5 12.5 4.5 4.5L19 7.5" />
                            </svg>
                            <span class="workspace-perm-tree__option-body">
                              <span class="workspace-perm-tree__option-label">
                                {{ entry.label }}
                              </span>
                              <code class="workspace-perm-tree__key ltr-text" dir="ltr">{{
                                entry.key
                              }}</code>
                            </span>
                          </li>
                        }
                      </ul>
                    </div>
                  }
                }
              </div>
            }
          </section>
        }
      </div>
    }
  `,
})
export class RolePermissionTree {
  private readonly language = inject(LanguageService);

  readonly catalog = input<PermissionCatalogItem[]>([]);
  readonly keys = input<readonly string[]>([]);
  readonly selected = model<readonly string[]>([]);
  readonly grantable = input<ReadonlySet<string>>(new Set());
  readonly offered = input<ReadonlySet<string>>(new Set());
  readonly editable = input(false);
  readonly idPrefix = input('role-perm');

  protected readonly search = signal('');
  /** Modules start collapsed so the tree is scannable; expand on demand. */
  protected readonly collapsed = signal<ReadonlySet<string> | 'all'>('all');

  protected readonly searching = computed(() => this.search().trim().length > 0);
  protected readonly selectedSet = computed(() => new Set(this.selected()));

  protected isModuleOpen(moduleKey: string): boolean {
    if (this.searching()) {
      return true;
    }
    const state = this.collapsed();
    if (state === 'all') {
      return false;
    }
    return !state.has(moduleKey);
  }

  private readonly catalogByKey = computed(
    () => new Map(this.catalog().map((item) => [item.key, item])),
  );

  protected readonly allKeys = computed(() => [...new Set(this.keys())]);

  protected readonly modules = computed<ModuleNode[]>(() => {
    const byKey = this.catalogByKey();
    const tree = new Map<string, Map<string, PermissionEntry[]>>();
    const order = new Map<string, number>();

    for (const key of this.allKeys()) {
      const item = byKey.get(key);
      const module = item?.module || 'other';
      const resource = item?.resource || 'other';
      const action = item?.action || key;
      const name = item ? this.language.pick(item.nameAr, item.nameEn) : '';
      const label =
        name && !isKeyLike(name, key)
          ? name
          : item
            ? this.language.labelOr(`roles.perm.action.${action}`, humanize(action))
            : key;
      const moduleLabel = this.groupLabel(module);
      const resourceLabel = this.groupLabel(resource);

      const resources = tree.get(module) ?? new Map<string, PermissionEntry[]>();
      const entries = resources.get(resource) ?? [];
      entries.push({
        key,
        label,
        action,
        haystack: [label, key, module, moduleLabel, resource, resourceLabel, action]
          .join(' ')
          .toLowerCase(),
      });
      resources.set(resource, entries);
      tree.set(module, resources);
      order.set(key, item?.sortOrder ?? Number.MAX_SAFE_INTEGER);
    }

    return [...tree.entries()]
      .map(([module, resources]) => {
        const resourceNodes = [...resources.entries()]
          .map(([resource, entries]) => ({
            resource,
            label: this.groupLabel(resource),
            entries: [...entries].sort(
              (a, b) =>
                (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0) || a.key.localeCompare(b.key),
            ),
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
        return {
          module,
          label: this.groupLabel(module),
          resources: resourceNodes,
          keys: resourceNodes.flatMap((node) => node.entries.map((entry) => entry.key)),
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  protected readonly visibleModules = computed<ModuleNode[]>(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) {
      return this.modules();
    }
    return this.modules()
      .map((module) => {
        const resources = module.resources
          .map((resource) => ({
            ...resource,
            entries: resource.entries.filter((entry) => entry.haystack.includes(term)),
          }))
          .filter((resource) => resource.entries.length > 0);
        return {
          ...module,
          resources,
          keys: resources.flatMap((resource) => resource.entries.map((entry) => entry.key)),
        };
      })
      .filter((module) => module.resources.length > 0);
  });

  private readonly visibleGrantable = computed(() =>
    this.visibleModules()
      .flatMap((module) => module.keys)
      .filter((key) => this.grantable().has(key)),
  );

  protected readonly visibleUnselectedGrantable = computed(() =>
    this.visibleGrantable().filter((key) => !this.selectedSet().has(key)),
  );

  protected readonly visibleSelectedGrantable = computed(() =>
    this.visibleGrantable().filter((key) => this.selectedSet().has(key)),
  );

  protected readonly hasLocked = computed(() =>
    this.allKeys().some((key) => !this.grantable().has(key)),
  );

  protected entryState(key: string): EntryState {
    if (!this.grantable().has(key)) {
      return 'locked';
    }
    return this.selectedSet().has(key) ? 'selected' : 'available';
  }

  protected lockReason(key: string): string {
    return this.offered().has(key) ? 'roles.perm.notHeld' : 'roles.perm.notOffered';
  }

  protected selectedIn(module: ModuleNode): number {
    const selected = this.selectedSet();
    return module.keys.filter((key) => selected.has(key)).length;
  }

  protected moduleGrantable(module: ModuleNode): string[] {
    return module.keys.filter((key) => this.grantable().has(key));
  }

  protected moduleSelection(module: ModuleNode): 'none' | 'some' | 'all' {
    const grantable = this.moduleGrantable(module);
    const selected = grantable.filter((key) => this.selectedSet().has(key)).length;
    if (selected === 0) {
      return 'none';
    }
    return selected === grantable.length ? 'all' : 'some';
  }

  protected toggle(key: string, checked: boolean): void {
    if (!this.editable() || !this.grantable().has(key)) {
      return;
    }
    this.apply(checked ? [key] : [], checked ? [] : [key]);
  }

  protected toggleModule(module: ModuleNode, checked: boolean): void {
    const keys = this.moduleGrantable(module);
    this.apply(checked ? keys : [], checked ? [] : keys);
  }

  protected selectVisible(): void {
    this.apply(this.visibleUnselectedGrantable(), []);
  }

  protected clearVisible(): void {
    this.apply([], this.visibleSelectedGrantable());
  }

  protected toggleCollapsed(module: string): void {
    this.collapsed.update((current) => {
      const next =
        current === 'all'
          ? new Set(this.modules().map((item) => item.module))
          : new Set(current);
      if (!next.delete(module)) {
        next.add(module);
      }
      return next;
    });
  }

  protected expandAll(): void {
    this.collapsed.set(new Set());
  }

  protected collapseAll(): void {
    this.collapsed.set('all');
  }

  private apply(add: string[], remove: string[]): void {
    if (!this.editable()) {
      return;
    }
    const next = new Set(this.selected());
    for (const key of add) {
      if (this.grantable().has(key)) {
        next.add(key);
      }
    }
    for (const key of remove) {
      if (this.grantable().has(key)) {
        next.delete(key);
      }
    }
    this.selected.set([...next]);
  }

  private groupLabel(value: string): string {
    return this.language.labelOr(`permissions.groups.${value}`, humanize(value));
  }
}
