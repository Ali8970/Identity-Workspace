import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

const TOAST = { titleKey: 'title', messageKey: 'body' };

/** A toast is a moment: it leaves on its own after five seconds — unless it is being read. */
describe('ToastService', () => {
  let toasts: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    toasts = TestBed.inject(ToastService);
  });
  afterEach(() => vi.useRealTimers());

  const visible = (): number => toasts.toasts().filter((toast) => !toast.leaving).length;

  it('starts leaving after five seconds and is gone once its exit has played', () => {
    toasts.show(TOAST);

    vi.advanceTimersByTime(4_900);
    expect(visible()).toBe(1);

    vi.advanceTimersByTime(200);
    expect(visible()).toBe(0);
    vi.advanceTimersByTime(300);
    expect(toasts.toasts()).toHaveLength(0);
  });

  it('holds a toast while it is hovered or focused, then finishes the countdown', () => {
    const id = toasts.show(TOAST);

    vi.advanceTimersByTime(3_000);
    toasts.pause(id);
    vi.advanceTimersByTime(60_000);
    expect(visible()).toBe(1);

    toasts.resume(id);
    vi.advanceTimersByTime(1_900);
    expect(visible()).toBe(1);
    vi.advanceTimersByTime(200);
    expect(visible()).toBe(0);
  });

  it('reports the close only once the toast has gone, not when it is shown', () => {
    const onClose = vi.fn();
    toasts.show({ ...TOAST, onClose });

    vi.advanceTimersByTime(4_000);
    expect(onClose).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1_100);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not stack a second identical toast while one is on screen', () => {
    const first = toasts.show(TOAST);
    const second = toasts.show(TOAST);

    expect(second).toBe(first);
    expect(visible()).toBe(1);
  });

  it('closes a toast when asked, without waiting for the countdown', () => {
    const id = toasts.show(TOAST);

    toasts.dismiss(id);
    expect(visible()).toBe(0);
    vi.advanceTimersByTime(300);
    expect(toasts.toasts()).toHaveLength(0);
  });
});
