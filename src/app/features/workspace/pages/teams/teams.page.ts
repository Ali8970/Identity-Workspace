import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { LanguageService } from '../../../../core/i18n/language.service';
import { BroochError } from '../../../../core/error/brooch-error.model';
import { TeamNode } from '../../models/workspace-feature.model';
import { TeamsService } from '../../services/teams.service';

@Component({
  selector: 'app-teams-page',
  imports: [TranslatePipe, NgTemplateOutlet],
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
        @if (error(); as failure) {
          <div class="workspace-status workspace-status--error" role="alert">
            <span class="workspace-status__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <circle cx="12" cy="12" r="9" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
            </span>
            <span class="workspace-status__body">{{ failure.message }}</span>
          </div>
        }

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
            <strong class="workspace-team-node__name">{{ label(node.nameAr, node.nameEn) }}</strong>
            @if (node.children.length > 0) {
              <span class="workspace-team-node__meta">
                {{ 'teams.subteamCount' | translate: { count: node.children.length } }}
              </span>
            }
          </span>
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
  `,
})
export class TeamsPage {
  private readonly teamsService = inject(TeamsService);
  private readonly language = inject(LanguageService);

  protected readonly teams = signal<TeamNode[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<BroochError | null>(null);

  protected readonly teamCount = computed(() => this.countTeams(this.teams()));

  constructor() {
    void this.load();
  }

  protected label(ar: string, en: string): string {
    return this.language.current() === 'ar' ? ar || en : en || ar;
  }

  private countTeams(nodes: TeamNode[]): number {
    return nodes.reduce((total, node) => total + 1 + this.countTeams(node.children), 0);
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.teams.set(await firstValueFrom(this.teamsService.loadTree()));
    } catch (err) {
      this.error.set(err as BroochError);
    } finally {
      this.loading.set(false);
    }
  }
}
