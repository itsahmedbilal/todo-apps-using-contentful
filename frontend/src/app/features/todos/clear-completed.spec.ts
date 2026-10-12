import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { TodoApiService } from '../../core/api/todo-api.service';
import { ApiUnavailableError, Todo } from '../../core/api/todo.models';
import { registerLocales } from '../../core/i18n/locales';
import { StatusService } from '../../shared/status-region/status.service';
import { fakeRawContent, loadFakeContent, provideFakeContent } from '../../../testing/fake-content';
import { TodoListPage } from './todo-list.page';
import { TodoStore } from './todo.store';

function todo(id: number, completed = false): Todo {
  return {
    id,
    title: `task ${id}`,
    completed,
    prioritySlug: 'medium',
    createdAt: '',
    updatedAt: '',
  };
}

async function render(todos: Todo[]) {
  const api = {
    list: vi.fn(() => of(todos)),
    remove: vi.fn((id: number): Observable<void> => of(void id)),
  };
  const raw = fakeRawContent();
  const confirm = raw.uiLabels.find(
    (l) => l.fields.key?.['en-CA'] === 'message.clearCompletedConfirm',
  )!;
  confirm.fields.value = { 'en-CA': 'Delete {count} done', 'fr-CA': 'Supprimer {count} faites' };
  TestBed.configureTestingModule({
    providers: [...provideFakeContent(raw), { provide: TodoApiService, useValue: api }],
  });
  await loadFakeContent('en');
  const fixture = TestBed.createComponent(TodoListPage);
  await fixture.whenStable();
  const element: HTMLElement = fixture.nativeElement;
  const get = (id: string) => element.querySelector<HTMLElement>(`[data-testid="${id}"]`);
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  };
  return { api, element, get, settle, store: TestBed.inject(TodoStore) };
}

describe('clear completed', () => {
  beforeEach(() => {
    registerLocales();
    if (!('showModal' in HTMLDialogElement.prototype)) {
      Object.assign(HTMLDialogElement.prototype, {
        showModal(this: HTMLDialogElement) {
          this.setAttribute('open', '');
        },
        close(this: HTMLDialogElement) {
          this.removeAttribute('open');
        },
      });
    }
  });

  it('is not offered when no task is completed', async () => {
    const { get } = await render([todo(1), todo(2)]);
    expect(get('todo-clear-completed')).toBeNull();
  });

  it('asks first, with the count in the message, and deletes nothing yet', async () => {
    const { api, get, settle } = await render([todo(1, true), todo(2), todo(3, true)]);
    get('todo-clear-completed')!.click();
    await settle();
    expect(get('confirm-dialog')?.querySelector('h2')?.textContent).toContain(
      'dialog.clearCompleted.heading',
    );
    expect(get('confirm-dialog')?.querySelector('p')?.textContent).toBe('Delete 2 done');
    expect(api.remove).not.toHaveBeenCalled();
  });

  it('removes only the completed tasks after confirming, and announces it', async () => {
    const { api, get, settle, element } = await render([todo(1, true), todo(2), todo(3, true)]);
    get('todo-clear-completed')!.click();
    await settle();
    get('confirm-ok')!.click();
    await settle();
    expect(api.remove.mock.calls.map(([id]) => id)).toEqual([1, 3]);
    expect(element.querySelectorAll('[data-testid="todo-item"]').length).toBe(1);
    expect(get('todo-clear-completed')).toBeNull();
    expect(TestBed.inject(StatusService).messageKey()).toBe('message.completedCleared');
  });

  it('keeps everything when cancelled', async () => {
    const { api, get, settle, element } = await render([todo(1, true)]);
    get('todo-clear-completed')!.click();
    await settle();
    get('confirm-cancel')!.click();
    await settle();
    expect(api.remove).not.toHaveBeenCalled();
    expect(element.querySelectorAll('[data-testid="todo-item"]').length).toBe(1);
  });

  it('keeps the tasks that could not be deleted and reports the failure', async () => {
    const { api, get, settle, store } = await render([todo(1, true), todo(2, true)]);
    api.remove.mockImplementation((id: number) =>
      id === 2 ? throwError(() => new ApiUnavailableError(500)) : of(undefined),
    );
    get('todo-clear-completed')!.click();
    await settle();
    get('confirm-ok')!.click();
    await settle();
    expect(store.todos().map((t) => t.id)).toEqual([2]);
    expect(store.actionFailed()).toBe(true);
    expect(get('todo-action-error')).not.toBeNull();
  });
});
