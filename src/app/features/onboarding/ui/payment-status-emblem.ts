import { Component, computed, input } from '@angular/core';
import { PaymentConfetti } from './payment-confetti';

/**
 * What the emblem draws. The page picks it from the backend's verdict and from whether it is
 * still re-checking — the emblem itself never looks at a payment status.
 */
export type PaymentEmblemState =
  | 'verifying'
  | 'building'
  | 'waiting'
  | 'idle'
  | 'success'
  | 'failed'
  | 'attention'
  | 'closed'
  | 'unknown'
  | 'disconnected';

type EmblemTone = 'brand' | 'positive' | 'danger' | 'warning' | 'neutral';

const TONES: Record<PaymentEmblemState, EmblemTone> = {
  verifying: 'brand',
  waiting: 'brand',
  idle: 'brand',
  building: 'positive',
  success: 'positive',
  failed: 'danger',
  attention: 'warning',
  closed: 'neutral',
  unknown: 'neutral',
  disconnected: 'neutral',
};

/** Work is in flight: an orbiting arc and ripples instead of a still ring. */
const LIVE_STATES: ReadonlySet<PaymentEmblemState> = new Set(['verifying', 'building']);

/**
 * The animated mark at the top of a payment result: an orbit while the backend works, a drawn
 * check and a burst of confetti once it is done, a cross that shakes once when it failed.
 *
 * Decorative by design — the heading under it carries the meaning, so it is hidden from
 * assistive technology. Under `prefers-reduced-motion` the global guard in `styles.scss` lands
 * every animation on its end state; only the orbit keeps turning, slowly, because it is the one
 * sign that something is still happening.
 */
@Component({
  selector: 'app-payment-status-emblem',
  imports: [PaymentConfetti],
  host: { 'aria-hidden': 'true' },
  styles: `
    :host { display: block; inline-size: 7rem; block-size: 7rem; }
    .emblem {
      --tone: var(--info);
      --ink: var(--primary);
      position: relative;
      display: grid;
      place-items: center;
      block-size: 100%;
    }
    .positive { --tone: var(--success); --ink: var(--success-text); }
    .danger { --tone: var(--error); --ink: var(--danger-text); }
    .warning { --tone: var(--warning); --ink: var(--warning-text); }
    .neutral { --tone: var(--text-muted); --ink: var(--text-muted); }

    .halo, .ripple, .orbit, .orbit::before, .orbit::after, .rim { position: absolute; border-radius: 50%; }
    .halo {
      inset: -22%;
      background: radial-gradient(closest-side, color-mix(in oklab, var(--tone) 24%, transparent), transparent);
      animation: e-pop 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) 0.3s both;
    }
    .live .halo { animation: e-breathe 2.6s ease-in-out infinite alternate; }
    .ripple {
      inset: 12%;
      border: 1.5px solid var(--tone);
      opacity: 0;
      animation: e-ripple 2.4s cubic-bezier(0.2, 0.6, 0.35, 1) infinite;
    }
    .success .ripple { inset: 18px; border-width: 2px; animation: e-ripple 0.85s ease-out 0.55s both; }

    /* A comet on a faint track: the conic fade is the tail, the dot is its head. */
    .orbit { inset: 4px; animation: e-spin 1.1s linear infinite; }
    .orbit::before, .orbit::after { content: ''; }
    .orbit::before {
      inset: 0;
      background: conic-gradient(color-mix(in oklab, var(--tone) 14%, transparent) 20%, var(--tone));
      mask: radial-gradient(farthest-side, #0000 calc(100% - 4px), #000 calc(100% - 3.5px));
    }
    .orbit::after {
      inset: -1px auto auto calc(50% - 3px);
      inline-size: 6px;
      block-size: 6px;
      background: var(--tone);
      box-shadow: 0 0 8px 1px var(--tone);
    }

    .rim { inset: 0; inline-size: 100%; block-size: 100%; rotate: -90deg; }
    .rim circle {
      fill: none;
      stroke: color-mix(in oklab, var(--tone) 38%, transparent);
      stroke-width: 4;
      stroke-linecap: round;
      stroke-dasharray: 100;
      animation: e-draw 0.7s cubic-bezier(0.65, 0, 0.35, 1) both;
    }
    .success .rim circle { stroke: var(--tone); }
    .waiting .rim { animation: e-spin 18s linear infinite; }
    .waiting .rim circle { stroke-dasharray: 0 4; animation: none; }

    .core {
      --core: color-mix(in oklab, var(--tone) 13%, var(--surface));
      position: relative;
      display: grid;
      place-items: center;
      inline-size: 4.5rem;
      block-size: 4.5rem;
      border-radius: 50%;
      border: 1px solid color-mix(in oklab, var(--tone) 28%, var(--surface));
      background: var(--core);
      color: var(--ink);
      box-shadow: 0 14px 30px -16px var(--tone);
      animation: e-pop 0.56s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both;
    }
    .success .core { --core: var(--tone); border-color: transparent; color: var(--on-primary); }
    .glyph {
      inline-size: 2.25rem;
      block-size: 2.25rem;
      overflow: visible;
      fill: none;
      stroke: currentColor;
      stroke-width: 2.4;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .solid { fill: currentColor; stroke: none; }
    .cut { fill: var(--core); }
    .draw { stroke-dasharray: 100; animation: e-draw 0.42s cubic-bezier(0.65, 0, 0.35, 1) 0.55s both; }

    .tile { transform-box: fill-box; transform-origin: center; animation: e-tile 1.3s ease-in-out infinite alternate; }
    .hand { transform-box: view-box; transform-origin: 50% 50%; animation: e-spin 6s linear infinite; }
    .dot { transform-box: fill-box; transform-origin: center; animation: e-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.85s both; }
    .verifying .glyph { animation: e-float 1.8s ease-in-out infinite alternate; }
    .failed { animation: e-shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) 1s both; }
    .closed .glyph { animation: e-flip 0.8s cubic-bezier(0.65, 0, 0.35, 1) 0.45s both; }
    .unknown .glyph, .disconnected .glyph { animation: e-wobble 0.9s ease-in-out 0.45s both; }

    @keyframes e-spin { from { rotate: 0deg; } to { rotate: 1turn; } }
    @keyframes e-breathe { from { opacity: 0.55; scale: 0.9; } to { opacity: 1; scale: 1.04; } }
    @keyframes e-ripple { from { opacity: 0.6; scale: 0.85; } to { opacity: 0; scale: 1.6; } }
    @keyframes e-pop { from { opacity: 0; scale: 0.4; } }
    @keyframes e-draw { from { stroke-dashoffset: 100; } }
    @keyframes e-float { from { translate: 0 1.5px; } to { translate: 0 -1.5px; } }
    @keyframes e-tile { from { opacity: 0.3; scale: 0.6; } }
    @keyframes e-shake { 20% { translate: -7px 0; } 40% { translate: 6px 0; } 60% { translate: -4px 0; } 80% { translate: 2px 0; } }
    @keyframes e-flip { to { rotate: 0.5turn; } }
    @keyframes e-wobble { 30% { rotate: -14deg; } 60% { rotate: 10deg; } 85% { rotate: -4deg; } }

    @media (prefers-reduced-motion: reduce) {
      .orbit { animation-duration: 2.4s !important; animation-iteration-count: infinite !important; }
    }
  `,
  template: `
    <div [class]="classes()">
      <span class="halo"></span>

      @if (live()) {
        <span class="ripple"></span>
        <span class="ripple" style="animation-delay: 1.2s"></span>
        <span class="orbit"></span>
      } @else {
        <svg class="rim" viewBox="0 0 112 112"><circle cx="56" cy="56" r="50" pathLength="100" /></svg>
      }

      @if (state() === 'success') {
        <span class="ripple"></span>
        <app-payment-confetti />
      }

      <span class="core">
        @switch (state()) {
          @case ('success') {
            <svg class="glyph" viewBox="0 0 48 48"><path class="draw" pathLength="100" d="M14.5 24.5 21 31l12.5-13.5" style="stroke-width: 3.4" /></svg>
          }
          @case ('failed') {
            <svg class="glyph" viewBox="0 0 48 48" style="stroke-width: 3">
              <path class="draw" pathLength="100" d="m16 16 16 16" />
              <path class="draw" pathLength="100" d="M32 16 16 32" style="animation-delay: 0.75s" />
            </svg>
          }
          @case ('attention') {
            <svg class="glyph" viewBox="0 0 48 48" style="stroke-width: 3.2">
              <path class="draw" pathLength="100" d="M24 12v15" />
              <circle class="solid dot" cx="24" cy="35" r="2.4" />
            </svg>
          }
          @case ('building') {
            <svg class="glyph" viewBox="0 0 48 48">
              <rect class="tile solid" x="9" y="9" width="13" height="13" rx="3.5" style="color: var(--info)" />
              <rect class="tile solid" x="26" y="9" width="13" height="13" rx="3.5" style="color: var(--app-hr); animation-delay: 0.2s" />
              <rect class="tile solid" x="26" y="26" width="13" height="13" rx="3.5" style="color: var(--success); animation-delay: 0.4s" />
              <rect class="tile solid" x="9" y="26" width="13" height="13" rx="3.5" style="color: var(--warning); animation-delay: 0.6s" />
            </svg>
          }
          @case ('waiting') {
            <svg class="glyph" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="14" />
              <path d="M24 15.5V24" />
              <path class="hand" d="M24 24h6.5" />
            </svg>
          }
          @case ('closed') {
            <svg class="glyph" viewBox="0 0 48 48">
              <path d="M15 11h18M15 37h18" />
              <path d="M17.5 11c0 6.5 6.5 8.5 6.5 13s-6.5 6.5-6.5 13M30.5 11c0 6.5-6.5 8.5-6.5 13s6.5 6.5 6.5 13" />
              <path d="M20.5 33.5h7" />
            </svg>
          }
          @case ('unknown') {
            <svg class="glyph" viewBox="0 0 48 48">
              <circle cx="21.5" cy="21.5" r="10" />
              <path d="m29 29 8 8" />
            </svg>
          }
          @case ('disconnected') {
            <svg class="glyph" viewBox="0 0 48 48">
              <path d="M10 20.5a20 20 0 0 1 28 0M15.5 26a12 12 0 0 1 17 0M20.5 31.5a5 5 0 0 1 7 0" />
              <circle class="solid" cx="24" cy="36" r="1.6" />
              <path d="m11 11 26 26" />
            </svg>
          }
          @default {
            <!-- verifying / idle: a card — with a shield while the bank is being asked. -->
            <svg class="glyph" viewBox="0 0 48 48">
              <rect x="7" y="12" width="30" height="21" rx="4" />
              <path d="M7 18.5h30M12 27h6" />
              @if (state() === 'verifying') {
                <path class="cut" d="M38 24.5 32.5 26.6v4.2c0 3.6 2.4 5.8 5.5 6.7 3.1-.9 5.5-3.1 5.5-6.7v-4.2Z" />
                <path d="m35.6 30.9 1.6 1.6 2.9-3.1" />
              }
            </svg>
          }
        }
      </span>
    </div>
  `,
})
export class PaymentStatusEmblem {
  readonly state = input.required<PaymentEmblemState>();

  protected readonly live = computed(() => LIVE_STATES.has(this.state()));

  /** The state and its tone are both classes, so every rule above keys off one element. */
  protected readonly classes = computed(() => {
    const state = this.state();
    return `emblem ${state} ${TONES[state]}${this.live() ? ' live' : ''}`;
  });
}
