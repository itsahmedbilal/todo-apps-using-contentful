import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { TodoApiService } from '../../core/api/todo-api.service';
import {
  ApiUnavailableError,
  ApiValidationError,
  Todo,
  TodoInput,
} from '../../core/api/todo.models';
import { LoadStatus } from '../../core/content/content.models';
import { ContentStore } from '../../core/content/content.store';
import { StatusService } from '../../shared/status-region/status.service';
import {
  DEFAULT_FILTERS,
  NATURAL_DIRECTION,
  TodoFilterState,
  applyFilters,
  countRemaining,
} from './todo-filters';

/**
 * The outcome of an action. `error` is null when the action was ignored because an earlier request for
 * the same thing is still running.
 */
export type ActionResult<T = void> =
  { ok: true; value: T } | { ok: false; error: ApiValidationError | ApiUnavailableError | null };

const IGNORED: ActionResult<never> = { ok: false, error: null };

/** The user's tasks. Talks to the backend only through `TodoApiService`. */
@Injectable({ providedIn: 'root' })
export class TodoStore {
  private readonly api = inject(TodoApiService);
  private readonly announcer = inject(StatusService);
  private readonly content = inject(ContentStore);

  private readonly items = signal<readonly Todo[]>([]);
  private readonly loadStatus = signal<LoadStatus>('idle');
  private readonly failed = signal(false);
  private readonly saving = signal(false);
  private readonly clearing = signal(false);
  private readonly busyIds = signal<ReadonlySet<Todo['id']>>(new Set());
  private readonly filterState = signal<TodoFilterState>(DEFAULT_FILTERS);

  readonly todos = this.items.asReadonly();
  readonly status = this.loadStatus.asReadonly();
  /** True after an add, edit, toggle or delete failed because the backend could not be used. */
  readonly actionFailed = this.failed.asReadonly();
  /** True while an add or edit is being saved. */
  readonly isSaving = this.saving.asReadonly();
  /** True while completed tasks are being cleared. */
  readonly isClearing = this.clearing.asReadonly();

  readonly filters = this.filterState.asReadonly();
  /** The tasks that pass the current filters, in the chosen order. */
  readonly visibleTodos = computed(() =>
    applyFilters(
      this.items(),
      this.filterState(),
      (slug) => this.content.findPriority(slug)?.level ?? 0,
    ),
  );
  /** How many tasks are completed. */
  readonly completedCount = computed(() => this.items().filter((item) => item.completed).length);
  /** How many tasks are not completed, whatever the filters. */
  readonly remainingCount = computed(() => countRemaining(this.items()));

  /** Changes some filters. Choosing a different sort starts it in its natural direction. */
  setFilters(change: Partial<TodoFilterState>): void {
    this.filterState.update((current) => {
      const next = { ...current, ...change };
      if (change.sortBy && change.sortBy !== current.sortBy && !change.sortDirection) {
        next.sortDirection = NATURAL_DIRECTION[change.sortBy];
      }
      return next;
    });
  }

  resetFilters(): void {
    this.filterState.set(DEFAULT_FILTERS);
  }

  isBusy(id: Todo['id']): boolean {
    return this.busyIds().has(id);
  }

  async load(): Promise<void> {
    if (this.loadStatus() === 'loading') return;
    this.loadStatus.set('loading');
    try {
      this.items.set(await firstValueFrom(this.api.list()));
      this.loadStatus.set('ready');
    } catch {
      this.items.set([]);
      this.loadStatus.set('error');
    }
  }

  retry(): Promise<void> {
    return this.load();
  }

  clearActionFailure(): void {
    this.failed.set(false);
  }

  async add(input: TodoInput): Promise<ActionResult<Todo>> {
    if (this.saving()) return IGNORED;
    this.saving.set(true);
    try {
      const result = await this.run(this.api.create(input));
      if (result.ok) {
        this.items.update((items) => [result.value, ...items]);
        this.announcer.announce('message.itemSaved');
      }
      return result;
    } finally {
      this.saving.set(false);
    }
  }

  async update(id: Todo['id'], input: TodoInput): Promise<ActionResult<Todo>> {
    if (this.saving()) return IGNORED;
    this.saving.set(true);
    try {
      const result = await this.run(this.api.update(id, input));
      if (result.ok) {
        this.replace(result.value);
        this.announcer.announce('message.itemSaved');
      }
      return result;
    } finally {
      this.saving.set(false);
    }
  }

  /** Marks a todo complete or active. Repeated calls for the same todo are ignored until the first finishes. */
  async toggle(id: Todo['id']): Promise<ActionResult<Todo>> {
    const current = this.items().find((item) => item.id === id);
    if (!current || this.isBusy(id)) return IGNORED;
    this.setBusy(id, true);
    try {
      const result = await this.run(this.api.patch(id, { completed: !current.completed }));
      if (result.ok) this.replace(result.value);
      return result;
    } finally {
      this.setBusy(id, false);
    }
  }

  async remove(id: Todo['id']): Promise<ActionResult> {
    if (this.isBusy(id)) return IGNORED;
    this.setBusy(id, true);
    try {
      const result = await this.run(this.api.remove(id));
      if (result.ok) {
        this.items.update((items) => items.filter((item) => item.id !== id));
        this.announcer.announce('message.itemDeleted');
      }
      return result;
    } finally {
      this.setBusy(id, false);
    }
  }

  /** Deletes every completed task. Tasks that could not be deleted stay in the list and raise `actionFailed`. */
  async clearCompleted(): Promise<ActionResult> {
    const ids = this.items()
      .filter((item) => item.completed && !this.isBusy(item.id))
      .map((item) => item.id);
    if (this.clearing() || ids.length === 0) return IGNORED;
    this.clearing.set(true);
    this.failed.set(false);
    ids.forEach((id) => this.setBusy(id, true));
    try {
      const results = await Promise.allSettled(
        ids.map((id) => firstValueFrom(this.api.remove(id))),
      );
      const removed = new Set(ids.filter((_, index) => results[index].status === 'fulfilled'));
      this.items.update((items) => items.filter((item) => !removed.has(item.id)));
      if (removed.size < ids.length) {
        this.failed.set(true);
        return { ok: false, error: new ApiUnavailableError(0) };
      }
      this.announcer.announce('message.completedCleared');
      return { ok: true, value: undefined };
    } finally {
      ids.forEach((id) => this.setBusy(id, false));
      this.clearing.set(false);
    }
  }

  private async run<T>(request: Observable<T>): Promise<ActionResult<T>> {
    this.failed.set(false);
    try {
      return { ok: true, value: await firstValueFrom(request) };
    } catch (error) {
      if (error instanceof ApiValidationError) return { ok: false, error };
      this.failed.set(true);
      return {
        ok: false,
        error: error instanceof ApiUnavailableError ? error : new ApiUnavailableError(0),
      };
    }
  }

  private replace(updated: Todo): void {
    this.items.update((items) => items.map((item) => (item.id === updated.id ? updated : item)));
  }

  private setBusy(id: Todo['id'], busy: boolean): void {
    this.busyIds.update((ids) => {
      const next = new Set(ids);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }
}
