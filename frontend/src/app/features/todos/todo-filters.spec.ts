import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { TodoApiService } from '../../core/api/todo-api.service';
import { Todo } from '../../core/api/todo.models';
import { RawContent } from '../../core/content/content.models';
import { loadFakeContent, provideFakeContent, fakeRawContent } from '../../../testing/fake-content';
import { DEFAULT_FILTERS, TodoFilterState, applyFilters } from './todo-filters';
import { TodoStore } from './todo.store';

const LEVELS: Record<string, number> = { low: 1, medium: 2, high: 3 };
const levelOf = (slug: string) => LEVELS[slug] ?? 0;

function todo(id: number, overrides: Partial<Todo> = {}): Todo {
  return {
    id,
    title: `task ${id}`,
    completed: false,
    prioritySlug: 'medium',
    createdAt: `2026-01-0${id}T00:00:00.000Z`,
    updatedAt: '',
    ...overrides,
  };
}

const filters = (change: Partial<TodoFilterState>): TodoFilterState => ({
  ...DEFAULT_FILTERS,
  ...change,
});
const ids = (list: Todo[]) => list.map((item) => item.id);

describe('applyFilters', () => {
  const todos = [
    todo(1, { completed: true, categorySlug: 'work', prioritySlug: 'high', title: 'Write Report' }),
    todo(2, { categorySlug: 'work', prioritySlug: 'low', title: 'Buy bread' }),
    todo(3, { categorySlug: 'personal', prioritySlug: 'high', title: 'Call mum' }),
    todo(4, { title: 'Report bug' }),
  ];

  it('returns everything by default, newest first', () => {
    expect(ids(applyFilters(todos, DEFAULT_FILTERS, levelOf))).toEqual([4, 3, 2, 1]);
  });

  it('filters by status', () => {
    expect(ids(applyFilters(todos, filters({ status: 'active' }), levelOf))).toEqual([4, 3, 2]);
    expect(ids(applyFilters(todos, filters({ status: 'completed' }), levelOf))).toEqual([1]);
  });

  it('filters by category and by priority', () => {
    expect(ids(applyFilters(todos, filters({ categorySlug: 'work' }), levelOf))).toEqual([2, 1]);
    expect(ids(applyFilters(todos, filters({ prioritySlug: 'high' }), levelOf))).toEqual([3, 1]);
  });

  it('combines status, category, priority and search with AND', () => {
    const combined = filters({
      status: 'active',
      categorySlug: 'work',
      prioritySlug: 'low',
      search: 'bread',
    });
    expect(ids(applyFilters(todos, combined, levelOf))).toEqual([2]);
    expect(ids(applyFilters(todos, { ...combined, status: 'completed' }, levelOf))).toEqual([]);
  });

  it('searches titles ignoring case and surrounding spaces', () => {
    expect(ids(applyFilters(todos, filters({ search: ' REPORT ' }), levelOf))).toEqual([4, 1]);
    expect(ids(applyFilters(todos, filters({ search: 'nothing' }), levelOf))).toEqual([]);
  });

  it('does not change the list it was given', () => {
    const copy = [...todos];
    applyFilters(todos, filters({ sortBy: 'priority' }), levelOf);
    expect(todos).toEqual(copy);
  });

  describe('sorting', () => {
    const dated = [
      todo(1, { dueDate: '2026-03-10' }),
      todo(2),
      todo(3, { dueDate: '2026-02-01' }),
      todo(4, { dueDate: null }),
    ];

    it('sorts by due date, earliest first, with no-date tasks last', () => {
      const sorted = applyFilters(
        dated,
        filters({ sortBy: 'dueDate', sortDirection: 'asc' }),
        levelOf,
      );
      expect(ids(sorted)).toEqual([3, 1, 2, 4]);
    });

    it('keeps no-date tasks last when the due date order is reversed', () => {
      const sorted = applyFilters(
        dated,
        filters({ sortBy: 'dueDate', sortDirection: 'desc' }),
        levelOf,
      );
      expect(ids(sorted)).toEqual([1, 3, 2, 4]);
    });

    it('sorts by priority level, highest first, then by due date', () => {
      const list = [
        todo(1, { prioritySlug: 'low' }),
        todo(2, { prioritySlug: 'high', dueDate: '2026-05-01' }),
        todo(3, { prioritySlug: 'high', dueDate: '2026-04-01' }),
        todo(4, { prioritySlug: 'medium' }),
        todo(5, { prioritySlug: 'high' }),
      ];
      const sorted = applyFilters(
        list,
        filters({ sortBy: 'priority', sortDirection: 'desc' }),
        levelOf,
      );
      expect(ids(sorted)).toEqual([3, 2, 5, 4, 1]);
    });

    it('reverses the priority order when asked', () => {
      const list = [todo(1, { prioritySlug: 'low' }), todo(2, { prioritySlug: 'high' })];
      const sorted = applyFilters(
        list,
        filters({ sortBy: 'priority', sortDirection: 'asc' }),
        levelOf,
      );
      expect(ids(sorted)).toEqual([1, 2]);
    });

    it('sorts by created date, newest first, and can be reversed', () => {
      expect(ids(applyFilters(todos, filters({ sortBy: 'createdAt' }), levelOf))).toEqual([
        4, 3, 2, 1,
      ]);
      const oldest = filters({ sortBy: 'createdAt', sortDirection: 'asc' });
      expect(ids(applyFilters(todos, oldest, levelOf))).toEqual([1, 2, 3, 4]);
    });
  });
});

describe('TodoStore filtering', () => {
  async function setup(initial: Todo[]) {
    const api = {
      list: vi.fn(() => of(initial)),
      create: vi.fn((input: { title: string }) => of(todo(9, { title: input.title }))),
      update: vi.fn(),
      patch: vi.fn((id: number, patch: Partial<Todo>) => of(todo(id, patch))),
      remove: vi.fn(() => of(undefined)),
    };
    const raw: RawContent = fakeRawContent();
    raw.priorities.push({
      sys: { id: 'priority-medium', contentType: { sys: { id: 'priority' } } },
      fields: {
        label: { 'en-CA': 'm', 'fr-CA': 'm' },
        slug: { 'en-CA': 'medium' },
        level: { 'en-CA': 2 },
        colour: { 'en-CA': '#ffaa00' },
      },
    });
    TestBed.configureTestingModule({
      providers: [...provideFakeContent(raw), { provide: TodoApiService, useValue: api }],
    });
    await loadFakeContent('en');
    const store = TestBed.inject(TodoStore);
    await store.load();
    return { store, api };
  }

  it('starts with the default filters showing every task', async () => {
    const { store } = await setup([todo(1), todo(2)]);
    expect(store.filters()).toEqual(DEFAULT_FILTERS);
    expect(ids(store.visibleTodos())).toEqual([2, 1]);
  });

  it('narrows and reorders the visible tasks when filters change, and resets', async () => {
    const { store } = await setup([
      todo(1, { prioritySlug: 'low' }),
      todo(2, { prioritySlug: 'high', completed: true }),
      todo(3, { prioritySlug: 'high' }),
    ]);
    store.setFilters({ status: 'active' });
    expect(ids(store.visibleTodos())).toEqual([3, 1]);
    store.setFilters({ sortBy: 'priority' });
    expect(store.filters().sortDirection).toBe('desc');
    expect(ids(store.visibleTodos())).toEqual([3, 1]);
    store.resetFilters();
    expect(ids(store.visibleTodos())).toEqual([3, 2, 1]);
  });

  it('starts each sort in its natural direction', async () => {
    const { store } = await setup([todo(1)]);
    store.setFilters({ sortBy: 'dueDate' });
    expect(store.filters().sortDirection).toBe('asc');
    store.setFilters({ sortBy: 'createdAt' });
    expect(store.filters().sortDirection).toBe('desc');
  });

  it('counts remaining tasks, and keeps counting after add, complete and delete', async () => {
    const { store } = await setup([todo(1), todo(2), todo(3, { completed: true })]);
    expect(store.remainingCount()).toBe(2);

    await store.add({ title: 'new' });
    expect(store.remainingCount()).toBe(3);

    await store.toggle(1);
    expect(store.remainingCount()).toBe(2);

    await store.remove(2);
    expect(store.remainingCount()).toBe(1);
  });

  it('counts every active task even when a filter hides some', async () => {
    const { store } = await setup([todo(1), todo(2, { completed: true })]);
    store.setFilters({ status: 'completed' });
    expect(store.visibleTodos().length).toBe(1);
    expect(store.remainingCount()).toBe(1);
  });

  it('gives an empty visible list when nothing matches', async () => {
    const { store } = await setup([todo(1)]);
    store.setFilters({ search: 'zzz' });
    expect(store.visibleTodos()).toEqual([]);
    expect(store.todos().length).toBe(1);
  });
});
