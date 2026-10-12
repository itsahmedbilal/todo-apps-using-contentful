import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { assertNoLiteralText } from '../../../../testing/assert-no-literal-text';
import { expectNoAxeViolations } from '../../../../testing/axe';
import { loadFakeContent, provideFakeContent, sentinel } from '../../../../testing/fake-content';
import { DEFAULT_FILTERS, TodoFilterState } from '../todo-filters';
import { ContentStore } from '../../../core/content/content.store';
import { registerLocales } from '../../../core/i18n/locales';
import { FiltersBarComponent } from './filters-bar.component';

async function render(options: { lang?: 'en' | 'fr'; filters?: Partial<TodoFilterState> } = {}) {
  registerLocales();
  TestBed.configureTestingModule({ providers: provideFakeContent() });
  await loadFakeContent(options.lang ?? 'en');
  const fixture = TestBed.createComponent(FiltersBarComponent);
  fixture.componentRef.setInput('filters', { ...DEFAULT_FILTERS, ...options.filters });
  await fixture.whenStable();
  const element: HTMLElement = fixture.nativeElement;
  const changed = vi.fn<(change: Partial<TodoFilterState>) => void>();
  fixture.componentInstance.changed.subscribe(changed);
  const get = <T extends HTMLElement>(testId: string) =>
    element.querySelector<T>(`[data-testid="${testId}"]`)!;
  const texts = (testId: string) =>
    Array.from(get<HTMLSelectElement>(testId).options).map((option) => option.textContent);
  const choose = (testId: string, value: string) => {
    const select = get<HTMLSelectElement>(testId);
    select.value = value;
    select.dispatchEvent(new Event('change'));
  };
  return { fixture, element, changed, get, texts, choose };
}

describe('FiltersBarComponent', () => {
  it('labels every control from managed content', async () => {
    const { get } = await render();
    const expected: Record<string, string> = {
      'filter-search-label': 'search.label',
      'filter-status-label': 'filter.status.label',
      'filter-category-label': 'filter.category.label',
      'filter-priority-label': 'filter.priority.label',
      'filter-sort-label': 'sort.label',
    };
    for (const [testId, key] of Object.entries(expected)) {
      expect(get(testId).textContent).toBe(sentinel(key, 'en-CA'));
    }
    expect(get('filter-search').getAttribute('placeholder')).toBe(
      sentinel('search.placeholder', 'en-CA'),
    );
  });

  it('associates each label with its control', async () => {
    const { get } = await render();
    for (const name of ['search', 'status', 'category', 'priority', 'sort']) {
      expect(get(`filter-${name}-label`).getAttribute('for')).toBe(get(`filter-${name}`).id);
    }
  });

  it('offers status, category, priority and sort options in order, in the active language', async () => {
    const { texts } = await render({ lang: 'fr' });
    expect(texts('filter-status')).toEqual(
      ['all', 'active', 'completed'].map((s) => sentinel(`filter.status.${s}`, 'fr-CA')),
    );
    expect(texts('filter-category')).toEqual([
      sentinel('filter.category.all', 'fr-CA'),
      sentinel('category.personal', 'fr-CA'),
      sentinel('category.work', 'fr-CA'),
    ]);
    expect(texts('filter-priority')).toEqual([
      sentinel('filter.priority.all', 'fr-CA'),
      sentinel('priority.high', 'fr-CA'),
      sentinel('priority.low', 'fr-CA'),
    ]);
    expect(texts('filter-sort')).toEqual(
      ['createdAt', 'dueDate', 'priority'].map((s) => sentinel(`sort.${s}`, 'fr-CA')),
    );
  });

  it('shows the current choices as selected', async () => {
    const { get } = await render({
      filters: { status: 'active', categorySlug: 'work', prioritySlug: 'low', sortBy: 'priority' },
    });
    expect(get<HTMLSelectElement>('filter-status').value).toBe('active');
    expect(get<HTMLSelectElement>('filter-category').value).toBe('work');
    expect(get<HTMLSelectElement>('filter-priority').value).toBe('low');
    expect(get<HTMLSelectElement>('filter-sort').value).toBe('priority');
  });

  it('emits the changed filter when a select changes, with "all" as null', async () => {
    const { changed, choose } = await render({ filters: { categorySlug: 'work' } });
    choose('filter-status', 'completed');
    choose('filter-category', '');
    choose('filter-priority', 'high');
    choose('filter-sort', 'dueDate');
    expect(changed.mock.calls.map(([change]) => change)).toEqual([
      { status: 'completed' },
      { categorySlug: null },
      { prioritySlug: 'high' },
      { sortBy: 'dueDate' },
    ]);
  });

  it('emits the typed search text', async () => {
    const { get, changed } = await render();
    const input = get<HTMLInputElement>('filter-search');
    input.value = 'bread';
    input.dispatchEvent(new Event('input'));
    expect(changed).toHaveBeenCalledWith({ search: 'bread' });
  });

  it('shows a clear button only while searching, and clearing empties the search', async () => {
    const empty = await render();
    expect(empty.element.querySelector('[data-testid="filter-search-clear"]')).toBeNull();

    TestBed.resetTestingModule();
    const { get, changed } = await render({ filters: { search: 'bread' } });
    expect(get('filter-search-clear').textContent).toBe(sentinel('button.clearSearch', 'en-CA'));
    get<HTMLButtonElement>('filter-search-clear').click();
    expect(changed).toHaveBeenCalledWith({ search: '' });
  });

  it('is keyboard operable: every control is a native, focusable form control', async () => {
    const { element } = await render({ filters: { search: 'x' } });
    const controls = element.querySelectorAll<HTMLElement>('input, select, button');
    expect(controls.length).toBe(6);
    controls.forEach((control) => {
      expect(control.tabIndex).toBeGreaterThanOrEqual(0);
      control.focus();
      expect(document.activeElement).toBe(control);
    });
  });

  it('renders no literal text and has no accessibility violations', async () => {
    const { element } = await render({ lang: 'fr', filters: { search: 'x' } });
    expect(() => assertNoLiteralText(element)).not.toThrow();
    await expectNoAxeViolations(element);
  });
});

describe('plural remaining text', () => {
  async function remaining(lang: 'en' | 'fr', count: number) {
    TestBed.configureTestingModule({ providers: provideFakeContent() });
    await loadFakeContent(lang);
    return TestBed.inject(ContentStore).plural('status.itemsRemaining', count).text;
  }

  it('picks one/other for 0, 1 and 2 in English', async () => {
    expect(await remaining('en', 0)).toBe(sentinel('status.itemsRemaining.other', 'en-CA'));
    TestBed.resetTestingModule();
    expect(await remaining('en', 1)).toBe(sentinel('status.itemsRemaining.one', 'en-CA'));
    TestBed.resetTestingModule();
    expect(await remaining('en', 2)).toBe(sentinel('status.itemsRemaining.other', 'en-CA'));
  });

  it('treats 0 as singular in French', async () => {
    expect(await remaining('fr', 0)).toBe(sentinel('status.itemsRemaining.one', 'fr-CA'));
    TestBed.resetTestingModule();
    expect(await remaining('fr', 1)).toBe(sentinel('status.itemsRemaining.one', 'fr-CA'));
    TestBed.resetTestingModule();
    expect(await remaining('fr', 2)).toBe(sentinel('status.itemsRemaining.other', 'fr-CA'));
  });
});
