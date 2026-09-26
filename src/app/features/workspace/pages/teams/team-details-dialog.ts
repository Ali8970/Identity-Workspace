import { Component, ElementRef, inject, input, linkedSignal, output, viewChildren } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ApplicationLabels } from '../../../../core/i18n/application-labels.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { FocusTrap } from '../../../../shared/ui/focus-trap/focus-trap';
import { TeamMembershipDdlItem, TeamNode } from '../../models/workspace-feature.model';

export type TeamDetailsTab = 'overview' | 'members' | 'subteams' | 'settings';

const TABS: readonly TeamDetailsTab[] = ['overview', 'members', 'subteams', 'settings'];

@Component({
  selector: 'app-team-details-dialog',
  imports: [TranslatePipe, FocusTrap],
  template: `
    <div class="workspace-dialog workspace-dialog--fill" role="presentation">
      <button
        type="button"
        class="workspace-dialog__backdrop"
        [attr.aria-label]="'teams.detailsClose' | translate"
        (click)="closed.emit()"
      ></button>
      <div
        class="workspace-dialog__panel workspace-team-details"
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-details-title"
        appFocusTrap
        (dismiss)="closed.emit()"
      >
        <header class="workspace-team-details__head">
          <span
            class="workspace-team-details__icon"
            [class.workspace-team-details__icon--application]="team().kind === 'Application'"
            [class.workspace-team-details__icon--organization]="team().kind === 'Organization'"
            aria-hidden="true"
          >
            @switch (team().kind) {
              @case ('Organization') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                  <path
                    d="M9 20v-4h6v4M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01"
                  />
                </svg>
              }
              @case ('Application') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
              }
              @default {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <circle cx="12" cy="8" r="2.5" />
                  <path d="M6 19c0.8-2.2 2.8-3.5 6-3.5s5.2 1.3 6 3.5" />
                </svg>
              }
            }
          </span>

          <div class="workspace-team-details__heading">
            <h2 class="workspace-dialog__title" id="team-details-title">{{ team().name }}</h2>
            <p class="workspace-dialog__lead">
              {{ kindLabel(team().kind) | translate }}
              @if (team().applicationKey) {
                · <bdi>{{ appLabel() }}</bdi>
              }
            </p>
          </div>

          <button
            type="button"
            class="workspace-dialog__close"
            [attr.aria-label]="'teams.detailsClose' | translate"
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
          [attr.aria-label]="'teams.detailsTabs' | translate"
        >
          @for (tab of tabs; track tab) {
            <button
              #tabButton
              type="button"
              role="tab"
              class="workspace-team-details__tab"
              [id]="'team-details-tab-' + tab"
              [attr.aria-selected]="activeTab() === tab"
              [attr.aria-controls]="'team-details-panel-' + tab"
              [attr.tabindex]="activeTab() === tab ? 0 : -1"
              (click)="activeTab.set(tab)"
              (keydown)="onTabKeydown($event)"
            >
              {{ 'teams.tabs.' + tab | translate }}
              @if (tab === 'members') {
                <span class="workspace-team-details__count">{{ team().memberCount }}</span>
              } @else if (tab === 'subteams') {
                <span class="workspace-team-details__count">{{ team().children.length }}</span>
              }
            </button>
          }
        </div>

        <div
          class="workspace-team-details__body"
          role="tabpanel"
          tabindex="0"
          [id]="'team-details-panel-' + activeTab()"
          [attr.aria-labelledby]="'team-details-tab-' + activeTab()"
        >
          @switch (activeTab()) {
            @case ('overview') {
              <section class="workspace-team-details__section">
                <dl class="workspace-dl workspace-team-details__facts">
                  <div class="workspace-dl__row">
                    <dt class="workspace-dl__label">{{ 'teams.kindLabel' | translate }}</dt>
                    <dd class="workspace-dl__value">{{ kindLabel(team().kind) | translate }}</dd>
                  </div>
                  @if (team().applicationKey) {
                    <div class="workspace-dl__row">
                      <dt class="workspace-dl__label">
                        {{ 'teams.applicationLabel' | translate }}
                      </dt>
                      <dd class="workspace-dl__value">
                        <bdi>{{ appLabel() }}</bdi>
                      </dd>
                    </div>
                  }
                  <div class="workspace-dl__row">
                    <dt class="workspace-dl__label">{{ 'teams.parentLabel' | translate }}</dt>
                    <dd class="workspace-dl__value">
                      @if (parent(); as parentTeam) {
                        <button
                          type="button"
                          class="workspace-team-details__link"
                          (click)="openTeam.emit(parentTeam)"
                        >
                          {{ parentTeam.name }}
                        </button>
                      } @else {
                        {{ 'teams.parentNone' | translate }}
                      }
                    </dd>
                  </div>
                  <div class="workspace-dl__row">
                    <dt class="workspace-dl__label">{{ 'teams.membersLabel' | translate }}</dt>
                    <dd class="workspace-dl__value">
                      {{ 'teams.memberCount' | translate: { count: team().memberCount } }}
                    </dd>
                  </div>
                  <div class="workspace-dl__row">
                    <dt class="workspace-dl__label">{{ 'teams.subteamsLabel' | translate }}</dt>
                    <dd class="workspace-dl__value">
                      {{ 'teams.subteamCount' | translate: { count: team().children.length } }}
                    </dd>
                  </div>
                </dl>
              </section>

              <section
                class="workspace-team-details__section workspace-team-details__card"
                aria-labelledby="team-details-manager-heading"
              >
                <div class="workspace-team-details__section-head">
                  <h3 class="workspace-team-details__section-title" id="team-details-manager-heading">
                    {{ 'teams.managerLabel' | translate }}
                  </h3>
                </div>

                <div class="workspace-team-details__manager">
                  <span
                    class="workspace-team-details__manager-name"
                    [class.workspace-team-details__manager-name--missing]="!managerName()"
                  >
                    {{ managerName() || ('teams.missingManager' | translate) }}
                  </span>

                  @if (canManage()) {
                    <div class="workspace-actions">
                      <button
                        type="button"
                        class="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-[1.468px] border-border-button bg-surface px-3.5 text-[13px] font-semibold text-text hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                        (click)="assignManager.emit()"
                      >
                        {{
                          (team().managerTenantMembershipId
                            ? 'teams.changeManager'
                            : 'teams.assignManager'
                          ) | translate
                        }}
                      </button>
                      @if (team().managerTenantMembershipId && team().kind !== 'Application') {
                        <button
                          type="button"
                          class="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-[1.468px] border-border-button bg-surface px-3.5 text-[13px] font-semibold text-text hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                          (click)="removeManager.emit()"
                        >
                          {{ 'teams.removeManager' | translate }}
                        </button>
                      }
                    </div>
                  }
                </div>

                <p class="workspace-field-hint">
                  {{
                    (team().kind === 'Application'
                      ? 'teams.managerApplicationHint'
                      : 'teams.managerHint'
                    ) | translate
                  }}
                </p>
              </section>
            }

            @case ('members') {
              <section class="workspace-team-details__section">
                <div class="workspace-team-details__section-head">
                  <h3 class="workspace-team-details__section-title">
                    {{ 'teams.membersLabel' | translate }}
                  </h3>
                  @if (canManage()) {
                    <button type="button" class="btn-primary inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-0 px-3.5 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50" (click)="addMember.emit()">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        aria-hidden="true"
                        class="size-4 shrink-0"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      {{ 'teams.addMember' | translate }}
                    </button>
                  }
                </div>

                @if (membersLoading()) {
                  <div
                    class="workspace-loading workspace-loading--compact"
                    role="status"
                    aria-live="polite"
                  >
                    <span class="workspace-loading__spinner" aria-hidden="true"></span>
                    <span>{{ 'teams.membersLoading' | translate }}</span>
                  </div>
                } @else if (members().length === 0) {
                  <div class="workspace-team-details__empty" role="status">
                    <p class="workspace-panel__empty">{{ 'teams.membersEmpty' | translate }}</p>
                  </div>
                } @else {
                  <ul class="workspace-company-list workspace-team-details__list">
                    @for (member of members(); track member.id) {
                      <li class="workspace-company-row">
                        <span class="workspace-company-row__body">
                          <span class="workspace-company-row__name">
                            {{ memberLabel(member) }}
                          </span>
                          @if (member.id === team().managerTenantMembershipId) {
                            <span class="workspace-company-row__meta">
                              <span class="workspace-chip workspace-chip--muted">
                                {{ 'teams.managerBadge' | translate }}
                              </span>
                            </span>
                          }
                        </span>
                        @if (canManage()) {
                          @if (member.id === team().managerTenantMembershipId) {
                            <span class="workspace-field-hint">
                              {{ 'teams.removeManagerFirst' | translate }}
                            </span>
                          } @else {
                            <button
                              type="button"
                              class="table-row-action-icon workspace-table__action"
                              [disabled]="memberBusy() !== null"
                              [attr.aria-busy]="memberBusy() === member.id"
                              [attr.aria-label]="
                                'teams.removeMemberFor' | translate: { name: memberLabel(member) }
                              "
                              (click)="removeMember.emit(member)"
                            >
                              {{ 'teams.removeMember' | translate }}
                            </button>
                          }
                        }
                      </li>
                    }
                  </ul>
                }
              </section>
            }

            @case ('subteams') {
              <section class="workspace-team-details__section">
                <div class="workspace-team-details__section-head">
                  <h3 class="workspace-team-details__section-title">
                    {{ 'teams.subteamsLabel' | translate }}
                  </h3>
                  @if (canManage() && canAddChild()) {
                    <button type="button" class="btn-primary inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-0 px-3.5 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50" (click)="addSubteam.emit()">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        aria-hidden="true"
                        class="size-4 shrink-0"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      {{ 'teams.addSubteam' | translate }}
                    </button>
                  }
                </div>

                @if (canManage() && !canAddChild()) {
                  <p class="workspace-field-hint">
                    {{
                      (team().kind === 'Organization'
                        ? 'teams.subteamsOrganizationHint'
                        : 'teams.maxDepthHint'
                      ) | translate: { max: maxDepth() }
                    }}
                  </p>
                }

                @if (team().children.length === 0) {
                  <div class="workspace-team-details__empty" role="status">
                    <p class="workspace-panel__empty">{{ 'teams.subteamsEmpty' | translate }}</p>
                  </div>
                } @else {
                  <ul class="workspace-company-list workspace-team-details__list">
                    @for (child of team().children; track child.id) {
                      <li class="workspace-company-row">
                        <span class="workspace-company-row__body">
                          <span class="workspace-company-row__name">{{ child.name }}</span>
                          <span class="workspace-company-row__job">
                            {{ kindLabel(child.kind) | translate }}
                            · {{ 'teams.memberCount' | translate: { count: child.memberCount } }}
                            @if (child.children.length > 0) {
                              ·
                              {{
                                'teams.subteamCount' | translate: { count: child.children.length }
                              }}
                            }
                            @if (child.isMissingManager) {
                              · {{ 'teams.missingManager' | translate }}
                            }
                          </span>
                        </span>
                        <button
                          type="button"
                          class="table-row-action-icon workspace-table__action"
                          [attr.aria-label]="'teams.openTeamFor' | translate: { team: child.name }"
                          (click)="openTeam.emit(child)"
                        >
                          {{ 'teams.openTeam' | translate }}
                        </button>
                      </li>
                    }
                  </ul>
                }
              </section>
            }

            @case ('settings') {
              @if (!canManage()) {
                <p class="workspace-panel__empty" role="status">
                  {{ 'teams.settingsReadOnly' | translate }}
                </p>
              } @else if (team().kind === 'Team') {
                <section
                  class="workspace-team-details__section workspace-team-details__card"
                  aria-labelledby="team-details-edit-heading"
                >
                  <div class="workspace-team-details__section-head">
                    <div>
                      <h3
                        class="workspace-team-details__section-title"
                        id="team-details-edit-heading"
                      >
                        {{ 'teams.settingsGeneral' | translate }}
                      </h3>
                      <p class="workspace-team-details__section-lead">
                        {{ 'teams.editLead' | translate }}
                      </p>
                    </div>
                    <button type="button" class="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-[1.468px] border-border-button bg-surface px-3.5 text-[13px] font-semibold text-text hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50" (click)="edit.emit()">
                      {{ 'teams.editTeam' | translate }}
                    </button>
                  </div>
                </section>

                <section
                  class="workspace-team-details__section workspace-team-details__card workspace-team-details__card--danger"
                  aria-labelledby="team-details-danger-heading"
                >
                  <div class="workspace-team-details__section-head">
                    <div>
                      <h3
                        class="workspace-team-details__section-title"
                        id="team-details-danger-heading"
                      >
                        {{ 'teams.dangerZone' | translate }}
                      </h3>
                      <p class="workspace-team-details__section-lead">
                        {{ (archiveBlockedReason() ?? 'teams.archiveLead') | translate }}
                      </p>
                    </div>
                    <button
                      type="button"
                      class="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-danger px-3.5 text-[13px] font-semibold text-on-primary hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      [disabled]="archiveBlockedReason() !== null"
                      (click)="archive.emit()"
                    >
                      {{ 'teams.archive' | translate }}
                    </button>
                  </div>
                </section>
              } @else {
                <section class="workspace-team-details__section">
                  <aside class="workspace-note">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.75"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 10v6M12 7h.01" />
                    </svg>
                    <span>
                      {{
                        (team().kind === 'Organization'
                          ? 'teams.structuralOrganization'
                          : 'teams.structuralApplication'
                        ) | translate
                      }}
                    </span>
                  </aside>
                </section>
              }
            }
          }
        </div>
      </div>
    </div>
  `,
})
export class TeamDetailsDialog {
  private readonly applicationLabels = inject(ApplicationLabels);
  private readonly language = inject(LanguageService);

  readonly team = input.required<TeamNode>();
  readonly parent = input<TeamNode | null>(null);
  readonly managerName = input('');
  readonly members = input<TeamMembershipDdlItem[]>([]);
  readonly membersLoading = input(false);
  readonly memberBusy = input<string | null>(null);
  readonly canManage = input(false);
  readonly canAddChild = input(false);
  readonly archiveBlockedReason = input<string | null>(null);
  readonly maxDepth = input(0);

  readonly closed = output<void>();
  readonly assignManager = output<void>();
  readonly removeManager = output<void>();
  readonly edit = output<void>();
  readonly archive = output<void>();
  readonly addMember = output<void>();
  readonly removeMember = output<TeamMembershipDdlItem>();
  readonly addSubteam = output<void>();
  readonly openTeam = output<TeamNode>();

  protected readonly tabs = TABS;

  readonly activeTab = linkedSignal<string, TeamDetailsTab>({
    source: () => this.team().id,
    computation: () => 'overview',
  });

  private readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('tabButton');

  protected kindLabel(kind: string): string {
    return `teams.kind.${kind}`;
  }

  protected appLabel(): string {
    const key = this.team().applicationKey;
    return this.applicationLabels.label(key) || (key ?? '');
  }

  protected memberLabel(member: TeamMembershipDdlItem): string {
    return this.language.pick(member.title.ar, member.title.en);
  }

  protected onTabKeydown(event: KeyboardEvent): void {
    const current = TABS.indexOf(this.activeTab());
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
        next = TABS.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const index = (next + TABS.length) % TABS.length;
    this.activeTab.set(TABS[index]);
    this.tabButtons()[index]?.nativeElement.focus();
  }
}
