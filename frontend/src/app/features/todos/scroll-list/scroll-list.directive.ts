import {
  DestroyRef,
  Directive,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

/** Tasks shown before the list starts to scroll (FR-001, FR-002). */
export const SCROLL_THRESHOLD = 10;

/** Space kept free below the list when the screen is too short for 10 rows. */
const BOTTOM_MARGIN_PX = 16;

/** The list never shrinks below this many rows, however short the screen. */
const MIN_VISIBLE_ROWS = 3;

/**
 * Turns the element that wraps the task list into a scroll area once more than 10 tasks are shown.
 *
 * The limit is the measured height of the first 10 rows (rows differ in height, especially in French),
 * capped by the space left on screen below the list. While scrollable the element is a labelled,
 * focusable region; otherwise it carries none of that. The inner `ul` keeps its list semantics.
 */
@Directive({
  selector: '[appScrollList]',
  host: {
    '[style.max-height.px]': 'maxHeight()',
    '[style.overflow-y]': 'scrollable() ? "auto" : null',
    '[attr.role]': 'scrollable() ? "region" : null',
    '[attr.tabindex]': 'scrollable() ? 0 : null',
    '[attr.aria-label]': 'scrollable() ? label() : null',
    '[attr.lang]': 'scrollable() ? labelLang() : null',
  },
})
export class ScrollListDirective {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);

  /** How many tasks are shown (after filtering, searching and sorting). */
  readonly rowCount = input.required<number>();
  /** The region's accessible name, from managed content. */
  readonly label = input('');
  /** Language of the label when it is not the page language (English fallback), else null. */
  readonly labelLang = input<string | null>(null);
  /** Id of a task to scroll into view, for example one that was just added. */
  readonly revealId = input<string | number | null>(null);
  /** Emits after the requested row has been revealed. */
  readonly revealed = output<void>();

  protected readonly scrollable = computed(() => this.rowCount() > SCROLL_THRESHOLD);
  private readonly measured = signal<number | null>(null);
  protected readonly maxHeight = computed(() => (this.scrollable() ? this.measured() : null));

  constructor() {
    effect(() => {
      this.rowCount();
      afterNextRender(() => this.measure(), { injector: this.injector });
    });

    effect(() => {
      const id = this.revealId();
      if (id === null) return;
      afterNextRender(() => this.reveal(id), { injector: this.injector });
    });

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => this.measure());
      afterNextRender(
        () => {
          const list = this.element.querySelector('ul');
          if (list) observer.observe(list);
          // The form above the list opening or closing, or the window resizing, moves the list.
          observer.observe(
            this.element.closest('.page') ?? this.element.parentElement ?? this.element,
          );
        },
        { injector: this.injector },
      );
      inject(DestroyRef).onDestroy(() => observer.disconnect());
    }
  }

  private measure(): void {
    const rows = this.element.querySelector('ul')?.children;
    if (!this.scrollable() || !rows || rows.length <= SCROLL_THRESHOLD) {
      this.measured.set(null);
      return;
    }
    const host = this.element.getBoundingClientRect();
    const bottomOf = (index: number) =>
      rows[index].getBoundingClientRect().bottom - host.top + this.element.scrollTop;

    const tenRows = bottomOf(SCROLL_THRESHOLD - 1);
    const threeRows = bottomOf(MIN_VISIBLE_ROWS - 1);
    const topOnPage = host.top + window.scrollY - this.element.scrollTop;
    const available = window.innerHeight - topOnPage - BOTTOM_MARGIN_PX;

    this.measured.set(Math.round(Math.min(tenRows, Math.max(available, threeRows))));
  }

  private reveal(id: string | number): void {
    const row = Array.from(this.element.querySelectorAll<HTMLElement>('[data-task-id]')).find(
      (candidate) => candidate.dataset['taskId'] === String(id),
    );
    if (row) {
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      row.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
    }
    this.revealed.emit();
  }
}
