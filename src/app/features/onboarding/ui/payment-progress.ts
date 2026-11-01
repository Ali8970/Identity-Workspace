import { Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Where a paid purchase stands, as the page reads it off the backend's status. Every stage maps
 * to a real server state — the tracker never animates progress the server has not reported.
 */
export type PaymentProgressStage =
  | 'verifying'
  | 'verifyingPaused'
  | 'settingUp'
  | 'settingUpPaused'
  | 'setupBlocked';

type StepKey = 'verify' | 'setup' | 'ready';
type StepState = 'done' | 'active' | 'paused' | 'blocked' | 'todo';

const STEP_KEYS: readonly StepKey[] = ['verify', 'setup', 'ready'];

const STAGES: Record<PaymentProgressStage, readonly [StepState, StepState, StepState]> = {
  verifying: ['active', 'todo', 'todo'],
  verifyingPaused: ['paused', 'todo', 'todo'],
  settingUp: ['done', 'active', 'todo'],
  settingUpPaused: ['done', 'paused', 'todo'],
  setupBlocked: ['done', 'blocked', 'todo'],
};

/**
 * Payment confirmation → workspace setup → ready. Each step's caption states where it is in
 * words, so the coloured markers are decoration rather than the only signal.
 */
@Component({
  selector: 'app-payment-progress',
  imports: [TranslatePipe],
  styles: `
    :host { display: block; }
    li { position: relative; display: flex; gap: 0.75rem; }
    .rail {
      position: absolute;
      inset-block: calc(1.5rem + 3px) 3px;
      inset-inline-start: calc(0.75rem - 1px);
      inline-size: 2px;
      border-radius: 2px;
      overflow: hidden;
      background: var(--border);
    }
    [data-state='done'] .rail::after {
      content: '';
      position: absolute;
      inset: 0;
      background: var(--success);
      transform-origin: top;
      animation: fill 0.5s cubic-bezier(0.65, 0, 0.35, 1) 0.3s both;
    }
    .marker {
      position: relative;
      display: grid;
      flex: 0 0 1.5rem;
      place-items: center;
      block-size: 1.5rem;
      border-radius: 50%;
      border: 1.5px solid var(--border);
      background: var(--surface);
      color: var(--text-muted);
    }
    .marker svg {
      inline-size: 0.95rem;
      block-size: 0.95rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 2.2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    [data-state='done'] .marker {
      border-color: var(--success);
      background: var(--success);
      color: var(--on-primary);
      animation: pop 0.42s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }
    .tick { stroke-dasharray: 100; animation: draw 0.36s ease-out 0.16s both; }
    [data-state='active'] .marker { border-color: color-mix(in oklab, var(--info) 28%, var(--surface)); }
    [data-state='active'] .marker::before {
      content: '';
      position: absolute;
      inset: -1.5px;
      border-radius: 50%;
      border: 2px solid transparent;
      border-block-start-color: var(--info);
      animation: spin 0.9s linear infinite;
    }
    [data-state='active'] .marker::after {
      content: '';
      inline-size: 6px;
      block-size: 6px;
      border-radius: 50%;
      background: var(--info);
      animation: pulse 1.1s ease-in-out infinite alternate;
    }
    [data-state='paused'] .marker {
      border-color: color-mix(in oklab, var(--warning) 45%, var(--surface));
      background: var(--warning-bg);
      color: var(--warning-text);
    }
    [data-state='blocked'] .marker {
      border-color: var(--warning);
      background: var(--warning);
      color: var(--on-primary);
      animation: pop 0.42s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }
    .dot { inline-size: 5px; block-size: 5px; border-radius: 50%; background: var(--border-strong); opacity: 0.6; }

    @keyframes fill { from { scale: 1 0; } }
    @keyframes pop { from { scale: 0.5; } }
    @keyframes draw { from { stroke-dashoffset: 100; } to { stroke-dashoffset: 0; } }
    @keyframes spin { to { rotate: 1turn; } }
    @keyframes pulse { from { scale: 0.6; opacity: 0.55; } }
  `,
  template: `
    <ol class="m-0 grid list-none p-0" [attr.aria-label]="'onboarding.result.steps.label' | translate">
      @for (step of steps(); track step.key; let last = $last) {
        <li [attr.data-state]="step.state" [attr.aria-current]="step.state === 'active' ? 'step' : null">
          @if (!last) {
            <span class="rail" aria-hidden="true"></span>
          }
          <span class="marker" aria-hidden="true">
            @switch (step.state) {
              @case ('done') {
                <svg viewBox="0 0 16 16"><path class="tick" pathLength="100" d="m4.5 8.4 2.4 2.4 4.6-5" /></svg>
              }
              @case ('paused') {
                <svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.25" /><path d="M8 5.4V8l1.7 1.1" /></svg>
              }
              @case ('blocked') {
                <svg viewBox="0 0 16 16"><path d="M8 4.6v4.1M8 11.3v.1" /></svg>
              }
              @case ('todo') {
                <span class="dot"></span>
              }
            }
          </span>
          <span class="grid min-w-0 gap-0.5 text-start" [class.pb-4]="!last">
            <span class="text-[13px] leading-snug font-semibold text-text">
              {{ 'onboarding.result.steps.' + step.key + '.label' | translate }}
            </span>
            <span class="text-[12px] leading-snug text-text-muted">
              {{ 'onboarding.result.steps.' + step.key + '.' + step.state | translate }}
            </span>
          </span>
        </li>
      }
    </ol>
  `,
})
export class PaymentProgress {
  readonly stage = input.required<PaymentProgressStage>();

  protected readonly steps = computed(() => {
    const states = STAGES[this.stage()];
    return STEP_KEYS.map((key, index) => ({ key, state: states[index] }));
  });
}
