import { Component, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { LanguageService } from '../../../../core/i18n/language.service';
import { BroochError } from '../../../../core/error/brooch-error.model';
import {
  AddMemberResult,
  MemberListItem,
  RoleListItem,
} from '../../models/workspace-feature.model';
import { MembersService } from '../../services/members.service';

@Component({
  selector: 'app-members-page',
  imports: [TranslatePipe, FormField],
  template: `
    <h1 class="page-title" id="main-content-header" tabindex="-1">
      {{ 'members.title' | translate }}
    </h1>
    <p class="page-lead">{{ 'members.subtitle' | translate }}</p>

    @if (error()) {
      <div class="ui-alert ui-alert--error" role="alert">
        {{ error()!.message }}
        @if (error()!.correlationId) {
          <div class="ui-field__hint">{{ error()!.correlationId }}</div>
        }
      </div>
    }
    @if (inviteResult(); as result) {
      <div class="ui-alert ui-alert--success" role="status">
        {{
          result.requiresPasswordSetup
            ? ('members.invitedSetPassword' | translate)
            : ('members.invitedExisting' | translate)
        }}
      </div>
    }

    @if (canCreate()) {
      <section class="ui-card" style="margin-bottom: 1.25rem">
        <h2 class="page-title" style="font-size:1.1rem">{{ 'members.add' | translate }}</h2>
        <form (submit)="onAdd($event)">
          <div class="ui-field">
            <label for="member-email">{{ 'members.email' | translate }}</label>
            <input id="member-email" type="email" [formField]="addForm.email" />
          </div>
          <div class="ui-field">
            <label for="member-ar">{{ 'members.nameAr' | translate }}</label>
            <input id="member-ar" type="text" [formField]="addForm.arabicName" />
          </div>
          <div class="ui-field">
            <label for="member-en">{{ 'members.nameEn' | translate }}</label>
            <input id="member-en" type="text" [formField]="addForm.englishName" />
          </div>
          <button class="ui-btn ui-btn--primary" type="submit" [disabled]="busy() || addForm().invalid()">
            {{ 'members.submit' | translate }}
          </button>
        </form>
      </section>
    }

    <div class="ui-table-wrap">
      <table class="ui-table">
        <thead>
          <tr>
            <th>{{ 'members.colName' | translate }}</th>
            <th>{{ 'members.email' | translate }}</th>
            <th>{{ 'members.colRoles' | translate }}</th>
            <th>{{ 'members.colStatus' | translate }}</th>
          </tr>
        </thead>
        <tbody>
          @for (row of members(); track row.tenantMembershipId) {
            <tr>
              <td>{{ label(row.nameAr, row.nameEn) }}</td>
              <td>{{ row.email }}</td>
              <td>
                @for (role of row.roles; track role.id) {
                  <span class="ui-badge">{{ label(role.nameAr, role.nameEn) }}</span>
                }
              </td>
              <td>{{ row.status }}</td>
            </tr>
          } @empty {
            <tr>
              <td colspan="4">{{ 'members.empty' | translate }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class MembersPage {
  private readonly membersService = inject(MembersService);
  private readonly language = inject(LanguageService);

  protected readonly members = signal<MemberListItem[]>([]);
  protected readonly roles = signal<RoleListItem[]>([]);
  protected readonly busy = signal(false);
  protected readonly error = signal<BroochError | null>(null);
  protected readonly inviteResult = signal<AddMemberResult | null>(null);
  protected readonly model = signal({ email: '', arabicName: '', englishName: '' });
  protected readonly addForm = form(this.model, (schema) => {
    required(schema.email);
    required(schema.arabicName);
    required(schema.englishName);
  });

  constructor() {
    void this.load();
  }

  protected canCreate(): boolean {
    return this.membersService.canCreateMembers();
  }

  protected label(ar: string, en: string): string {
    return this.language.current() === 'ar' ? ar || en : en || ar;
  }

  private async load(): Promise<void> {
    try {
      const { members, roles } = await firstValueFrom(this.membersService.loadMembersAndRoles());
      this.members.set(members);
      this.roles.set(roles);
    } catch (err) {
      this.error.set(err as BroochError);
    }
  }

  protected onAdd(event: Event): void {
    event.preventDefault();
    void submit(this.addForm, async () => {
      this.busy.set(true);
      this.error.set(null);
      this.inviteResult.set(null);
      try {
        const value = this.model();
        const identityRole = this.membersService.findIdentityRole(this.roles());
        const result = await firstValueFrom(
          this.membersService.inviteMember(value, identityRole?.id ?? null),
        );
        this.inviteResult.set(result);
        this.model.set({ email: '', arabicName: '', englishName: '' });
        await this.load();
      } catch (err) {
        this.error.set(err as BroochError);
      } finally {
        this.busy.set(false);
      }
    });
  }
}
