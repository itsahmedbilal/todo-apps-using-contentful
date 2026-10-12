import { Injectable, OnDestroy, signal } from '@angular/core';

const DEFAULT_DURATION_MS = 6000;

/**
 * The success message currently announced to the user (for example after saving a task). It holds a
 * label key, not text, so the message follows the active language.
 */
@Injectable({ providedIn: 'root' })
export class StatusService implements OnDestroy {
  private readonly current = signal<string | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;

  readonly messageKey = this.current.asReadonly();

  /** Announces a message, replacing any earlier one, and clears it after a few seconds. */
  announce(key: string, durationMs = DEFAULT_DURATION_MS): void {
    this.clearTimer();
    this.current.set(key);
    this.timer = setTimeout(() => this.current.set(null), durationMs);
  }

  clear(): void {
    this.clearTimer();
    this.current.set(null);
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  private clearTimer(): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
  }
}
