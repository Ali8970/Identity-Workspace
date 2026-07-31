import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TeamMembershipDdlItem, TeamNode } from '../../models/workspace-feature.model';
import { TeamsService } from '../../services/teams.service';

interface AssignManagerFormValue {
  managerTenantMembershipId: string;
}

@Component({
  selector: 'app-teams-page',
  imports: [TranslatePipe, NgTemplateOutlet, FormField],
  template: `
    <div class="workspace-page">
      <header class="workspace-page__head">
        <div class="workspace-page__intro">
          <p class="workspace-page__eyebrow">{{ 'teams.eyebrow' | translate }}</p>
          <h1 class="workspace-page__title" id="main-content-header" tabindex="-1">
            {{ 'teams.title' | translate }}
          </h1>
          <p class="workspace-page__lead">{{ 'teams.subtitle' | translate }}</p>
        </div>

        <div class="workspace-page__meta">
          <span class="workspace-chip workspace-chip--muted">
            {{ 'teams.teamCount' | translate: { count: teamCount() } }}
          </span>
        </div>
      </header>

      <aside class="workspace-note">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 10v6M12 7h.01" />
        </svg>
        <span>{{ 'teams.structureHint' | translate }}</span>
      </aside>

      @if (loading()) {
        <div class="workspace-loading" role="status" aria-live="polite">
          <span class="workspace-loading__spinner" aria-hidden="true"></span>
          <span>{{ 'teams.loading' | translate }}</span>
        </div>
      } @else {
        @if (teams().length === 0) {
          <section class="workspace-empty" role="status">
            <div class="workspace-empty__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <circle cx="7" cy="8" r="2.5" />
                <circle cx="17" cy="8" r="2.5" />
                <path d="M3 19c1.2-2.8 3.4-4.5 7-4.5s5.8 1.7 7 4.5" />
              </svg>
            </div>
            <h2 class="workspace-empty__title">{{ 'teams.emptyTitle' | translate }}</h2>
            <p class="workspace-empty__body">{{ 'teams.emptyBody' | translate }}</p>
          </section>
        } @else {
          <section class="workspace-team-panel" aria-labelledby="teams-structure-heading">
            <header class="workspace-team-panel__head">
              <h2 class="workspace-team-panel__title" id="teams-structure-heading">
                {{ 'teams.structureTitle' | translate }}
              </h2>
            </header>

            <ul class="workspace-team-tree" role="tree" [attr.aria-label]="'teams.structureTitle' | translate">
              @for (team of teams(); track team.id) {
                <ng-container
                  *ngTemplateOutlet="teamBranch; context: { $implicit: team, depth: 0 }"
                />
              }
            </ul>
          </section>
        }
      }
    </div>

    <ng-template #teamBranch let-node let-depth="depth">
      <li class="workspace-team-node" role="treeitem" [attr.aria-level]="depth + 1">
        <div class="workspace-team-node__card">
          <span
            class="workspace-team-node__icon"
            [class.workspace-team-node__icon--child]="depth > 0"
            aria-hidden="true"
          >
            @if (depth === 0) {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <circle cx="9" cy="8" r="2.5" />
                <circle cx="17" cy="8" r="2.5" />
                <path d="M4 19c1.1-2.5 3.2-4 8-4s6.9 1.5 8 4" />
              </svg>
            } @else {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <circle cx="12" cy="8" r="2.5" />
                <path d="M6 19c0.8-2.2 2.8-3.5 6-3.5s5.2 1.3 6 3.5" />
              </svg>
            }
          </span>
          <span class="workspace-team-node__body">
            <strong class="workspace-team-node__name">{{ node.name }}</strong>
            <span class="workspace-team-node__meta">
              {{ 'teams.memberCount' | translate: { count: node.memberCount } }}
              @if (node.children.length > 0) {
                · {{ 'teams.subteamCount' | translate: { count: node.children.length } }}
              }
              @if (node.isMissingManager) {
                · {{ 'teams.missingManager' | translate }}
              }
            </span>
          </span>
          <button
            type="button"
            class="ui-btn ui-btn--ghost workspace-team-node__action"
            (click)="openAssignManager(node)"
          >
            {{ 'teams.assignManager' | translate }}
          </button>
        </div>

        @if (node.children.length > 0) {
          <ul class="workspace-team-tree workspace-team-tree--nested" role="group">
            @for (child of node.children; track child.id) {
              <ng-container
                *ngTemplateOutlet="teamBranch; context: { $implicit: child, depth: depth + 1 }"
              />
            }
          </ul>
        }
      </li>
    </ng-template>

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
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </header>

          <div class="workspace-dialog__body">
            @if (membersLoading()) {
              <div class="workspace-loading workspace-loading--compact" role="status" aria-live="polite">
                <span class="workspace-loading__spinner" aria-hidden="true"></span>
                <span>{{ 'teams.assignManagerLoading' | translate }}</span>
              </div>
            } @else if (memberOptions().length === 0) {
              <p class="workspace-dialog__empty" role="status">
                {{ 'teams.assignManagerEmpty' | translate }}
              </p>
            } @else {
              <form class="workspace-form" (submit)="saveManager($event)" novalidate>
                <div class="auth-field">
                  <label class="auth-field__label" for="team-manager-select">
                    {{ 'teams.managerLabel' | translate }}
                  </label>
                  <div class="auth-field__control auth-field__control--plain">
                    <select
                      id="team-manager-select"
                      class="auth-field__input auth-field__input--plain"
                      [formField]="managerForm.managerTenantMembershipId"
                    >
                      <option value="" disabled>
                        {{ 'teams.managerPlaceholder' | translate }}
                      </option>
                      @for (member of memberOptions(); track member.id) {
                        <option [value]="member.id">{{ memberLabel(member) }}</option>
                      }
                    </select>
                  </div>
                </div>

                <div class="workspace-form__actions workspace-dialog__actions">
                  <button
                    type="button"
                    class="ui-btn ui-btn--ghost"
                    [disabled]="saving()"
                    (click)="closeAssignManager()"
                  >
                    {{ 'teams.assignManagerCancel' | translate }}
                  </button>
                  <button type="submit" class="ui-btn ui-btn--primary" [disabled]="saving()">
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
  `,
})
export class TeamsPage {
  private readonly teamsService = inject(TeamsService);
  private readonly language = inject(LanguageService);

  protected readonly teams = signal<TeamNode[]>([]);
  protected readonly loading = signal(true);
  protected readonly assignTeam = signal<TeamNode | null>(null);
  protected readonly memberOptions = signal<TeamMembershipDdlItem[]>([]);
  protected readonly membersLoading = signal(false);
  protected readonly saving = signal(false);

  private readonly managerModel = signal<AssignManagerFormValue>({
    managerTenantMembershipId: '',
  });

  protected readonly managerForm = form(this.managerModel, (schema) => {
    required(schema.managerTenantMembershipId);
  });

  protected readonly teamCount = computed(() => this.countTeams(this.teams()));

  constructor() {
    void this.load();
  }

  protected memberLabel(member: TeamMembershipDdlItem): string {
    const lang = this.language.current();
    return lang === 'ar'
      ? member.title.ar || member.title.en
      : member.title.en || member.title.ar;
  }

  protected async openAssignManager(team: TeamNode): Promise<void> {
    this.assignTeam.set(team);
    this.memberOptions.set([]);
    this.managerModel.set({
      managerTenantMembershipId: team.managerTenantMembershipId ?? '',
    });
    this.membersLoading.set(true);

    try {
      const members = await firstValueFrom(this.teamsService.loadMembershipsDdl(team.id));
      this.memberOptions.set(members);
    } catch {
      this.closeAssignManager();
    } finally {
      this.membersLoading.set(false);
    }
  }

  protected closeAssignManager(): void {
    if (this.saving()) {
      return;
    }
    this.assignTeam.set(null);
    this.memberOptions.set([]);
    this.managerModel.set({ managerTenantMembershipId: '' });
  }

  protected saveManager(event: Event): void {
    event.preventDefault();
    void submit(this.managerForm, async () => {
      const team = this.assignTeam();
      const managerTenantMembershipId = this.managerModel().managerTenantMembershipId;
      if (!team || !managerTenantMembershipId) {
        return;
      }

      this.saving.set(true);
      try {
        await firstValueFrom(this.teamsService.assignManager(team.id, managerTenantMembershipId));
        this.saving.set(false);
        this.closeAssignManager();
        await this.load();
      } catch {
        this.saving.set(false);
      }
    });
  }

  private countTeams(nodes: TeamNode[]): number {
    return nodes.reduce((total, node) => total + 1 + this.countTeams(node.children ?? []), 0);
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.teams.set(await firstValueFrom(this.teamsService.loadTree()));
    } finally {
      this.loading.set(false);
    }
  }
}
