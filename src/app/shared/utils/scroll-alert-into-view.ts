/**
 * Brings an error/alert element into view when it sits outside the viewport.
 *
 * Backend failures render at the top of the auth card and above the workspace `main`, so a
 * user who scrolled down (the onboarding package list, a long member table) submits and never
 * sees why it failed. Already-visible alerts are left alone so the page never jumps under a
 * banner the user is looking at.
 *
 * `scroll-margin-block-start` on the alert keeps it clear of the sticky shell header; it is
 * honoured by `scrollIntoView` and mirrored in the visibility check below.
 */
export function scrollAlertIntoView(element: HTMLElement): void {
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const topOffset = readScrollMarginTop(element);
  const rect = element.getBoundingClientRect();

  if (rect.top >= topOffset && rect.bottom <= viewportHeight) {
    return;
  }

  element.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'start',
    inline: 'nearest',
  });
}

function readScrollMarginTop(element: HTMLElement): number {
  const value = Number.parseFloat(window.getComputedStyle(element).scrollMarginTop);
  return Number.isFinite(value) ? value : 0;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
