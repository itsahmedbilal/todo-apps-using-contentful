import { Todo } from '../../core/api/todo.models';

export type StatusFilter = 'all' | 'active' | 'completed';
export type SortBy = 'dueDate' | 'priority' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

/** What the user has chosen to narrow and order the task list by. */
export interface TodoFilterState {
  status: StatusFilter;
  categorySlug: string | null;
  prioritySlug: string | null;
  /** Matched against the task title, ignoring case. */
  search: string;
  sortBy: SortBy;
  sortDirection: SortDirection;
}

/** The direction each sort starts in: earliest due first, highest priority first, newest first. */
export const NATURAL_DIRECTION: Readonly<Record<SortBy, SortDirection>> = {
  dueDate: 'asc',
  priority: 'desc',
  createdAt: 'desc',
};

export const DEFAULT_FILTERS: TodoFilterState = {
  status: 'all',
  categorySlug: null,
  prioritySlug: null,
  search: '',
  sortBy: 'createdAt',
  sortDirection: NATURAL_DIRECTION.createdAt,
};

/** The numeric level of a priority slug (higher = more important). */
export type PriorityLevel = (slug: string) => number;

export function matches(todo: Todo, filters: TodoFilterState): boolean {
  if (filters.status === 'active' && todo.completed) return false;
  if (filters.status === 'completed' && !todo.completed) return false;
  if (filters.categorySlug !== null && todo.categorySlug !== filters.categorySlug) return false;
  if (filters.prioritySlug !== null && todo.prioritySlug !== filters.prioritySlug) return false;
  const term = filters.search.trim().toLocaleLowerCase();
  return term === '' || todo.title.toLocaleLowerCase().includes(term);
}

/** Earliest first; a task without a due date goes last whichever way the list is ordered. */
function byDueDate(a: Todo, b: Todo, direction: SortDirection): number {
  const first = a.dueDate || null;
  const second = b.dueDate || null;
  if (first === second) return 0;
  if (first === null) return 1;
  if (second === null) return -1;
  const order = first < second ? -1 : 1;
  return direction === 'asc' ? order : -order;
}

function compare(a: Todo, b: Todo, filters: TodoFilterState, levelOf: PriorityLevel): number {
  const sign = filters.sortDirection === 'asc' ? 1 : -1;
  switch (filters.sortBy) {
    case 'dueDate':
      return byDueDate(a, b, filters.sortDirection);
    case 'priority': {
      // `desc` is high first. Ties are broken by the earliest due date.
      const difference = levelOf(a.prioritySlug) - levelOf(b.prioritySlug);
      return difference !== 0 ? sign * difference : byDueDate(a, b, 'asc');
    }
    case 'createdAt':
      return a.createdAt === b.createdAt ? 0 : (a.createdAt < b.createdAt ? -1 : 1) * sign;
  }
}

/** The tasks that pass the filters, in the chosen order. Equal tasks keep their original order. */
export function applyFilters(
  todos: readonly Todo[],
  filters: TodoFilterState,
  levelOf: PriorityLevel,
): Todo[] {
  return todos
    .filter((todo) => matches(todo, filters))
    .sort((a, b) => compare(a, b, filters, levelOf));
}

/** How many tasks are not yet completed, whatever the filters. */
export function countRemaining(todos: readonly Todo[]): number {
  return todos.filter((todo) => !todo.completed).length;
}
