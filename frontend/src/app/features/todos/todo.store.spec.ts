import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { TodoApiService } from '../../core/api/todo-api.service';
import { ApiUnavailableError, ApiValidationError, Todo } from '../../core/api/todo.models';
import { StatusService } from '../../shared/status-region/status.service';
import { TodoStore } from './todo.store';

function todo(id: number, overrides: Partial<Todo> = {}): Todo {
  return {
    id,
    title: `task ${id}`,
    completed: false,
    prioritySlug: 'medium',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function setup(initial: Todo[] = [todo(1), todo(2)]) {
  const api = {
    list: vi.fn((): Observable<Todo[]> => of(initial)),
    create: vi.fn((input: { title: string }): Observable<Todo> =>
      of(todo(99, { title: input.title })),
    ),
    update: vi.fn((id: Todo['id'], input: { title: string }): Observable<Todo> =>
      of(todo(Number(id), { title: input.title })),
    ),
    patch: vi.fn((id: Todo['id'], patch: Partial<Todo>): Observable<Todo> =>
      of(todo(Number(id), patch)),
    ),
    remove: vi.fn((): Observable<void> => of(undefined)),
  };
  TestBed.configureTestingModule({ providers: [{ provide: TodoApiService, useValue: api }] });
  return { api, store: TestBed.inject(TodoStore), status: TestBed.inject(StatusService) };
}

describe('TodoStore', () => {
  describe('load', () => {
    it('starts idle and loads the todos', async () => {
      const { store } = setup();
      expect(store.status()).toBe('idle');
      await store.load();
      expect(store.status()).toBe('ready');
      expect(store.todos().map((t) => t.id)).toEqual([1, 2]);
    });

    it('reports an error when loading fails, and retry loads again', async () => {
      const { store, api } = setup();
      api.list.mockReturnValueOnce(throwError(() => new ApiUnavailableError(500)));
      await store.load();
      expect(store.status()).toBe('error');
      expect(store.todos()).toEqual([]);

      await store.retry();
      expect(store.status()).toBe('ready');
      expect(store.todos().length).toBe(2);
    });

    it('does not start a second load while one is running', async () => {
      const { store, api } = setup();
      const pending = new Subject<Todo[]>();
      api.list.mockReturnValueOnce(pending);
      const first = store.load();
      void store.load();
      expect(api.list).toHaveBeenCalledTimes(1);
      pending.next([]);
      pending.complete();
      await first;
    });
  });

  describe('add', () => {
    it('adds the new todo to the list and announces that it was saved', async () => {
      const { store, status } = setup();
      await store.load();
      const result = await store.add({ title: 'new' });
      expect(result.ok).toBe(true);
      expect(store.todos().map((t) => t.id)).toEqual([99, 1, 2]);
      expect(status.messageKey()).toBe('message.itemSaved');
    });

    it('returns the field errors when the backend rejects the input, without announcing', async () => {
      const { store, api, status } = setup();
      api.create.mockReturnValueOnce(
        throwError(() => new ApiValidationError([{ field: 'title', code: 'required' }])),
      );
      const result = await store.add({ title: '' });
      expect(result.ok).toBe(false);
      expect(!result.ok && result.error).toBeInstanceOf(ApiValidationError);
      expect(store.actionFailed()).toBe(false);
      expect(status.messageKey()).toBeNull();
    });

    it('flags a failed action when the backend is unavailable', async () => {
      const { store, api } = setup();
      api.create.mockReturnValueOnce(throwError(() => new ApiUnavailableError(500)));
      const result = await store.add({ title: 'x' });
      expect(result.ok).toBe(false);
      expect(store.actionFailed()).toBe(true);
      store.clearActionFailure();
      expect(store.actionFailed()).toBe(false);
    });

    it('ignores a second add while the first is still saving', async () => {
      const { store, api } = setup();
      const pending = new Subject<Todo>();
      api.create.mockReturnValueOnce(pending);
      const first = store.add({ title: 'a' });
      const second = await store.add({ title: 'a' });
      expect(second).toEqual({ ok: false, error: null });
      expect(api.create).toHaveBeenCalledTimes(1);
      pending.next(todo(5));
      pending.complete();
      expect((await first).ok).toBe(true);
    });
  });

  describe('update', () => {
    it('replaces the todo in the list and announces that it was saved', async () => {
      const { store, status } = setup();
      await store.load();
      const result = await store.update(2, { title: 'renamed' });
      expect(result.ok).toBe(true);
      expect(store.todos().find((t) => t.id === 2)?.title).toBe('renamed');
      expect(store.todos().length).toBe(2);
      expect(status.messageKey()).toBe('message.itemSaved');
    });
  });

  describe('toggle', () => {
    it('sends the opposite completed value and updates the list', async () => {
      const { store, api } = setup([todo(1, { completed: false })]);
      await store.load();
      await store.toggle(1);
      expect(api.patch).toHaveBeenCalledWith(1, { completed: true });
      expect(store.todos()[0].completed).toBe(true);
      await store.toggle(1);
      expect(api.patch).toHaveBeenLastCalledWith(1, { completed: false });
    });

    it('does not send duplicate requests for repeated rapid toggles', async () => {
      const { store, api } = setup([todo(1)]);
      await store.load();
      const pending = new Subject<Todo>();
      api.patch.mockReturnValueOnce(pending);
      const first = store.toggle(1);
      const second = await store.toggle(1);
      const third = await store.toggle(1);
      expect(second).toEqual({ ok: false, error: null });
      expect(third).toEqual({ ok: false, error: null });
      expect(api.patch).toHaveBeenCalledTimes(1);
      expect(store.isBusy(1)).toBe(true);
      pending.next(todo(1, { completed: true }));
      pending.complete();
      await first;
      expect(store.isBusy(1)).toBe(false);
    });

    it('leaves the todo unchanged and flags the failure when the backend fails', async () => {
      const { store, api } = setup([todo(1)]);
      await store.load();
      api.patch.mockReturnValueOnce(throwError(() => new ApiUnavailableError(500)));
      await store.toggle(1);
      expect(store.todos()[0].completed).toBe(false);
      expect(store.actionFailed()).toBe(true);
      expect(store.isBusy(1)).toBe(false);
    });

    it('toggles a todo on a different row while another is in flight', async () => {
      const { store, api } = setup();
      await store.load();
      const pending = new Subject<Todo>();
      api.patch.mockReturnValueOnce(pending);
      void store.toggle(1);
      const other = await store.toggle(2);
      expect(other.ok).toBe(true);
      expect(api.patch).toHaveBeenCalledTimes(2);
    });
  });

  describe('remove', () => {
    it('removes the todo and announces that it was deleted', async () => {
      const { store, status } = setup();
      await store.load();
      const result = await store.remove(1);
      expect(result.ok).toBe(true);
      expect(store.todos().map((t) => t.id)).toEqual([2]);
      expect(status.messageKey()).toBe('message.itemDeleted');
    });

    it('keeps the todo and flags the failure when the backend fails', async () => {
      const { store, api, status } = setup();
      await store.load();
      api.remove.mockReturnValueOnce(throwError(() => new ApiUnavailableError(404)));
      await store.remove(1);
      expect(store.todos().length).toBe(2);
      expect(store.actionFailed()).toBe(true);
      expect(status.messageKey()).toBeNull();
    });
  });
});
