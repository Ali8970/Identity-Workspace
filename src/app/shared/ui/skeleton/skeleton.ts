import { Component, Directive, computed, input } from '@angular/core';

/**
 * Shapes a placeholder can take. Every variant draws from the same palette and
 * shimmer defined in `styles/_loading.scss`, so pages stay visually consistent.
 */
export type SkeletonVariant =
  | 'text'
  | 'title'
  | 'lead'
  | 'chip'
  | 'pill'
  | 'avatar'
  | 'icon'
  | 'button'
  | 'input'
  | 'block';

/** `@for` needs an iterable; `times(3)` gives `[0, 1, 2]` to repeat a placeholder row. */
export function times(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index);
}

/** Single placeholder bar. Size comes from the variant; override per usage if needed. */
@Component({
  selector: 'app-skeleton',
  template: '',
  host: {
    '[class]': 'hostClasses()',
    '[style.width]': 'width()',
    '[style.height]': 'height()',
    'aria-hidden': 'true',
  },
})
export class Skeleton {
  readonly variant = input<SkeletonVariant>('text');
  /** CSS length overriding the variant width, e.g. `'40%'` or `'8rem'`. */
  readonly width = input<string | null>(null);
  readonly height = input<string | null>(null);

  protected readonly hostClasses = computed(() => `ui-skeleton ui-skeleton--${this.variant()}`);
}

/**
 * Base for per-page skeletons: marks the placeholder as a live status region and
 * carries the message screen readers hear while the real content loads.
 */
@Directive({
  host: {
    role: 'status',
    'aria-live': 'polite',
    'aria-busy': 'true',
  },
})
export abstract class SkeletonHost {
  /** Already-translated text announced while the placeholder is on screen. */
  readonly label = input('');
}
