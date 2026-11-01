import { Component } from '@angular/core';

interface ConfettiBit {
  shape: 'chip' | 'dot' | 'bar';
  style: Record<string, string>;
}

const COLORS = [
  'var(--primary)',
  'var(--info)',
  'var(--success)',
  'var(--warning)',
  'var(--app-hr)',
  'var(--app-sos)',
  'var(--app-ios)',
];
const SHAPES = ['chip', 'dot', 'bar'] as const;
const COUNT = 30;

/**
 * Laid out once from a fixed seed: the burst looks hand-thrown, yet it is the same on every
 * run, so a visual baseline can never flake on it.
 */
const BITS: readonly ConfettiBit[] = (() => {
  let seed = 11;
  const next = (): number => {
    seed = (seed * 16_807) % 2_147_483_647;
    return seed / 2_147_483_647;
  };

  return Array.from({ length: COUNT }, (_, index) => {
    const angle = (index / COUNT) * Math.PI * 2 + (next() - 0.5) * 0.6;
    const reach = 64 + next() * 72;
    return {
      shape: SHAPES[index % SHAPES.length],
      style: {
        '--x': `${(Math.cos(angle) * reach).toFixed(1)}px`,
        // Flattened and lifted, so the burst fans out over the card rather than into the copy.
        '--y': `${(Math.sin(angle) * reach * 0.75 - 24).toFixed(1)}px`,
        '--fall': `${Math.round(36 + next() * 56)}px`,
        '--spin': `${Math.round((next() - 0.5) * 1080)}deg`,
        '--delay': `${Math.round(next() * 160)}ms`,
        '--color': COLORS[index % COLORS.length],
      },
    };
  });
})();

/**
 * A one-shot burst behind the success check: out fast, then a short fall as it fades. Pure
 * decoration — hidden from assistive technology, and not rendered at all for anyone who
 * prefers reduced motion.
 */
@Component({
  selector: 'app-payment-confetti',
  host: { 'aria-hidden': 'true' },
  styles: `
    :host {
      position: absolute;
      inset-block-start: 50%;
      inset-inline-start: 50%;
      pointer-events: none;
    }
    span {
      position: absolute;
      inline-size: 7px;
      block-size: 7px;
      margin: -3.5px;
      border-radius: 1.5px;
      background: var(--color);
      opacity: 0;
      animation: burst 1.6s cubic-bezier(0.12, 0.8, 0.3, 1) calc(0.6s + var(--delay)) both;
    }
    .dot { inline-size: 6px; block-size: 6px; margin: -3px; border-radius: 50%; }
    .bar { inline-size: 4px; block-size: 11px; margin: -5.5px -2px; border-radius: 1px; }

    @keyframes burst {
      0% { opacity: 0; translate: 0 0; rotate: 0deg; scale: 0.4; }
      12% { opacity: 1; }
      55% {
        opacity: 1;
        translate: var(--x) var(--y);
        scale: 1;
        animation-timing-function: cubic-bezier(0.5, 0, 0.8, 0.5);
      }
      100% { opacity: 0; translate: var(--x) calc(var(--y) + var(--fall)); rotate: var(--spin); scale: 0.85; }
    }

    @media (prefers-reduced-motion: reduce) {
      :host { display: none; }
    }
  `,
  template: `
    @for (bit of bits; track $index) {
      <span [class]="bit.shape" [style]="bit.style"></span>
    }
  `,
})
export class PaymentConfetti {
  protected readonly bits = BITS;
}
