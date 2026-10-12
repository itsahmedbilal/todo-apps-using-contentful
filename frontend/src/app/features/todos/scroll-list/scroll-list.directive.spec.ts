import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { SCROLL_THRESHOLD, ScrollListDirective } from './scroll-list.directive';

const ROW_HEIGHT = 50;
const GAP = 10;

@Component({
  imports: [ScrollListDirective],
  template: `
    <div class="page">
      <div
        data-testid="scroll"
        appScrollList
        [rowCount]="rows().length"
        [label]="label()"
        [labelLang]="labelLang()"
        [revealId]="revealId()"
        (revealed)="revealed()"
      >
        <ul>
          @for (row of rows(); track row) {
            <li [attr.data-task-id]="row"></li>
          }
        </ul>
      </div>
    </div>
  `,
})
class HostComponent {
  readonly rows = signal<number[]>([]);
  readonly label = signal('region label');
  readonly labelLang = signal<string | null>(null);
  readonly revealId = signal<number | null>(null);
  readonly revealed = vi.fn();
}

/** jsdom has no layout, so rows are given fixed boxes: row i spans i*(ROW_HEIGHT+GAP) to + ROW_HEIGHT. */
function fakeLayout(host: HTMLElement, options: { top?: number; heights?: number[] } = {}) {
  const top = options.top ?? 0;
  const list = host.querySelector('ul')!;
  vi.spyOn(host, 'getBoundingClientRect').mockImplementation(
    () => ({ top, bottom: top + 100, left: 0, right: 100, width: 100, height: 100 }) as DOMRect,
  );
  let offset = 0;
  Array.from(list.children).forEach((row, index) => {
    const height = options.heights?.[index] ?? ROW_HEIGHT;
    const rowTop = top + offset;
    offset += height + GAP;
    vi.spyOn(row, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          top: rowTop,
          bottom: rowTop + height,
          left: 0,
          right: 100,
          width: 100,
          height,
        }) as DOMRect,
    );
  });
}

function setup(count: number) {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.componentInstance.rows.set(Array.from({ length: count }, (_, index) => index + 1));
  fixture.detectChanges();
  const host = fixture.nativeElement.querySelector('[data-testid="scroll"]') as HTMLElement;
  return { fixture, host, component: fixture.componentInstance };
}

async function settle(fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('ScrollListDirective', () => {
  let resizeCallbacks: (() => void)[];

  beforeEach(() => {
    resizeCallbacks = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resizeCallbacks.push(callback);
        }
        observe() {
          // Nothing to observe: the tests call the callbacks themselves.
        }
        unobserve() {
          // Nothing to observe: the tests call the callbacks themselves.
        }
        disconnect() {
          // Nothing to observe: the tests call the callbacks themselves.
        }
      },
    );
    vi.stubGlobal('innerHeight', 2000);
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('uses a threshold of 10 rows', () => {
    expect(SCROLL_THRESHOLD).toBe(10);
  });

  describe('limit', () => {
    it('sets no max-height with 10 rows', async () => {
      const { fixture, host } = setup(10);
      fakeLayout(host);
      resizeCallbacks.forEach((callback) => callback());
      await settle(fixture);
      expect(host.style.maxHeight).toBe('');
      expect(host.style.overflowY).toBe('');
    });

    it('limits the height to the bottom of the 10th row with 11 rows', async () => {
      const { fixture, host } = setup(11);
      fakeLayout(host);
      resizeCallbacks.forEach((callback) => callback());
      await settle(fixture);
      // 10th row ends at 9 * (50 + 10) + 50 = 590.
      expect(host.style.maxHeight).toBe('590px');
      expect(host.style.overflowY).toBe('auto');
    });

    it('follows rows of unequal heights, so exactly 10 rows fit', async () => {
      const { fixture, host } = setup(12);
      const heights = [50, 120, 50, 80, 50, 50, 200, 50, 50, 60, 50, 50];
      fakeLayout(host, { heights });
      resizeCallbacks.forEach((callback) => callback());
      await settle(fixture);
      const expected = heights.slice(0, 10).reduce((sum, h) => sum + h, 0) + 9 * GAP;
      expect(host.style.maxHeight).toBe(`${expected}px`);
    });

    it('is capped by the viewport height below the list top, minus 16px', async () => {
      vi.stubGlobal('innerHeight', 400);
      const { fixture, host } = setup(11);
      fakeLayout(host, { top: 100 });
      resizeCallbacks.forEach((callback) => callback());
      await settle(fixture);
      expect(host.style.maxHeight).toBe('284px');
    });

    it('never goes below the height of 3 rows', async () => {
      vi.stubGlobal('innerHeight', 200);
      const { fixture, host } = setup(11);
      fakeLayout(host, { top: 150 });
      resizeCallbacks.forEach((callback) => callback());
      await settle(fixture);
      // 3rd row ends at 2 * 60 + 50 = 170.
      expect(host.style.maxHeight).toBe('170px');
    });

    it('changes when the top offset of the list changes', async () => {
      vi.stubGlobal('innerHeight', 400);
      const { fixture, host } = setup(11);
      fakeLayout(host, { top: 100 });
      resizeCallbacks.forEach((callback) => callback());
      await settle(fixture);
      expect(host.style.maxHeight).toBe('284px');

      fakeLayout(host, { top: 50 });
      resizeCallbacks.forEach((callback) => callback());
      await settle(fixture);
      expect(host.style.maxHeight).toBe('334px');
    });

    it('re-measures when the row count changes and removes the limit at 10 rows', async () => {
      const { fixture, host, component } = setup(11);
      fakeLayout(host);
      resizeCallbacks.forEach((callback) => callback());
      await settle(fixture);
      expect(host.style.maxHeight).toBe('590px');

      component.rows.set(Array.from({ length: 10 }, (_, index) => index + 1));
      await settle(fixture);
      expect(host.style.maxHeight).toBe('');
    });
  });

  describe('accessibility', () => {
    it('is a labelled, focusable region while scrollable', async () => {
      const { fixture, host } = setup(11);
      await settle(fixture);
      expect(host.getAttribute('role')).toBe('region');
      expect(host.getAttribute('tabindex')).toBe('0');
      expect(host.getAttribute('aria-label')).toBe('region label');
    });

    it('has none of these attributes when not scrollable', async () => {
      const { fixture, host } = setup(10);
      await settle(fixture);
      expect(host.hasAttribute('role')).toBe(false);
      expect(host.hasAttribute('tabindex')).toBe(false);
      expect(host.hasAttribute('aria-label')).toBe(false);
    });

    it('marks fallback label text with its language', async () => {
      const { fixture, host, component } = setup(11);
      component.labelLang.set('en-CA');
      await settle(fixture);
      expect(host.getAttribute('lang')).toBe('en-CA');
    });

    it('leaves the inner list with its own semantics', async () => {
      const { fixture, host } = setup(11);
      await settle(fixture);
      expect(host.querySelector('ul')!.hasAttribute('role')).toBe(false);
    });
  });

  describe('reveal', () => {
    it('scrolls the new row into view and reports it', async () => {
      const { fixture, host, component } = setup(12);
      const row = host.querySelector('[data-task-id="12"]') as HTMLElement;
      const scrollIntoView = vi.fn();
      row.scrollIntoView = scrollIntoView;
      component.revealId.set(12);
      await settle(fixture);
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', behavior: 'smooth' });
      expect(component.revealed).toHaveBeenCalledTimes(1);
    });

    it('does not animate when the user prefers reduced motion', async () => {
      vi.stubGlobal('matchMedia', () => ({ matches: true }));
      const { fixture, host, component } = setup(12);
      const row = host.querySelector('[data-task-id="12"]') as HTMLElement;
      const scrollIntoView = vi.fn();
      row.scrollIntoView = scrollIntoView;
      component.revealId.set(12);
      await settle(fixture);
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', behavior: 'auto' });
    });

    it('does nothing when no id is given', async () => {
      const { fixture, component } = setup(12);
      await settle(fixture);
      expect(component.revealed).not.toHaveBeenCalled();
    });
  });
});
