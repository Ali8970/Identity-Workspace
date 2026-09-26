import { NgTemplateOutlet } from '@angular/common';
import { Component, Injector, afterNextRender, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { SessionStore } from '../../../../core/auth/session.store';
import { ApplicationLabels } from '../../../../core/i18n/application-labels.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { ErrorPanel } from '../../../../shared/ui/error-panel/error-panel';
import { FocusTrap } from '../../../../shared/ui/focus-trap/focus-trap';
import type { ListStatCard } from '../../../../shared/ui/list-stats/list-stat-card';
import { ListStats } from '../../../../shared/ui/list-stats/list-stats';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import {
  MemberListItem,
  TeamMembershipDdlItem,
  TeamNode,
} from '../../models/workspace-feature.model';
import { TeamsService } from '../../services/teams.service';
import { TeamDetailsDialog } from './team-details-dialog';
import {
  TeamApplicationOption,
  TeamDescriptionState,
  TeamFormDialog,
  TeamFormResult,
  TeamFormSeed,
} from './team-form-dialog';
import { TeamsSkeleton } from './teams.skeleton';

const MAX_TEAM_DEPTH = 6;

interface TeamRow {
  node: TeamNode;
  depth: number;
  parentId: string | null;
}

@Component({
  selector: 'app-teams-page',
  imports: [
    TranslatePipe,
    NgTemplateOutlet,
    FocusTrap,
    ConfirmDialog,
    TeamDetailsDialog,
    TeamFormDialog,
    TeamsSkeleton,
    PageHeader,
    ListStats,
    EmptyState,
    ErrorPanel,
  ],
  template: `
    <div>
      <app-page-header
        [title]="'teams.title' | translate"
        [description]="'teams.subtitle' | translate"
      >
        @if (canManage() && applicationRows().length > 0) {
          <button
            type="button"
            class="btn-primary inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-0 px-3.5 text-[13px] font-semibold text-on-primary"
            (click)="openCreate(null)"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              aria-hidden="true"
              class="size-4"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            {{ 'teams.create' | translate }}
          </button>
        }
      </app-page-header>

      <div class="mb-4">
        <app-list-stats [stats]="teamStats()" [loading]="loading()" />
      </div>

      <aside
        class="mb-4 flex items-start gap-2.5 rounded-[10px] border-[1.468px] border-border-subtle bg-surface-muted px-4 py-3 text-[13px] leading-normal text-text-muted"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          aria-hidden="true"
          class="mt-0.5 size-4 shrink-0 text-info"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 10v6M12 7h.01" />
        </svg>
        <span>{{ 'teams.structureHint' | translate }}</span>
      </aside>

      @if (loading()) {
        <app-teams-skeleton [label]="'teams.loading' | translate" />
      } @else if (loadFailed()) {
        <app-error-panel
          [title]="'common.loadFailed' | translate"
          [retryLabel]="'common.retry' | translate"
          (retry)="reload()"
        />
      } @else if (teams().length === 0) {
        <section
          class="list-table-panel overflow-hidden rounded-[10px] border-[1.468px] border-border-button bg-surface shadow-[var(--shadow-card)]"
        >
          <app-empty-state
            [title]="'teams.emptyTitle' | translate"
            [detail]="'teams.emptyBody' | translate"
            [actionLabel]="
              canManage() && applicationRows().length > 0 ? ('teams.create' | translate) : undefined
            "
            (action)="openCreate(null)"
          />
        </section>
      } @else {
        <section class="workspace-org-chart" aria-labelledby="teams-structure-heading">
          <div
            class="flex flex-wrap items-center justify-between gap-2 border-b-[1.468px] border-border-subtle px-[18px] py-3"
          >
            <h2 class="m-0 text-[14px] font-bold text-text" id="teams-structure-heading">
              {{ 'teams.structureTitle' | translate }}
            </h2>
            <div
              class="inline-flex rounded-lg border-[1.468px] border-border-button p-0.5"
              role="group"
              [attr.aria-label]="'teams.viewMode' | translate"
            >
              <button
                type="button"
                class="cursor-pointer rounded-md px-3 py-1.5 text-[12px] font-semibold"
                [class.bg-primary-light]="viewMode() === 'chart'"
                [class.text-info]="viewMode() === 'chart'"
                [class.text-text-muted]="viewMode() !== 'chart'"
                [attr.aria-pressed]="viewMode() === 'chart'"
                (click)="viewMode.set('chart')"
              >
                {{ 'teams.viewChart' | translate }}
              </button>
              <button
                type="button"
                class="cursor-pointer rounded-md px-3 py-1.5 text-[12px] font-semibold"
                [class.bg-primary-light]="viewMode() === 'list'"
                [class.text-info]="viewMode() === 'list'"
                [class.text-text-muted]="viewMode() !== 'list'"
                [attr.aria-pressed]="viewMode() === 'list'"
                (click)="viewMode.set('list')"
              >
                {{ 'teams.viewList' | translate }}
              </button>
            </div>
          </div>

          @if (viewMode() === 'list') {
            <ul class="m-0 list-none divide-y-[1.468px] divide-border-subtle p-0">
              @for (row of rows(); track row.node.id) {
                <li>
                  <button
                    type="button"
                    class="flex w-full cursor-pointer items-start gap-3 px-[18px] py-3 text-start hover:bg-surface-muted/60"
                    [style.padding-inline-start.rem]="1.125 + row.depth * 1.1"
                    [class.bg-primary-light]="selectedId() === row.node.id"
                    (click)="select(row.node.id)"
                  >
                    <span class="min-w-0 flex-1">
                      <span class="block text-[13px] font-semibold text-text">{{
                        row.node.name
                      }}</span>
                      <span class="mt-0.5 block text-[12px] text-text-muted">
                        {{ row.node.kind }}
                        @if (row.node.memberCount != null) {
                          · {{ row.node.memberCount }}
                        }
                      </span>
                    </span>
                  </button>
                </li>
              }
            </ul>
          } @else {
            <div
              class="workspace-org-chart__viewport"
              role="region"
              tabindex="0"
              aria-labelledby="teams-structure-heading"
            >
              <ul class="workspace-org-chart__tree">
                @for (team of teams(); track team.id) {
                  <ng-container
                    *ngTemplateOutlet="teamBranch; context: { $implicit: team, depth: 0 }"
                  />
                }
              </ul>
            </div>
          }
        </section>
      }
    </div>

    <ng-template #teamBranch let-node let-depth="depth">
      <li class="workspace-org-chart__item">
        <div
          class="workspace-org-chart__node"
          [class.workspace-org-chart__node--organization]="node.kind === 'Organization'"
          [class.workspace-org-chart__node--application]="node.kind === 'Application'"
          [class.workspace-org-chart__node--parent]="node.children.length > 0"
          [class.workspace-org-chart__node--selected]="selectedId() === node.id"
        >
          <button
            type="button"
            class="workspace-org-chart__card"
            aria-haspopup="dialog"
            [id]="'team-node-' + node.id"
            (click)="select(node.id)"
          >
            <span class="workspace-org-chart__icon" aria-hidden="true">
              @switch (node.kind) {
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

            <span class="workspace-org-chart__body">
              <strong class="workspace-org-chart__name">{{ node.name }}</strong>
              <span class="workspace-org-chart__kind">{{ kindLabel(node.kind) | translate }}</span>
              <span class="workspace-org-chart__meta">
                {{ 'teams.memberCount' | translate: { count: node.memberCount } }}
                @if (node.children.length > 0) {
                  · {{ 'teams.subteamCount' | translate: { count: node.children.length } }}
                }
              </span>
              @if (node.isMissingManager) {
                <span class="workspace-org-chart__flag">
                  {{ 'teams.missingManager' | translate }}
                </span>
              }
            </span>
          </button>

          @if (node.children.length > 0) {
            <button
              type="button"
              class="workspace-org-chart__toggle"
              [attr.aria-expanded]="!isCollapsed(node.id)"
              [attr.aria-controls]="isCollapsed(node.id) ? null : 'team-children-' + node.id"
              [attr.aria-label]="
                (isCollapsed(node.id) ? 'teams.expand' : 'teams.collapse')
                  | translate: { team: node.name }
              "
              (click)="toggle(node.id)"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                aria-hidden="true"
              >
                @if (isCollapsed(node.id)) {
                  <path d="M12 6v12M6 12h12" />
                } @else {
                  <path d="M6 12h12" />
                }
              </svg>
            </button>
          }
        </div>

        @if (node.children.length > 0 && !isCollapsed(node.id)) {
          <ul class="workspace-org-chart__children" [id]="'team-children-' + node.id">
            @for (child of node.children; track child.id) {
              <ng-container
                *ngTemplateOutlet="teamBranch; context: { $implicit: child, depth: depth + 1 }"
              />
            }
          </ul>
        }
      </li>
    </ng-template>

    @if (selectedRow(); as row) {
      <app-team-details-dialog
        [team]="row.node"
        [parent]="parentNode(row)"
        [managerName]="managerName(row.node)"
        [members]="teamMembers()"
        [membersLoading]="membersLoading()"
        [memberBusy]="memberBusy()"
        [canManage]="canManage()"
        [canAddChild]="canAddChild(row.node)"
        [archiveBlockedReason]="archiveBlockedReason(row.node)"
        [maxDepth]="maxDepth"
        (closed)="closeDetails()"
        (assignManager)="openAssignManager(row.node)"
        (removeManager)="askRemoveManager(row.node)"
        (edit)="openEdit(row)"
        (archive)="askArchive(row.node)"
        (addMember)="openAddMember(row.node)"
        (removeMember)="removeMember(row.node, $event)"
        (addSubteam)="openCreate(row)"
        (openTeam)="openTeam($event)"
      />
    }

    @if (assignTeam(); as team) {
      <div class="workspace-dialog" role="presentation">
        <button
          type="button"
          class="workspace-dialog__backdrop"
          [attr.aria-label]="'teams.assignManagerCancel' | translate"
          (click)="closeAssignManager()"
        ></button>
        <div
          class="workspace-dialog__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assign-manager-title"
          appFocusTrap
          (dismiss)="closeAssignManager()"
        >
          <header class="workspace-dialog__head">
            <div>
              <h2 class="workspace-dialog__title" id="assign-manager-title">
                {{ 'teams.assignManagerTitle' | translate }}
              </h2>
              <p class="workspace-dialog__lead">
                {{ 'teams.assignManagerLead' | translate: { team: team.name } }}
              </p>
            </div>
            <button
              type="button"
              class="workspace-dialog__close"
              [attr.aria-label]="'teams.assignManagerCancel' | translate"
              (click)="closeAssignManager()"
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

          <div class="workspace-dialog__body">
            @if (candidatesLoading()) {
              <div
                class="workspace-loading workspace-loading--compact"
                role="status"
                aria-live="polite"
              >
                <span class="workspace-loading__spinner" aria-hidden="true"></span>
                <span>{{ 'teams.assignManagerLoading' | translate }}</span>
              </div>
            } @else if (managerCandidates().length === 0) {
              <p class="workspace-dialog__empty" role="status">
                {{
                  (team.kind === 'Application'
                    ? 'teams.managerOwnerRoleRequired'
                    : 'teams.assignManagerEmpty'
                  ) | translate
                }}
              </p>
            } @else {
              <form class="workspace-form" (submit)="saveManager($event)" novalidate>
                <div class="mb-3.5 flex flex-col gap-1">
                  <label class="text-[12px] font-semibold text-text-muted" for="team-manager-select">
                    {{ 'teams.managerLabel' | translate }}
                  </label>
                  <div class="relative">
                    <select
                      id="team-manager-select"
                      class="field-control"
                      [value]="managerChoice()"
                      (change)="managerChoice.set($any($event.target).value)"
                    >
                      @if (team.kind !== 'Application') {
                        <option value="">{{ 'teams.managerNone' | translate }}</option>
                      }
                      @for (candidate of managerCandidates(); track candidate.tenantMembershipId) {
                        <option [value]="candidate.tenantMembershipId">
                          {{ language.pick(candidate.arabicName, candidate.englishName) }}
                        </option>
                      }
                    </select>
                  </div>
                  <p class="workspace-field-hint" id="team-manager-hint">
                    {{
                      (team.kind === 'Application'
                        ? 'teams.managerApplicationHint'
                        : 'teams.managerHint'
                      ) | translate
                    }}
                  </p>
                </div>

                <div class="workspace-form__actions workspace-dialog__actions">
                  <button
                    type="button"
                    class="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-[1.468px] border-border-button bg-surface px-3.5 text-[13px] font-semibold text-text hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                    [disabled]="saving()"
                    (click)="closeAssignManager()"
                  >
                    {{ 'teams.assignManagerCancel' | translate }}
                  </button>
                  <button
                    type="submit"
                    class="btn-primary inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-0 px-3.5 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
                    [disabled]="saving()"
                    [attr.aria-busy]="saving()"
                  >
                    @if (saving()) {
                      {{ 'teams.assignManagerSaving' | translate }}
                    } @else {
                      {{ 'teams.assignManagerSave' | translate }}
                    }
                  </button>
                </div>
              </form>
            }
          </div>
        </div>
      </div>
    }

    @if (formSeed(); as seed) {
      <app-team-form-dialog
        [seed]="seed"
        [rows]="rows()"
        [applications]="applicationOptions()"
        [maxDepth]="maxDepth"
        [description]="formDescription()"
        [descriptionState]="formDescriptionState()"
        [saving]="saving()"
        (closed)="closeForm()"
        (submitted)="saveForm($event)"
      />
    }

    @if (addMemberTeam(); as team) {
      <div class="workspace-dialog" role="presentation">
        <button
          type="button"
          class="workspace-dialog__backdrop"
          [attr.aria-label]="'common.cancel' | translate"
          (click)="closeAddMember()"
        ></button>
        <div
          class="workspace-dialog__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="team-add-member-title"
          appFocusTrap
          (dismiss)="closeAddMember()"
        >
          <header class="workspace-dialog__head">
            <div>
              <h2 class="workspace-dialog__title" id="team-add-member-title">
                {{ 'teams.addMemberTitle' | translate }}
              </h2>
              <p class="workspace-dialog__lead">
                {{ 'teams.addMemberLead' | translate: { team: team.name } }}
              </p>
            </div>
            <button
              type="button"
              class="workspace-dialog__close"
              [attr.aria-label]="'common.cancel' | translate"
              (click)="closeAddMember()"
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

          <div class="workspace-dialog__body">
            @if (candidatesLoading()) {
              <div
                class="workspace-loading workspace-loading--compact"
                role="status"
                aria-live="polite"
              >
                <span class="workspace-loading__spinner" aria-hidden="true"></span>
                <span>{{ 'teams.addMemberLoading' | translate }}</span>
              </div>
            } @else if (addableMembers().length === 0) {
              <p class="workspace-dialog__empty" role="status">
                {{ 'teams.addMemberEmpty' | translate }}
              </p>
            } @else {
              <form class="workspace-form" (submit)="saveAddMember($event)" novalidate>
                <div class="mb-3.5 flex flex-col gap-1">
                  <label class="text-[12px] font-semibold text-text-muted" for="team-add-member-select">
                    {{ 'teams.addMemberLabel' | translate }}
                  </label>
                  <div class="relative">
                    <select
                      id="team-add-member-select"
                      class="field-control"
                      [value]="addMemberChoice()"
                      (change)="addMemberChoice.set($any($event.target).value)"
                    >
                      <option value="" disabled>
                        {{ 'teams.managerPlaceholder' | translate }}
                      </option>
                      @for (candidate of addableMembers(); track candidate.tenantMembershipId) {
                        <option [value]="candidate.tenantMembershipId">
                          {{ language.pick(candidate.arabicName, candidate.englishName) }}
                        </option>
                      }
                    </select>
                  </div>
                </div>

                <div class="workspace-form__actions workspace-dialog__actions">
                  <button
                    type="button"
                    class="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-[1.468px] border-border-button bg-surface px-3.5 text-[13px] font-semibold text-text hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                    [disabled]="saving()"
                    (click)="closeAddMember()"
                  >
                    {{ 'common.cancel' | translate }}
                  </button>
                  <button
                    type="submit"
                    class="btn-primary inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-0 px-3.5 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
                    [disabled]="saving() || addMemberChoice() === ''"
                    [attr.aria-busy]="saving()"
                  >
                    @if (saving()) {
                      {{ 'teams.saving' | translate }}
                    } @else {
                      {{ 'teams.addMemberSave' | translate }}
                    }
                  </button>
                </div>
              </form>
            }
          </div>
        </div>
      </div>
    }

    @if (archiveTarget()) {
      <app-confirm-dialog
        title="teams.archiveTitle"
        body="teams.archiveBody"
        [bodyParams]="{ team: archiveName() }"
        confirmLabel="teams.archiveConfirm"
        cancelLabel="common.cancel"
        busyLabel="teams.archiving"
        [destructive]="true"
        [busy]="saving()"
        (confirmed)="confirmArchive()"
        (cancelled)="cancelArchive()"
      />
    }

    @if (managerRemoveTarget(); as team) {
      <app-confirm-dialog
        title="teams.removeManagerTitle"
        body="teams.removeManagerBody"
        [bodyParams]="{ team: team.name }"
        confirmLabel="teams.removeManager"
        cancelLabel="common.cancel"
        busyLabel="teams.saving"
        [destructive]="true"
        [busy]="saving()"
        (confirmed)="confirmRemoveManager()"
        (cancelled)="cancelRemoveManager()"
      />
    }
  `,
})
export class TeamsPage {
  private readonly teamsService = inject(TeamsService);
  private readonly session = inject(SessionStore);
  private readonly applicationLabels = inject(ApplicationLabels);
  protected readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);
  private readonly injector = inject(Injector);

  protected readonly maxDepth = MAX_TEAM_DEPTH;
  protected readonly viewMode = signal<'chart' | 'list'>('chart');

  private readonly tree = rxResource({
    // Keyed on the active company so a company switch re-fetches automatically.
    params: () => this.session.currentTenant()?.tenantMembershipId,
    stream: () => this.teamsService.loadTree(),
    defaultValue: [] as TeamNode[],
  });

  protected readonly teams = this.tree.value;
  protected readonly loading = this.tree.isLoading;
  /** The error interceptor already raised the banner; this only offers the retry. */
  protected readonly loadFailed = computed(() => this.tree.status() === 'error');

  protected readonly selectedId = signal<string | null>(null);
  private readonly detailsOpenerId = signal<string | null>(null);
  private readonly collapsedIds = signal<ReadonlySet<string>>(new Set());

  protected readonly assignTeam = signal<TeamNode | null>(null);
  protected readonly managerCandidates = signal<MemberListItem[]>([]);
  protected readonly managerChoice = signal('');
  protected readonly candidatesLoading = signal(false);
  protected readonly saving = signal(false);

  protected readonly formSeed = signal<TeamFormSeed | null>(null);
  protected readonly formDescription = signal<string | null>(null);
  protected readonly formDescriptionState = signal<TeamDescriptionState>('idle');

  protected readonly addMemberTeam = signal<TeamNode | null>(null);
  protected readonly addMemberChoice = signal('');
  protected readonly activeMembers = signal<MemberListItem[]>([]);

  protected readonly teamMembers = signal<TeamMembershipDdlItem[]>([]);
  protected readonly membersLoading = signal(false);
  protected readonly memberBusy = signal<string | null>(null);

  protected readonly archiveTarget = signal<TeamNode | null>(null);
  protected readonly managerRemoveTarget = signal<TeamNode | null>(null);

  protected readonly rows = computed<TeamRow[]>(() => {
    const out: TeamRow[] = [];
    const walk = (nodes: TeamNode[], depth: number, parentId: string | null): void => {
      for (const node of nodes) {
        out.push({ node, depth, parentId });
        walk(node.children, depth + 1, node.id);
      }
    };
    walk(this.teams(), 0, null);
    return out;
  });

  protected readonly selectedRow = computed<TeamRow | null>(() => {
    const id = this.selectedId();
    if (!id) {
      return null;
    }
    return this.rows().find((row) => row.node.id === id) ?? null;
  });

  protected readonly applicationRows = computed(() =>
    this.rows().filter((row) => row.node.kind === 'Application'),
  );

  protected readonly teamCount = computed(() => this.rows().length);
  protected readonly missingManagerCount = computed(
    () => this.rows().filter((row) => row.node.isMissingManager).length,
  );

  protected readonly teamStats = computed((): ListStatCard[] => {
    this.language.current();
    const missing = this.missingManagerCount();
    return [
      {
        label: this.translate.instant('teams.stats.total'),
        value: this.teamCount(),
        accent: '#2b5bf9',
        icon: 'users',
      },
      {
        label: this.translate.instant('teams.stats.applications'),
        value: this.applicationRows().length,
        accent: '#1e00b0',
        icon: 'apps',
      },
      {
        label: this.translate.instant('teams.stats.missingManagers'),
        value: missing,
        accent: '#f57c00',
        icon: 'warning',
        valueTone: missing > 0 ? 'danger' : 'default',
      },
    ];
  });

  protected readonly canManage = computed(() => this.teamsService.canManageTeams());

  protected readonly applicationOptions = computed<TeamApplicationOption[]>(() =>
    this.applicationRows()
      .filter((row) => row.node.applicationKey)
      .map((row) => ({
        key: row.node.applicationKey as string,
        label: this.appLabel(row.node.applicationKey),
        rootTeamId: row.node.id,
      })),
  );

  protected readonly addableMembers = computed(() => {
    const present = new Set(this.teamMembers().map((member) => member.id));
    return this.activeMembers().filter((member) => !present.has(member.tenantMembershipId));
  });

  protected reload(): void {
    this.tree.reload();
    const row = this.selectedRow();
    if (row) {
      void this.loadTeamMembers(row.node.id);
    }
  }

  protected select(teamId: string): void {
    if (this.selectedId() === null) {
      this.detailsOpenerId.set(teamId);
    }
    this.selectedId.set(teamId);
    void this.loadTeamMembers(teamId);
  }

  protected openTeam(team: TeamNode): void {
    const parentOf = new Map(this.rows().map((row) => [row.node.id, row.parentId]));
    const ancestors = new Set<string>();
    let cursor = parentOf.get(team.id) ?? null;
    while (cursor) {
      ancestors.add(cursor);
      cursor = parentOf.get(cursor) ?? null;
    }
    this.collapsedIds.update((ids) => new Set([...ids].filter((id) => !ancestors.has(id))));
    this.select(team.id);
  }

  protected closeDetails(): void {
    const id = this.detailsOpenerId() ?? this.selectedId();
    this.selectedId.set(null);
    this.detailsOpenerId.set(null);
    this.teamMembers.set([]);
    if (id) {
      afterNextRender(() => document.getElementById(`team-node-${id}`)?.focus(), {
        injector: this.injector,
      });
    }
  }

  protected isCollapsed(teamId: string): boolean {
    return this.collapsedIds().has(teamId);
  }

  protected toggle(teamId: string): void {
    this.collapsedIds.update((ids) => {
      const next = new Set(ids);
      if (!next.delete(teamId)) {
        next.add(teamId);
      }
      return next;
    });
  }

  protected parentNode(row: TeamRow): TeamNode | null {
    if (!row.parentId) {
      return null;
    }
    return this.rows().find((entry) => entry.node.id === row.parentId)?.node ?? null;
  }

  protected kindLabel(kind: string): string {
    return `teams.kind.${kind}`;
  }

  protected appLabel(applicationKey: string | null): string {
    return this.applicationLabels.label(applicationKey) || (applicationKey ?? '');
  }

  protected memberLabel(member: TeamMembershipDdlItem): string {
    return this.language.pick(member.title.ar, member.title.en);
  }

  protected managerName(node: TeamNode): string {
    if (!node.managerTenantMembershipId) {
      return '';
    }
    const known = this.teamMembers().find(
      (member) => member.id === node.managerTenantMembershipId,
    );
    if (known) {
      return this.memberLabel(known);
    }
    const member = this.activeMembers().find(
      (row) => row.tenantMembershipId === node.managerTenantMembershipId,
    );
    return member ? this.language.pick(member.arabicName, member.englishName) : '';
  }

  protected canAddChild(node: TeamNode): boolean {
    const row = this.rows().find((entry) => entry.node.id === node.id);
    return (
      node.kind !== 'Organization' && row !== undefined && row.depth + 2 <= MAX_TEAM_DEPTH
    );
  }

  protected archiveBlockedReason(node: TeamNode): string | null {
    if (node.kind !== 'Team') {
      return 'teams.archiveStructural';
    }
    if (node.children.length > 0) {
      return 'teams.archiveHasChildren';
    }
    if (node.memberCount > 0) {
      return 'teams.archiveHasMembers';
    }
    return null;
  }

  private async loadTeamMembers(teamId: string): Promise<void> {
    this.membersLoading.set(true);
    this.teamMembers.set([]);
    try {
      const members = await firstValueFrom(this.teamsService.loadMembershipsDdl(teamId));
      this.teamMembers.set(members);
    } catch {
      this.teamMembers.set([]);
    } finally {
      this.membersLoading.set(false);
    }
  }

  protected async openAssignManager(team: TeamNode): Promise<void> {
    if (!this.canManage()) {
      return;
    }
    this.assignTeam.set(team);
    this.managerCandidates.set([]);
    this.managerChoice.set(team.managerTenantMembershipId ?? '');
    this.candidatesLoading.set(true);

    try {
      const candidates = await firstValueFrom(this.teamsService.loadManagerCandidates(team));
      this.managerCandidates.set(candidates);
      if (!candidates.some((c) => c.tenantMembershipId === this.managerChoice())) {
        this.managerChoice.set(team.kind === 'Application' ? '' : this.managerChoice());
      }
    } catch {
      this.managerCandidates.set([]);
    } finally {
      this.candidatesLoading.set(false);
    }
  }

  protected closeAssignManager(): void {
    if (this.saving()) {
      return;
    }
    this.assignTeam.set(null);
    this.managerCandidates.set([]);
    this.managerChoice.set('');
  }

  protected async saveManager(event: Event): Promise<void> {
    event.preventDefault();
    const team = this.assignTeam();
    if (!team || !this.canManage() || this.saving()) {
      return;
    }
    const choice = this.managerChoice();
    if (team.kind === 'Application' && choice === '') {
      return;
    }

    if (await this.applyManager(team, choice === '' ? null : choice)) {
      this.assignTeam.set(null);
      this.managerCandidates.set([]);
      this.managerChoice.set('');
    }
  }

  protected askRemoveManager(team: TeamNode): void {
    if (!this.canManage() || team.kind === 'Application' || !team.managerTenantMembershipId) {
      return;
    }
    this.managerRemoveTarget.set(team);
  }

  protected cancelRemoveManager(): void {
    if (this.saving()) {
      return;
    }
    this.managerRemoveTarget.set(null);
  }

  protected async confirmRemoveManager(): Promise<void> {
    const team = this.managerRemoveTarget();
    if (!team || this.saving()) {
      return;
    }
    if (await this.applyManager(team, null)) {
      this.managerRemoveTarget.set(null);
    }
  }

  private async applyManager(team: TeamNode, managerId: string | null): Promise<boolean> {
    this.saving.set(true);
    try {
      await firstValueFrom(this.teamsService.assignManager(team.id, managerId));
      this.tree.reload();
      return true;
    } catch {
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  protected openCreate(from: TeamRow | null): void {
    if (!this.canManage()) {
      return;
    }
    const parent = from ?? this.applicationRows()[0] ?? null;
    if (!parent) {
      return;
    }
    this.formDescription.set(null);
    this.formDescriptionState.set('idle');
    this.formSeed.set({
      mode: 'create',
      teamId: null,
      applicationKey: parent.node.applicationKey,
      parentTeamId: parent.node.id,
      name: '',
      applicationLocked: from !== null,
    });
  }

  protected async openEdit(row: TeamRow): Promise<void> {
    if (!this.canManage() || row.node.kind !== 'Team') {
      return;
    }
    this.formDescription.set(null);
    this.formDescriptionState.set('loading');
    const seed: TeamFormSeed = {
      mode: 'edit',
      teamId: row.node.id,
      applicationKey: row.node.applicationKey,
      parentTeamId: row.parentId ?? '',
      name: row.node.name,
      applicationLocked: true,
    };
    this.formSeed.set(seed);

    try {
      const description = await firstValueFrom(this.teamsService.loadDescription(row.node));
      if (this.formSeed() === seed) {
        this.formDescription.set(description);
        this.formDescriptionState.set('ready');
      }
    } catch {
      if (this.formSeed() === seed) {
        this.formDescriptionState.set('error');
      }
    }
  }

  protected closeForm(): void {
    if (this.saving()) {
      return;
    }
    this.formSeed.set(null);
    this.formDescription.set(null);
    this.formDescriptionState.set('idle');
  }

  protected async saveForm(value: TeamFormResult): Promise<void> {
    const seed = this.formSeed();
    if (!seed || !this.canManage() || this.saving()) {
      return;
    }

    this.saving.set(true);
    try {
      if (seed.mode === 'create' || !seed.teamId) {
        const team = await firstValueFrom(
          this.teamsService.createTeam({ ...value, managerTenantMembershipId: null }),
        );
        this.revealUnder(value.parentTeamId);
        this.saving.set(false);
        this.closeForm();
        // Land on the new team, as the prototype does, so its manager and members come next.
        this.select(team.id);
      } else {
        await firstValueFrom(this.teamsService.updateTeam(seed.teamId, value));
        this.revealUnder(value.parentTeamId);
        this.saving.set(false);
        this.closeForm();
      }
      this.tree.reload();
    } catch {
      this.saving.set(false);
    }
  }

  /** Expand a parent and its ancestors so a created or moved team is visible in the chart. */
  private revealUnder(parentId: string): void {
    const parentOf = new Map(this.rows().map((row) => [row.node.id, row.parentId]));
    const open = new Set<string>();
    let cursor: string | null = parentId;
    while (cursor) {
      open.add(cursor);
      cursor = parentOf.get(cursor) ?? null;
    }
    this.collapsedIds.update((ids) => new Set([...ids].filter((id) => !open.has(id))));
  }

  protected async openAddMember(team: TeamNode): Promise<void> {
    if (!this.canManage()) {
      return;
    }
    this.addMemberTeam.set(team);
    this.addMemberChoice.set('');
    this.candidatesLoading.set(true);
    try {
      const members = await firstValueFrom(this.teamsService.loadActiveMembers());
      this.activeMembers.set(members);
    } catch {
      this.activeMembers.set([]);
    } finally {
      this.candidatesLoading.set(false);
    }
  }

  protected closeAddMember(): void {
    if (this.saving()) {
      return;
    }
    this.addMemberTeam.set(null);
    this.addMemberChoice.set('');
  }

  protected async saveAddMember(event: Event): Promise<void> {
    event.preventDefault();
    const team = this.addMemberTeam();
    const choice = this.addMemberChoice();
    if (!team || choice === '' || this.saving()) {
      return;
    }

    this.saving.set(true);
    try {
      await firstValueFrom(
        this.teamsService.addMember(team.id, { tenantMembershipId: choice }),
      );
      this.addMemberTeam.set(null);
      this.addMemberChoice.set('');
      await this.loadTeamMembers(team.id);
      this.tree.reload();
    } finally {
      this.saving.set(false);
    }
  }

  protected async removeMember(team: TeamNode, member: TeamMembershipDdlItem): Promise<void> {
    if (!this.canManage() || this.memberBusy() !== null) {
      return;
    }
    this.memberBusy.set(member.id);
    try {
      await firstValueFrom(this.teamsService.removeMember(team.id, member.id));
      await this.loadTeamMembers(team.id);
      this.tree.reload();
    } finally {
      this.memberBusy.set(null);
    }
  }

  protected askArchive(team: TeamNode): void {
    if (!this.canManage() || this.archiveBlockedReason(team)) {
      return;
    }
    this.archiveTarget.set(team);
  }

  protected cancelArchive(): void {
    if (this.saving()) {
      return;
    }
    this.archiveTarget.set(null);
  }

  protected archiveName(): string {
    return this.archiveTarget()?.name ?? '';
  }

  protected async confirmArchive(): Promise<void> {
    const team = this.archiveTarget();
    if (!team || this.saving()) {
      return;
    }
    this.saving.set(true);
    try {
      await firstValueFrom(this.teamsService.archiveTeam(team.id));
      const parentId = this.rows().find((row) => row.node.id === team.id)?.parentId ?? null;
      this.archiveTarget.set(null);
      if (parentId && this.selectedId() === team.id) {
        this.detailsOpenerId.set(parentId);
        this.select(parentId);
        afterNextRender(() => document.getElementById('team-details-tab-overview')?.focus(), {
          injector: this.injector,
        });
      } else {
        this.selectedId.set(null);
      }
      this.tree.reload();
    } finally {
      this.saving.set(false);
    }
  }
}
