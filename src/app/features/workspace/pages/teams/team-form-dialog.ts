import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  FormField,
  form,
  maxLength,
  required,
  requiredError,
  submit,
  validate,
} from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { FocusTrap } from '../../../../shared/ui/focus-trap/focus-trap';
import { TeamNode } from '../../models/workspace-feature.model';

export type TeamFormMode = 'create' | 'edit';

export interface TeamFormRow {
  node: TeamNode;
  depth: number;
  parentId: string | null;
}

export interface TeamApplicationOption {
  key: string;
  label: string;
  /** The application team every other team of this application sits under. */
  rootTeamId: string;
}

/** What the page knows when it opens the dialog. */
export interface TeamFormSeed {
  mode: TeamFormMode;
  teamId: string | null;
  applicationKey: string | null;
  parentTeamId: string;
  name: string;
  /** Opened from a team ("Add sub-team") or editing: the application is inherited, not chosen. */
  applicationLocked: boolean;
}

export interface TeamFormResult {
  name: string;
  description: string | null;
  parentTeamId: string;
}

/** `ready` once the edited team's description is known; `error` keeps it out of the request. */
export type TeamDescriptionState = 'idle' | 'loading' | 'ready' | 'error';

interface TeamFormValue {
  applicationKey: string;
  parentTeamId: string;
  name: string;
  description: string;
}

interface FieldStatus {
  touched(): boolean;
  invalid(): boolean;
  errors(): readonly { kind: string }[];
}

type TeamFormStep = 'details' | 'placement';

const STEPS: TeamFormStep[] = ['details', 'placement'];
const NAME_MAX = 200;
const DESCRIPTION_MAX = 1000;

function notBlank(value: string) {
  return value.length > 0 && value.trim() === '' ? requiredError() : undefined;
}

@Component({
  selector: 'app-team-form-dialog',
  imports: [TranslatePipe, FormField, FocusTrap],
  template: `
    <div class="workspace-dialog workspace-dialog--fill" role="presentation">
      <button
        type="button"
        class="workspace-dialog__backdrop"
        tabindex="-1"
        [attr.aria-label]="'common.cancel' | translate"
        (click)="close()"
      ></button>
      <div
        class="workspace-dialog__panel workspace-team-details workspace-role-form workspace-team-form"
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-form-title"
        aria-describedby="team-form-lead"
        appFocusTrap
        (dismiss)="close()"
      >
        <header class="workspace-team-details__head">
          <div class="workspace-team-details__heading">
            <h2 class="workspace-dialog__title" id="team-form-title">
              {{ (isEdit() ? 'teams.editTitle' : 'teams.createTitle') | translate }}
            </h2>
            <p class="workspace-dialog__lead" id="team-form-lead">
              {{ (isEdit() ? 'teams.editLead' : 'teams.createLead') | translate }}
            </p>
          </div>
          <button
            type="button"
            class="workspace-dialog__close"
            [attr.aria-label]="'common.cancel' | translate"
            [disabled]="saving()"
            (click)="close()"
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

        <nav
          class="grid grid-cols-2 gap-1 border-b-[1.468px] border-border-subtle bg-surface-muted/50 px-4 py-3 max-w480:px-3"
          [attr.aria-label]="'teams.form.stepsLabel' | translate"
        >
          @for (item of stepItems; track item.id; let i = $index) {
            <div
              class="relative flex min-w-0 flex-col items-center gap-1.5 text-center"
              [attr.aria-current]="step() === item.id ? 'step' : null"
            >
              @if (i < stepItems.length - 1) {
                <span
                  class="pointer-events-none absolute top-3 start-1/2 h-0.5 w-full"
                  [class.bg-info]="stepIndex() > i"
                  [class.bg-border-button]="stepIndex() <= i"
                  aria-hidden="true"
                ></span>
              }
              <span
                class="relative z-[1] grid size-7 place-items-center rounded-full text-[12px] font-bold"
                [class.bg-info]="step() === item.id || stepIndex() > i"
                [class.text-on-primary]="step() === item.id || stepIndex() > i"
                [class.shadow-[var(--shadow-primary-button)]]="step() === item.id"
                [class.bg-surface]="stepIndex() < i"
                [class.text-text-muted]="stepIndex() < i"
                [class.border-[1.468px]]="stepIndex() < i"
                [class.border-border-button]="stepIndex() < i"
                aria-hidden="true"
              >
                @if (stepIndex() > i) {
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    class="size-3.5"
                  >
                    <path d="m5 12 5 5L19 7" />
                  </svg>
                } @else {
                  {{ i + 1 }}
                }
              </span>
              <span
                class="relative z-[1] max-w-full truncate text-[11px] font-semibold"
                [class.text-info]="step() === item.id"
                [class.text-text]="stepIndex() > i"
                [class.text-text-muted]="stepIndex() < i"
              >
                {{ item.labelKey | translate }}
              </span>
            </div>
          }
        </nav>

        <form class="workspace-role-form__form" (submit)="onSubmit($event)" novalidate>
          <div class="workspace-team-details__body workspace-role-form__body">
            @switch (step()) {
              @case ('details') {
                <section class="mx-auto w-full max-w-2xl" aria-labelledby="team-form-details-heading">
                  <h3
                    class="m-0 mb-1 font-[family-name:var(--font-family)] text-[15px] font-bold text-text"
                    id="team-form-details-heading"
                    tabindex="-1"
                  >
                    {{ 'teams.form.detailsSection' | translate }}
                  </h3>
                  <p class="m-0 mb-4 text-[13px] leading-normal text-text-muted">
                    {{ 'teams.form.detailsLead' | translate }}
                  </p>

                  <div class="mb-3.5 flex flex-col gap-1.5">
                    <div class="workspace-form-dialog__label-row">
                      <label class="text-[12px] font-semibold text-text-muted" for="team-form-name">
                        {{ 'teams.nameLabel' | translate }}
                        <span class="text-danger" aria-hidden="true">*</span>
                      </label>
                      <span
                        class="workspace-form-dialog__counter"
                        [class.workspace-form-dialog__counter--over]="nameLength() > nameMax"
                        aria-hidden="true"
                      >
                        {{ nameLength() }}/{{ nameMax }}
                      </span>
                    </div>
                    <input
                      id="team-form-name"
                      class="field-control"
                      [class.border-danger]="errors().name"
                      type="text"
                      autocomplete="off"
                      data-autofocus
                      [placeholder]="'teams.namePlaceholder' | translate"
                      [attr.aria-invalid]="errors().name ? true : null"
                      [attr.aria-describedby]="errors().name ? 'team-form-name-error' : null"
                      [formField]="teamForm.name"
                    />
                    @if (errors().name; as message) {
                      <p class="m-0 text-[12px] text-danger" id="team-form-name-error" role="alert">
                        {{ message | translate: { max: nameMax } }}
                      </p>
                    }
                  </div>

                  <div class="flex flex-col gap-1.5">
                    <div class="workspace-form-dialog__label-row">
                      <label
                        class="text-[12px] font-semibold text-text-muted"
                        for="team-form-description"
                      >
                        {{ 'teams.descriptionLabel' | translate }}
                        <span class="workspace-role-form__optional">
                          {{ 'teams.form.optional' | translate }}
                        </span>
                      </label>
                      <span
                        class="workspace-form-dialog__counter"
                        [class.workspace-form-dialog__counter--over]="
                          descriptionLength() > descriptionMax
                        "
                        aria-hidden="true"
                      >
                        {{ descriptionLength() }}/{{ descriptionMax }}
                      </span>
                    </div>
                    <textarea
                      id="team-form-description"
                      class="field-control workspace-role-form__textarea"
                      [class.border-danger]="errors().description"
                      rows="3"
                      [placeholder]="
                        (descriptionState() === 'loading'
                          ? 'teams.form.descriptionLoading'
                          : 'teams.form.descriptionPlaceholder'
                        ) | translate
                      "
                      [attr.aria-busy]="descriptionState() === 'loading' ? true : null"
                      [attr.aria-invalid]="errors().description ? true : null"
                      [attr.aria-describedby]="
                        errors().description
                          ? 'team-form-description-error'
                          : descriptionState() === 'error'
                            ? 'team-form-description-hint'
                            : null
                      "
                      [formField]="teamForm.description"
                    ></textarea>
                    @if (errors().description; as message) {
                      <p
                        class="m-0 text-[12px] text-danger"
                        id="team-form-description-error"
                        role="alert"
                      >
                        {{ message | translate: { max: descriptionMax } }}
                      </p>
                    } @else if (descriptionState() === 'error') {
                      <p class="m-0 text-[12px] text-text-muted" id="team-form-description-hint">
                        {{ 'teams.form.descriptionUnavailable' | translate }}
                      </p>
                    }
                  </div>
                </section>
              }

              @case ('placement') {
                <section
                  class="mx-auto w-full max-w-2xl"
                  aria-labelledby="team-form-placement-heading"
                >
                  <h3
                    class="m-0 mb-1 font-[family-name:var(--font-family)] text-[15px] font-bold text-text"
                    id="team-form-placement-heading"
                    tabindex="-1"
                  >
                    {{ 'teams.form.placementSection' | translate }}
                  </h3>
                  <p class="m-0 mb-4 text-[13px] leading-normal text-text-muted">
                    {{ 'teams.form.placementLead' | translate }}
                  </p>

                  @if (canPickApplication()) {
                    <p class="m-0 mb-2 text-[12px] font-semibold text-text-muted">
                      {{ 'teams.applicationLabel' | translate }}
                      <span class="text-danger" aria-hidden="true">*</span>
                    </p>
                    <div class="workspace-invite-apps mb-4" role="radiogroup">
                      @for (application of applications(); track application.key) {
                        <label
                          class="workspace-invite-app"
                          [class.workspace-invite-app--selected]="
                            model().applicationKey === application.key
                          "
                        >
                          <input
                            type="radio"
                            class="workspace-invite-app__check"
                            name="team-form-application"
                            [value]="application.key"
                            [checked]="model().applicationKey === application.key"
                            (change)="selectApplication(application)"
                          />
                          <span class="workspace-invite-app__body">
                            <span class="workspace-invite-app__name">
                              <bdi>{{ application.label }}</bdi>
                            </span>
                          </span>
                          @if (model().applicationKey === application.key) {
                            <span class="workspace-invite-app__tick" aria-hidden="true">
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2.5"
                              >
                                <path d="m5 12 5 5L19 7" />
                              </svg>
                            </span>
                          }
                        </label>
                      }
                    </div>
                    <p class="m-0 mb-4 text-[12px] text-text-muted">
                      {{ 'teams.form.applicationHint' | translate }}
                    </p>
                  } @else {
                    <div class="workspace-invite-review__person mb-4">
                      <div>
                        <p class="workspace-invite-review__kicker">
                          {{ 'teams.applicationLabel' | translate }}
                        </p>
                        <p class="workspace-invite-review__value">
                          <bdi>{{ applicationLabel() }}</bdi>
                        </p>
                      </div>
                    </div>
                  }

                  <div class="mb-3.5 flex flex-col gap-1.5">
                    <label class="text-[12px] font-semibold text-text-muted" for="team-form-parent">
                      {{ 'teams.parentLabel' | translate }}
                      <span class="text-danger" aria-hidden="true">*</span>
                    </label>
                    <select
                      id="team-form-parent"
                      class="field-control"
                      [class.border-danger]="errors().parentTeamId"
                      [attr.aria-invalid]="errors().parentTeamId ? true : null"
                      [attr.aria-describedby]="
                        errors().parentTeamId ? 'team-form-parent-error' : 'team-form-parent-hint'
                      "
                      [formField]="teamForm.parentTeamId"
                    >
                      <option value="" disabled>{{ 'teams.parentPlaceholder' | translate }}</option>
                      @for (option of parentOptions(); track option.node.id) {
                        <option [value]="option.node.id">
                          {{ indent(option.depth) }}{{ option.node.name }}
                        </option>
                      }
                    </select>
                    @if (errors().parentTeamId; as message) {
                      <p class="m-0 text-[12px] text-danger" id="team-form-parent-error" role="alert">
                        {{ message | translate }}
                      </p>
                    } @else {
                      <p class="m-0 text-[12px] text-text-muted" id="team-form-parent-hint">
                        {{ 'teams.maxDepthHint' | translate: { max: maxDepth() } }}
                      </p>
                    }
                  </div>

                  @if (path().length > 0) {
                    <div class="workspace-team-form__preview">
                      <p class="workspace-team-form__preview-label" id="team-form-preview-label">
                        {{ 'teams.form.previewLabel' | translate }}
                      </p>
                      <ol class="workspace-team-form__path" aria-labelledby="team-form-preview-label">
                        @for (crumb of path(); track crumb.id) {
                          <li class="workspace-team-form__crumb">
                            <bdi>{{ crumb.name }}</bdi>
                          </li>
                        }
                        <li
                          class="workspace-team-form__crumb workspace-team-form__crumb--new"
                          aria-current="location"
                        >
                          <bdi>{{
                            previewName() || ('teams.form.previewPlaceholder' | translate)
                          }}</bdi>
                        </li>
                      </ol>
                      <p class="workspace-team-form__level">
                        {{ 'teams.form.level' | translate: { level: level(), max: maxDepth() } }}
                      </p>
                    </div>
                  }
                </section>
              }
            }
          </div>

          <footer class="workspace-role-form__footer">
            <span class="workspace-role-form__summary" aria-live="polite">
              @if (step() === 'placement' && selectedParent(); as parent) {
                {{ 'teams.form.summary' | translate: { parent: parent.name } }}
              } @else {
                {{
                  'teams.form.stepOf'
                    | translate: { current: stepIndex() + 1, total: stepItems.length }
                }}
              }
            </span>
            <div class="workspace-actions">
              <button
                type="button"
                class="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-[1.468px] border-border-button bg-surface px-3.5 text-[13px] font-semibold text-text hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                [disabled]="saving()"
                (click)="close()"
              >
                {{ 'common.cancel' | translate }}
              </button>
              @if (stepIndex() > 0) {
                <button
                  type="button"
                  class="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-[1.468px] border-border-button bg-surface px-3.5 text-[13px] font-semibold text-text hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                  [disabled]="saving()"
                  (click)="goBack()"
                >
                  {{ 'teams.form.back' | translate }}
                </button>
              }
              @if (step() !== 'placement') {
                <button
                  type="button"
                  class="btn-primary inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-0 px-3.5 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
                  [disabled]="saving() || descriptionState() === 'loading'"
                  (click)="goNext()"
                >
                  {{ 'teams.form.next' | translate }}
                </button>
              } @else {
                <button
                  type="submit"
                  class="btn-primary inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-0 px-3.5 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
                  [disabled]="saving() || descriptionState() === 'loading' || descriptionBlocked()"
                  [attr.aria-busy]="saving()"
                >
                  @if (saving()) {
                    {{ 'teams.saving' | translate }}
                  } @else {
                    {{ (isEdit() ? 'teams.editSave' : 'teams.createSave') | translate }}
                  }
                </button>
              }
            </div>
          </footer>
        </form>
      </div>
    </div>
  `,
})
export class TeamFormDialog {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly seed = input.required<TeamFormSeed>();
  readonly rows = input<TeamFormRow[]>([]);
  readonly applications = input<TeamApplicationOption[]>([]);
  readonly maxDepth = input(6);
  /** The edited team's current description, fetched after the dialog opens. */
  readonly description = input<string | null>(null);
  readonly descriptionState = input<TeamDescriptionState>('idle');
  readonly saving = input(false);

  readonly closed = output<void>();
  readonly submitted = output<TeamFormResult>();

  protected readonly nameMax = NAME_MAX;
  protected readonly descriptionMax = DESCRIPTION_MAX;

  protected readonly step = signal<TeamFormStep>('details');
  protected readonly stepItems = [
    { id: 'details' as const, labelKey: 'teams.form.stepDetails' },
    { id: 'placement' as const, labelKey: 'teams.form.stepPlacement' },
  ];
  protected readonly stepIndex = computed(() => STEPS.indexOf(this.step()));
  protected readonly isEdit = computed(() => this.seed().mode === 'edit');

  protected readonly model = linkedSignal<TeamFormSeed, TeamFormValue>({
    source: this.seed,
    computation: (seed) => ({
      applicationKey: seed.applicationKey ?? '',
      parentTeamId: seed.parentTeamId,
      name: seed.name,
      description: '',
    }),
  });

  protected readonly teamForm = form(this.model, (schema) => {
    required(schema.name);
    maxLength(schema.name, NAME_MAX);
    validate(schema.name, ({ value }) => notBlank(value()));
    maxLength(schema.description, DESCRIPTION_MAX);
    required(schema.parentTeamId);
  });

  protected readonly errors = computed(() => ({
    name: this.message(this.teamForm.name(), {
      required: 'teams.nameRequired',
      maxLength: 'teams.form.tooLong',
    }),
    description: this.message(this.teamForm.description(), {
      maxLength: 'teams.form.tooLong',
    }),
    parentTeamId: this.message(this.teamForm.parentTeamId(), {
      required: 'teams.form.parentRequired',
    }),
  }));

  protected readonly nameLength = computed(() => this.model().name.length);
  protected readonly descriptionLength = computed(() => this.model().description.length);
  /**
   * The update request always carries a description. If the current one could not be read,
   * saving untouched would wipe it — so saving waits until the user writes one themselves.
   */
  protected readonly descriptionBlocked = computed(
    () =>
      this.isEdit() &&
      this.descriptionState() === 'error' &&
      !this.teamForm.description().dirty(),
  );

  protected readonly previewName = computed(() => this.model().name.trim());

  protected readonly canPickApplication = computed(
    () => !this.seed().applicationLocked && this.applications().length > 1,
  );

  protected readonly applicationLabel = computed(() => {
    const key = this.model().applicationKey;
    return this.applications().find((option) => option.key === key)?.label ?? key;
  });

  /** A team cannot move under itself or one of its own sub-teams. */
  private readonly excludedIds = computed<ReadonlySet<string>>(() => {
    const teamId = this.seed().teamId;
    const ids = new Set<string>();
    if (!teamId) {
      return ids;
    }
    const collect = (node: TeamNode): void => {
      ids.add(node.id);
      node.children.forEach(collect);
    };
    const row = this.rows().find((entry) => entry.node.id === teamId);
    if (row) {
      collect(row.node);
    }
    return ids;
  });

  protected readonly parentOptions = computed<TeamFormRow[]>(() => {
    const applicationKey = this.model().applicationKey;
    const excluded = this.excludedIds();
    const max = this.maxDepth();
    return this.rows().filter(
      (row) =>
        row.node.applicationKey === applicationKey &&
        row.node.kind !== 'Organization' &&
        !excluded.has(row.node.id) &&
        row.depth + 1 < max,
    );
  });

  protected readonly selectedParent = computed<TeamNode | null>(() => {
    const id = this.model().parentTeamId;
    return this.rows().find((row) => row.node.id === id)?.node ?? null;
  });

  /** Organization › Application › … › parent — where the team will land. */
  protected readonly path = computed<TeamNode[]>(() => {
    const byId = new Map(this.rows().map((row) => [row.node.id, row]));
    const out: TeamNode[] = [];
    let cursor = byId.get(this.model().parentTeamId) ?? null;
    while (cursor) {
      out.unshift(cursor.node);
      cursor = cursor.parentId ? (byId.get(cursor.parentId) ?? null) : null;
    }
    return out;
  });

  /** 1-based level the team will occupy; the organization is level 1. */
  protected readonly level = computed(() => this.path().length + 1);

  constructor() {
    // The description arrives after the dialog opens; never overwrite what the user already typed.
    effect(() => {
      const description = this.description();
      if (this.descriptionState() !== 'ready') {
        return;
      }
      untracked(() => {
        if (!this.teamForm.description().dirty()) {
          this.model.update((value) => ({ ...value, description: description ?? '' }));
        }
      });
    });
  }

  protected selectApplication(application: TeamApplicationOption): void {
    if (this.model().applicationKey === application.key) {
      return;
    }
    this.model.update((value) => ({
      ...value,
      applicationKey: application.key,
      parentTeamId: application.rootTeamId,
    }));
  }

  protected indent(depth: number): string {
    return depth > 1 ? ' '.repeat((depth - 1) * 3) : '';
  }

  protected close(): void {
    if (this.saving()) {
      return;
    }
    this.closed.emit();
  }

  protected goBack(): void {
    if (this.saving()) {
      return;
    }
    const index = this.stepIndex();
    if (index > 0) {
      this.step.set(STEPS[index - 1]);
      this.focusStepHeading();
    }
  }

  protected goNext(): void {
    if (this.saving() || this.descriptionState() === 'loading') {
      return;
    }
    if (this.step() === 'details') {
      this.teamForm.name().markAsTouched();
      this.teamForm.description().markAsTouched();
      if (this.teamForm.name().invalid() || this.teamForm.description().invalid()) {
        this.focusInvalid();
        return;
      }
      this.step.set('placement');
      this.focusStepHeading();
    }
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (
      this.saving() ||
      this.descriptionState() === 'loading' ||
      this.descriptionBlocked() ||
      this.step() !== 'placement'
    ) {
      return;
    }
    await submit(this.teamForm, async () => {
      this.submitted.emit(this.result());
    });
    if (this.teamForm().invalid()) {
      if (this.teamForm.name().invalid() || this.teamForm.description().invalid()) {
        this.step.set('details');
      } else {
        this.step.set('placement');
      }
      this.focusInvalid();
    }
  }

  private focusStepHeading(): void {
    afterNextRender(
      () => {
        const heading = this.host.nativeElement.querySelector<HTMLElement>(
          '.workspace-role-form__body h3',
        );
        heading?.focus({ preventScroll: false });
        heading?.scrollIntoView({ block: 'nearest' });
      },
      { injector: this.injector },
    );
  }

  private focusInvalid(): void {
    afterNextRender(
      () =>
        this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      { injector: this.injector },
    );
  }

  private result(): TeamFormResult {
    const value = this.model();
    return {
      name: value.name.trim(),
      description: value.description.trim() || null,
      parentTeamId: value.parentTeamId,
    };
  }

  private message(field: FieldStatus, messages: Record<string, string>): string | null {
    if (!field.touched() || !field.invalid()) {
      return null;
    }
    for (const error of field.errors()) {
      const key = messages[error.kind];
      if (key) {
        return key;
      }
    }
    return null;
  }
}
