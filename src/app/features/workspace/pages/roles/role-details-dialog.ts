import {
  Component,
  ElementRef,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  viewChildren,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../../core/i18n/language.service';
import { FocusTrap } from '../../../../shared/ui/focus-trap/focus-trap';
import {
  MemberListItem,
  PermissionCatalogItem,
  RoleListItem,
} from '../../models/workspace-feature.model';
import { RolePermissionTree } from './role-permission-tree';

export type RoleDetailsTab = 'overview' | 'permissions' | 'members';

@Component({
  selector: 'app-role-details-dialog',
  imports: [TranslatePipe, FocusTrap, RolePermissionTree],
  template: `
    <div class="workspace-dialog workspace-dialog--fill" role="presentation">
      <button
        type="button"
        class="workspace-dialog__backdrop"
        [attr.aria-label]="'roles.details.close' | translate"
        (click)="closed.emit()"
      ></button>
      <div
        class="workspace-dialog__panel workspace-team-details"
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-details-title"
        appFocusTrap
        (dismiss)="closed.emit()"
      >
        <header class="workspace-team-details__head">
          <span
            [class]="
              'workspace-team-details__icon workspace-app-group__icon--' + applicationModifier()
            "
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <path d="M12 3 4 7v6c0 5 3.5 7.7 8 8 4.5-.3 8-3 8-8V7l-8-4Z" />
              @if (role().isOwnerRole) {
                <path d="m9 12 2 2 4-4" />
              } @else {
                <circle cx="12" cy="10" r="2.5" />
                <path d="M8.5 16c.7-1.3 1.9-2 3.5-2s2.8.7 3.5 2" />
              }
            </svg>
          </span>

          <div class="workspace-team-details__heading">
            <h2 class="workspace-dialog__title" id="role-details-title">{{ roleName() }}</h2>
            <p class="workspace-dialog__lead workspace-role-details__lead">
              <bdi>{{ applicationLabel() }}</bdi>
              <span aria-hidden="true">·</span>
              {{ typeLabel() | translate }}
              @if (!role().isActive) {
                <span class="workspace-status-pill workspace-role-status--inactive">
                  {{ 'roles.inactive' | translate }}
                </span>
              }
            </p>
          </div>

          <button
            type="button"
            class="workspace-dialog__close"
            [attr.aria-label]="'roles.details.close' | translate"
            (click)="closed.emit()"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div
          class="workspace-team-details__tabs"
          role="tablist"
          [attr.aria-label]="'roles.details.tabs' | translate"
        >
          @for (tab of tabs(); track tab) {
            <button
              #tabButton
              type="button"
              role="tab"
              class="workspace-team-details__tab"
              [id]="'role-details-tab-' + tab"
              [attr.aria-selected]="activeTab() === tab"
              [attr.aria-controls]="'role-details-panel-' + tab"
              [attr.tabindex]="activeTab() === tab ? 0 : -1"
              (click)="activeTab.set(tab)"
              (keydown)="onTabKeydown($event)"
            >
              {{ 'roles.details.tab.' + tab | translate }}
              @if (tab === 'permissions') {
                <span class="workspace-team-details__count">
                  {{ role().permissionKeys.length }}
                </span>
              } @else if (tab === 'members' && !membersLoading()) {
                <span class="workspace-team-details__count">{{ members().length }}</span>
              }
            </button>
          }
        </div>

        <div
          class="workspace-team-details__body"
          role="tabpanel"
          tabindex="0"
          [id]="'role-details-panel-' + activeTab()"
          [attr.aria-labelledby]="'role-details-tab-' + activeTab()"
        >
          @switch (activeTab()) {
            @case ('overview') {
              @if (isProtected()) {
                <aside class="workspace-note workspace-role-details__protected">
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
                  <span>
                    {{
                      (role().isOwnerRole
                        ? 'roles.details.protectedOwner'
                        : 'roles.details.protectedSystem'
                      ) | translate
                    }}
                  </span>
                </aside>
              }

              <section class="workspace-team-details__section">
                <dl class="workspace-dl workspace-team-details__facts">
                  <div class="workspace-dl__row">
                    <dt class="workspace-dl__label">{{ 'roles.details.nameEn' | translate }}</dt>
                    <dd class="workspace-dl__value" lang="en" dir="ltr">
                      <bdi>{{ role().nameEn || '—' }}</bdi>
                    </dd>
                  </div>
                  <div class="workspace-dl__row">
                    <dt class="workspace-dl__label">{{ 'roles.details.nameAr' | translate }}</dt>
                    <dd class="workspace-dl__value" lang="ar" dir="rtl">
                      <bdi>{{ role().nameAr || '—' }}</bdi>
                    </dd>
                  </div>
                  <div class="workspace-dl__row">
                    <dt class="workspace-dl__label">
                      {{ 'roles.details.application' | translate }}
                    </dt>
                    <dd class="workspace-dl__value">
                      <bdi>{{ applicationLabel() }}</bdi>
                    </dd>
                  </div>
                  <div class="workspace-dl__row">
                    <dt class="workspace-dl__label">{{ 'roles.details.code' | translate }}</dt>
                    <dd class="workspace-dl__value">
                      <code class="workspace-role-details__code" dir="ltr">{{ role().code }}</code>
                    </dd>
                  </div>
                  <div class="workspace-dl__row">
                    <dt class="workspace-dl__label">{{ 'roles.details.type' | translate }}</dt>
                    <dd class="workspace-dl__value">{{ typeLabel() | translate }}</dd>
                  </div>
                  <div class="workspace-dl__row">
                    <dt class="workspace-dl__label">{{ 'roles.details.status' | translate }}</dt>
                    <dd class="workspace-dl__value">
                      <span
                        class="workspace-status-pill"
                        [class.workspace-status-pill--active]="role().isActive"
                        [class.workspace-role-status--inactive]="!role().isActive"
                      >
                        {{ (role().isActive ? 'roles.active' : 'roles.inactive') | translate }}
                      </span>
                    </dd>
                  </div>
                </dl>
              </section>

              <section
                class="workspace-team-details__section workspace-team-details__card"
                aria-labelledby="role-details-description-heading"
              >
                <h3
                  class="workspace-team-details__section-title"
                  id="role-details-description-heading"
                >
                  {{ 'roles.details.description' | translate }}
                </h3>
                <p
                  class="workspace-role-details__description"
                  [class.workspace-role-details__description--empty]="!role().description"
                >
                  {{ role().description || ('roles.noDescription' | translate) }}
                </p>
              </section>

              @if (canEdit()) {
                <section
                  class="workspace-team-details__section workspace-team-details__card"
                  aria-labelledby="role-details-edit-heading"
                >
                  <div class="workspace-team-details__section-head">
                    <div>
                      <h3
                        class="workspace-team-details__section-title"
                        id="role-details-edit-heading"
                      >
                        {{ 'roles.details.editTitle' | translate }}
                      </h3>
                      <p class="workspace-team-details__section-lead">
                        {{ 'roles.details.editLead' | translate }}
                      </p>
                    </div>
                    <button
                      type="button"
                      class="ui-btn ui-btn--primary"
                      [disabled]="busy()"
                      (click)="edit.emit()"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.75"
                        stroke-linecap="round"
                        aria-hidden="true"
                        class="ui-btn__icon"
                      >
                        <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-4-4L4 16v4Z" />
                      </svg>
                      {{ 'roles.details.editRole' | translate }}
                    </button>
                  </div>
                </section>

                <section
                  class="workspace-team-details__section workspace-team-details__card"
                  aria-labelledby="role-details-status-heading"
                >
                  <div class="workspace-team-details__section-head">
                    <div>
                      <h3
                        class="workspace-team-details__section-title"
                        id="role-details-status-heading"
                      >
                        {{ 'roles.details.statusTitle' | translate }}
                      </h3>
                      <p class="workspace-team-details__section-lead">
                        {{
                          (role().isActive
                            ? 'roles.details.activeLead'
                            : 'roles.details.inactiveLead'
                          ) | translate
                        }}
                      </p>
                    </div>
                    <button
                      type="button"
                      class="ui-btn ui-btn--ghost"
                      [disabled]="busy()"
                      [attr.aria-busy]="busy()"
                      (click)="role().isActive ? deactivate.emit() : activate.emit()"
                    >
                      @if (busy() && !role().isActive) {
                        {{ 'roles.details.activating' | translate }}
                      } @else {
                        {{
                          (role().isActive ? 'roles.details.deactivate' : 'roles.details.activate')
                            | translate
                        }}
                      }
                    </button>
                  </div>
                </section>
              }
            }

            @case ('permissions') {
              <section class="workspace-team-details__section">
                <div class="workspace-team-details__section-head">
                  <div>
                    <h3 class="workspace-team-details__section-title">
                      {{ 'roles.details.permissionsTitle' | translate }}
                    </h3>
                    <p class="workspace-team-details__section-lead">
                      {{
                        'roles.details.permissionsLead'
                          | translate: { application: applicationLabel() }
                      }}
                    </p>
                  </div>
                  @if (canEdit()) {
                    <button
                      type="button"
                      class="ui-btn ui-btn--ghost"
                      [disabled]="busy()"
                      (click)="edit.emit()"
                    >
                      {{ 'roles.details.editPermissions' | translate }}
                    </button>
                  }
                </div>

                @if (isProtected()) {
                  <p class="workspace-field-hint">
                    {{ 'roles.details.permissionsProtected' | translate }}
                  </p>
                }

                <app-role-permission-tree
                  idPrefix="role-details-perm"
                  [catalog]="catalog()"
                  [keys]="role().permissionKeys"
                  [selected]="role().permissionKeys"
                />
              </section>
            }

            @case ('members') {
              <section class="workspace-team-details__section">
                <div class="workspace-team-details__section-head">
                  <div>
                    <h3 class="workspace-team-details__section-title">
                      {{ 'roles.details.membersTitle' | translate }}
                    </h3>
                    <p class="workspace-team-details__section-lead">
                      {{ 'roles.details.membersLead' | translate }}
                    </p>
                  </div>
                </div>

                @if (membersLoading()) {
                  <div
                    class="workspace-loading workspace-loading--compact"
                    role="status"
                    aria-live="polite"
                  >
                    <span class="workspace-loading__spinner" aria-hidden="true"></span>
                    <span>{{ 'roles.details.membersLoading' | translate }}</span>
                  </div>
                } @else if (members().length === 0) {
                  <div class="workspace-team-details__empty" role="status">
                    <p class="workspace-panel__empty">
                      {{ 'roles.details.membersEmpty' | translate }}
                    </p>
                  </div>
                } @else {
                  <ul class="workspace-company-list workspace-team-details__list">
                    @for (member of members(); track member.tenantMembershipId) {
                      <li class="workspace-company-row">
                        <span class="workspace-company-row__body">
                          <span class="workspace-company-row__name">
                            {{ language.pick(member.arabicName, member.englishName) || member.email }}
                          </span>
                          <span class="workspace-company-row__meta ltr-text" dir="ltr">
                            {{ member.email }}
                          </span>
                        </span>
                        @if (member.isOwner) {
                          <span class="workspace-chip workspace-chip--muted">
                            {{ 'roles.details.companyOwner' | translate }}
                          </span>
                        }
                      </li>
                    }
                  </ul>
                }
              </section>
            }
          }
        </div>
      </div>
    </div>
  `,
})
export class RoleDetailsDialog {
  protected readonly language = inject(LanguageService);

  readonly role = input.required<RoleListItem>();
  readonly applicationLabel = input('');
  readonly applicationModifier = input('default');
  readonly catalog = input<PermissionCatalogItem[]>([]);
  readonly canManage = input(false);
  readonly canReadMembers = input(false);
  readonly members = input<MemberListItem[]>([]);
  readonly membersLoading = input(false);
  readonly busy = input(false);

  readonly closed = output<void>();
  readonly edit = output<void>();
  readonly activate = output<void>();
  readonly deactivate = output<void>();

  protected readonly tabs = computed<RoleDetailsTab[]>(() =>
    this.canReadMembers() ? ['overview', 'permissions', 'members'] : ['overview', 'permissions'],
  );

  readonly activeTab = linkedSignal<string, RoleDetailsTab>({
    source: () => this.role().id,
    computation: () => 'overview',
  });

  private readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('tabButton');

  protected readonly roleName = computed(() =>
    this.language.pick(this.role().nameAr, this.role().nameEn),
  );

  protected readonly isProtected = computed(() => this.role().isSystem || this.role().isOwnerRole);

  protected readonly canEdit = computed(() => this.canManage() && !this.isProtected());

  protected readonly typeLabel = computed(() => {
    const role = this.role();
    if (role.isOwnerRole) {
      return 'roles.ownerRole';
    }
    return role.isSystem ? 'roles.systemRole' : 'roles.customRole';
  });

  protected onTabKeydown(event: KeyboardEvent): void {
    const tabs = this.tabs();
    const current = tabs.indexOf(this.activeTab());
    const rtl = getComputedStyle(event.currentTarget as HTMLElement).direction === 'rtl';
    let next: number;

    switch (event.key) {
      case 'ArrowRight':
        next = rtl ? current - 1 : current + 1;
        break;
      case 'ArrowLeft':
        next = rtl ? current + 1 : current - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = tabs.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const index = (next + tabs.length) % tabs.length;
    this.activeTab.set(tabs[index]);
    this.tabButtons()[index]?.nativeElement.focus();
  }
}
