import { Component, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { TeamNode, TeamsApi } from '../../core/api/workspace-api.service';
import { LanguageService } from '../../core/i18n/language.service';
import { BroochError } from '../../core/error/brooch-error.model';

@Component({
  selector: 'app-teams-page',
  imports: [TranslatePipe],
  template: `
    <h1 class="page-title" id="main-content-header" tabindex="-1">
      {{ 'teams.title' | translate }}
    </h1>
    <p class="page-lead">{{ 'teams.subtitle' | translate }}</p>
    @if (error()) {
      <div class="ui-alert ui-alert--error" role="alert">{{ error()!.message }}</div>
    }
    <ul class="perm-tree">
      @for (team of teams(); track team.id) {
        <li>
          <strong>{{ label(team.nameAr, team.nameEn) }}</strong>
          @if (team.children.length) {
            <ul>
              @for (child of team.children; track child.id) {
                <li>{{ label(child.nameAr, child.nameEn) }}</li>
              }
            </ul>
          }
        </li>
      } @empty {
        <li>{{ 'teams.empty' | translate }}</li>
      }
    </ul>
  `,
})
export class TeamsPage {
  private readonly api = inject(TeamsApi);
  private readonly language = inject(LanguageService);
  protected readonly teams = signal<TeamNode[]>([]);
  protected readonly error = signal<BroochError | null>(null);

  constructor() {
    void this.load();
  }

  protected label(ar: string, en: string): string {
    return this.language.current() === 'ar' ? ar || en : en || ar;
  }

  private async load(): Promise<void> {
    try {
      this.teams.set(await firstValueFrom(this.api.tree()));
    } catch (err) {
      this.error.set(err as BroochError);
    }
  }
}
