import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { TodoApiService } from '../../core/api/todo-api.service';
import { ApiUnavailableError, ApiValidationError, Todo } from '../../core/api/todo.models';
import { LanguageService } from '../../core/i18n/language.service';
import { registerLocales } from '../../core/i18n/locales';
import { StatusService } from '../../shared/status-region/status.service';
import { assertNoLiteralText } from '../../../testing/assert-no-literal-text';
import { expectNoAxeViolations } from '../../../testing/axe';
import {
  fakeRawContent,
  loadFakeContent,
  provideFakeContent,
  sentinel,
} from '../../../testing/fake-content';
import { TodoListPage } from './todo-list.page';

function todo(id: number, overrides: Partial<Todo> = {}): Todo {
  return {
    id,
    title: `task ${id}`,
    completed: false,
    prioritySlug: 'medium',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

interface Options {
  todos?: Todo[] | Observable<Todo[]>;
  lang?: 'en' | 'fr';
  withIllustration?: boolean;
  createFails?: boolean;
}

async function render(options: Options = {}) {
  const initial = options.todos ?? [todo(1), todo(2)];
  const api = {
    list: vi.fn(() => (Array.isArray(initial) ? of(initial) : initial)),
    create: vi.fn((input: { title: string }) =>
      options.createFails
        ? throwError(() => new ApiUnavailableError(500))
        : of(todo(50, { title: input.title })),
    ),
    update: vi.fn((id: number, input: { title: string }) => of(todo(id, { title: input.title }))),
    patch: vi.fn((id: number, patch: Partial<Todo>) => of(todo(id, patch))),
    remove: vi.fn(() => of(undefined)),
  };
  TestBed.configureTestingModule({
    providers: [
      ...provideFakeContent(fakeRawContent({ withIllustration: options.withIllustration })),
      { provide: TodoApiService, useValue: api },
    ],
  });
  await loadFakeContent(options.lang ?? 'en');

  const fixture = TestBed.createComponent(TodoListPage);
  await fixture.whenStable();
  const element: HTMLElement = fixture.nativeElement;
  const get = <T extends HTMLElement>(testId: string) =>
    element.querySelector<T>(`[data-testid="${testId}"]`);
  const all = (testId: string) =>
    Array.from(element.querySelectorAll<HTMLElement>(`[data-testid="${testId}"]`));
  // Lets pending promises (the store awaits its requests) finish, then waits for rendering.
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  };
  async function type(testId: string, value: string) {
    const field = get<HTMLInputElement>(testId)!;
    field.value = value;
    field.dispatchEvent(new Event('input'));
    await settle();
  }
  async function submitForm() {
    get('todo-form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
  }
  return { fixture, element, api, get, all, settle, type, submitForm };
}

describe('TodoListPage', () => {
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

  afterEach(() => vi.restoreAllMocks());

  it('shows the page title from the home page entry as the main heading', async () => {
    const { get } = await render();
    expect(get('todo-page-heading')?.textContent).toBe(sentinel('page.home.title', 'en-CA'));
    expect(get('todo-page-heading')?.tagName).toBe('H1');
  });

  describe('loading', () => {
    it('shows a loader while the tasks load, then the list', async () => {
      const pending = new Subject<Todo[]>();
      const { get, all, settle } = await render({ todos: pending });
      expect(get('todo-loader')).not.toBeNull();
      expect(all('todo-item').length).toBe(0);

      pending.next([todo(1), todo(2), todo(3)]);
      pending.complete();
      await settle();
      expect(get('todo-loader')).toBeNull();
      expect(all('todo-item').length).toBe(3);
    });
  });

  describe('list', () => {
    it('renders one item per task in a list', async () => {
      const { get, all } = await render();
      expect(get('todo-list')?.tagName).toBe('UL');
      expect(all('todo-item').length).toBe(2);
      expect(get('todo-empty')).toBeNull();
    });
  });

  describe('filters', () => {
    it('shows the filters bar and remaining count once there are tasks, not when empty', async () => {
      const { get } = await render({ todos: [todo(1), todo(2, { completed: true })] });
      expect(get('filters-bar')).not.toBeNull();
      expect(get('todo-remaining')?.textContent).toBe(
        sentinel('status.itemsRemaining.one', 'en-CA'),
      );

      TestBed.resetTestingModule();
      const empty = await render({ todos: [] });
      expect(empty.get('filters-bar')).toBeNull();
      expect(empty.get('todo-remaining')).toBeNull();
    });

    it('narrows the list from the filters bar and shows message.noResults when nothing matches', async () => {
      const { get, all, settle } = await render({ todos: [todo(1), todo(2)] });
      const search = get<HTMLInputElement>('filter-search')!;
      search.value = 'task 2';
      search.dispatchEvent(new Event('input'));
      await settle();
      expect(all('todo-item').length).toBe(1);
      expect(get('todo-no-results')).toBeNull();

      search.value = 'zzz';
      search.dispatchEvent(new Event('input'));
      await settle();
      expect(all('todo-item').length).toBe(0);
      expect(get('todo-no-results')?.textContent).toBe(sentinel('message.noResults', 'en-CA'));
      expect(get('todo-empty')).toBeNull();
      expect(get('filters-bar')).not.toBeNull();
    });
  });

  describe('empty state', () => {
    it('shows heading, message and call to action from the home page entry', async () => {
      const { get } = await render({ todos: [] });
      expect(get('todo-empty-heading')?.textContent).toBe(sentinel('emptyState.heading', 'en-CA'));
      expect(get('todo-empty-message')?.textContent).toBe(sentinel('emptyState.message', 'en-CA'));
      expect(get('todo-empty-action')?.textContent).toBe(
        sentinel('emptyState.callToActionLabel', 'en-CA'),
      );
      expect(get('todo-list')).toBeNull();
    });

    it('takes the illustration alt text from illustrationAlt', async () => {
      const { get } = await render({ todos: [], withIllustration: true });
      const image = get<HTMLImageElement>('todo-empty-illustration')!;
      expect(image.getAttribute('alt')).toBe(sentinel('emptyState.illustrationAlt', 'en-CA'));
    });

    it('opens the add form from the call to action', async () => {
      const { get, settle } = await render({ todos: [] });
      get<HTMLButtonElement>('todo-empty-action')!.click();
      await settle();
      expect(get('todo-form')).not.toBeNull();
    });
  });

  describe('error', () => {
    it('shows an error panel with a retry button when loading fails, and retry loads again', async () => {
      const failing = throwError(() => new ApiUnavailableError(500));
      const { api, get, all, settle } = await render({ todos: failing });
      const panel = get('todo-error')!;
      expect(panel.querySelector('p')?.textContent).toBe(sentinel('message.error.load', 'en-CA'));
      expect(panel.querySelector('button')?.textContent).toBe(sentinel('button.retry', 'en-CA'));

      api.list.mockReturnValue(of([todo(1)]));
      panel.querySelector<HTMLButtonElement>('button')!.click();
      await settle();
      expect(get('todo-error')).toBeNull();
      expect(all('todo-item').length).toBe(1);
    });
  });

  describe('adding', () => {
    it('opens the form, saves, shows the new task and announces message.itemSaved', async () => {
      const { api, get, all, settle, type, submitForm } = await render();
      get<HTMLButtonElement>('todo-add-button')!.click();
      await settle();
      expect(get('todo-form-heading')?.textContent).toBe(sentinel('form.addTitle', 'en-CA'));

      await type('todo-title-input', 'Buy bread');
      await submitForm();

      expect(api.create).toHaveBeenCalledTimes(1);
      expect(get('todo-form')).toBeNull();
      expect(all('todo-item').length).toBe(3);
      expect(all('todo-title')[0].textContent).toBe('Buy bread');
      expect(TestBed.inject(StatusService).messageKey()).toBe('message.itemSaved');
    });

    it('keeps the form open and shows backend field errors when the backend rejects the task', async () => {
      const { api, get, settle, type, submitForm } = await render();
      api.create.mockReturnValueOnce(
        throwError(() => new ApiValidationError([{ field: 'title', code: 'tooLong' }])),
      );
      get<HTMLButtonElement>('todo-add-button')!.click();
      await settle();
      await type('todo-title-input', 'x');
      await submitForm();
      expect(get('todo-form')).not.toBeNull();
      expect(get('todo-title-error')?.textContent).toBe(
        sentinel('validation.title.tooLong', 'en-CA'),
      );
    });

    it('keeps the form and shows a general error when the backend is unavailable', async () => {
      const { api, get, settle, type, submitForm } = await render();
      api.create.mockReturnValueOnce(throwError(() => new ApiUnavailableError(500)));
      get<HTMLButtonElement>('todo-add-button')!.click();
      await settle();
      await type('todo-title-input', 'x');
      await submitForm();
      expect(get('todo-form')).not.toBeNull();
      expect(get('todo-action-error')?.textContent).toBe(
        sentinel('message.error.generic', 'en-CA'),
      );
    });

    it('closes the form without saving when cancelled', async () => {
      const { api, get, settle } = await render();
      get<HTMLButtonElement>('todo-add-button')!.click();
      await settle();
      get<HTMLButtonElement>('todo-cancel')!.click();
      await settle();
      expect(get('todo-form')).toBeNull();
      expect(api.create).not.toHaveBeenCalled();
    });
  });

  describe('editing', () => {
    it('opens the form with the task, saves the change and announces message.itemSaved', async () => {
      const { api, get, all, settle, type, submitForm } = await render();
      all('todo-edit')[0].click();
      await settle();
      expect(get('todo-form-heading')?.textContent).toBe(sentinel('form.editTitle', 'en-CA'));
      expect(get<HTMLInputElement>('todo-title-input')?.value).toBe('task 1');

      await type('todo-title-input', 'renamed');
      await submitForm();

      expect(api.update).toHaveBeenCalledWith(1, expect.objectContaining({ title: 'renamed' }));
      expect(all('todo-title')[0].textContent).toBe('renamed');
      expect(TestBed.inject(StatusService).messageKey()).toBe('message.itemSaved');
    });
  });

  describe('completing', () => {
    it('toggles a task when its toggle button is used', async () => {
      const { api, all, settle } = await render();
      all('todo-toggle')[1].click();
      await settle();
      expect(api.patch).toHaveBeenCalledWith(2, { completed: true });
      expect(all('todo-completed').length).toBe(1);
    });
  });

  describe('deleting', () => {
    it('asks first with dialog.delete.heading and message.deleteConfirm, and deletes nothing yet', async () => {
      const { api, get, all, settle } = await render();
      all('todo-delete')[0].click();
      await settle();
      expect(get('confirm-dialog')).not.toBeNull();
      expect(get('confirm-dialog')?.querySelector('h2')?.textContent).toBe(
        sentinel('dialog.delete.heading', 'en-CA'),
      );
      expect(get('confirm-dialog')?.querySelector('p')?.textContent).toBe(
        sentinel('message.deleteConfirm', 'en-CA'),
      );
      expect(api.remove).not.toHaveBeenCalled();
      expect(all('todo-item').length).toBe(2);
    });

    it('deletes only after confirm, then announces message.itemDeleted', async () => {
      const { api, get, all, settle } = await render();
      all('todo-delete')[0].click();
      await settle();
      get<HTMLButtonElement>('confirm-ok')!.click();
      await settle();
      expect(api.remove).toHaveBeenCalledWith(1);
      expect(all('todo-item').length).toBe(1);
      expect(get('confirm-dialog')).toBeNull();
      expect(TestBed.inject(StatusService).messageKey()).toBe('message.itemDeleted');
    });

    it('keeps the task when the dialog is cancelled', async () => {
      const { api, get, all, settle } = await render();
      all('todo-delete')[0].click();
      await settle();
      get<HTMLButtonElement>('confirm-cancel')!.click();
      await settle();
      expect(api.remove).not.toHaveBeenCalled();
      expect(all('todo-item').length).toBe(2);
      expect(get('confirm-dialog')).toBeNull();
    });
  });

  describe('language', () => {
    it('shows French text from managed content in French', async () => {
      const { get } = await render({ todos: [], lang: 'fr' });
      expect(get('todo-empty-heading')?.textContent).toBe(sentinel('emptyState.heading', 'fr-CA'));
    });
  });

  describe('scrolling', () => {
    const many = (count: number) => Array.from({ length: count }, (_, index) => todo(index + 1));

    it('shows no scroll region with 10 tasks', async () => {
      const { get } = await render({ todos: many(10) });
      expect(get('todo-scroll')).not.toBeNull();
      expect(get('todo-scroll')!.hasAttribute('role')).toBe(false);
      expect(get('todo-scroll')!.hasAttribute('tabindex')).toBe(false);
    });

    it('makes the list a labelled, focusable region with 11 tasks', async () => {
      const { get } = await render({ todos: many(11) });
      const region = get('todo-scroll')!;
      expect(region.getAttribute('role')).toBe('region');
      expect(region.getAttribute('tabindex')).toBe('0');
      expect(region.getAttribute('aria-label')).toBe(sentinel('list.region.label', 'en-CA'));
      expect(get('todo-list')!.hasAttribute('role')).toBe(false);
    });

    it('shows no scroll area while loading, when empty, or after a load error', async () => {
      const loading = await render({ todos: new Subject<Todo[]>() });
      expect(loading.get('todo-scroll')).toBeNull();

      TestBed.resetTestingModule();
      const empty = await render({ todos: [] });
      expect(empty.get('todo-scroll')).toBeNull();

      TestBed.resetTestingModule();
      const failed = await render({ todos: throwError(() => new ApiUnavailableError(500)) });
      expect(failed.get('todo-scroll')).toBeNull();
    });

    it('keeps the same list and rows when a task is completed or the language changes', async () => {
      const { get, all, settle } = await render({ todos: many(12) });
      const region = get('todo-scroll');
      const fourth = all('todo-item')[3];

      all('todo-toggle')[1].click();
      await settle();
      expect(get('todo-scroll')).toBe(region);
      expect(all('todo-item')[3]).toBe(fourth);

      TestBed.inject(LanguageService).activate('fr');
      await settle();
      expect(get('todo-scroll')).toBe(region);
      expect(all('todo-item')[3]).toBe(fourth);
    });

    it('scrolls a newly added task into view', async () => {
      const scrollIntoView = vi.fn();
      HTMLElement.prototype.scrollIntoView = scrollIntoView;
      const { get, settle, type, submitForm } = await render({ todos: many(11) });
      get<HTMLButtonElement>('todo-add-button')!.click();
      await settle();
      await type('todo-title-input', 'a new task');
      await submitForm();
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(scrollIntoView.mock.contexts[0]).toBe(
        get('todo-list')!.querySelector('[data-task-id="50"]'),
      );
    });

    it('does not scroll when adding a task fails', async () => {
      const scrollIntoView = vi.fn();
      HTMLElement.prototype.scrollIntoView = scrollIntoView;
      const { get, settle, type, submitForm } = await render({
        todos: many(11),
        createFails: true,
      });
      get<HTMLButtonElement>('todo-add-button')!.click();
      await settle();
      await type('todo-title-input', 'a new task');
      await submitForm();
      expect(scrollIntoView).not.toHaveBeenCalled();
    });
  });

  it('renders no literal text and has no accessibility violations in each state', async () => {
    const list = await render({ lang: 'fr' });
    expect(() => assertNoLiteralText(list.element, ['task 1', 'task 2'])).not.toThrow();
    await expectNoAxeViolations(list.element);

    list.get<HTMLButtonElement>('todo-add-button')!.click();
    await list.settle();
    expect(() => assertNoLiteralText(list.element, ['task 1', 'task 2'])).not.toThrow();
    await expectNoAxeViolations(list.element);
  });

  it('has no literal text or accessibility violations when empty or failed', async () => {
    TestBed.resetTestingModule();
    const empty = await render({ todos: [], withIllustration: true });
    expect(() => assertNoLiteralText(empty.element)).not.toThrow();
    await expectNoAxeViolations(empty.element);

    TestBed.resetTestingModule();
    const failed = await render({ todos: throwError(() => new ApiUnavailableError(500)) });
    expect(() => assertNoLiteralText(failed.element)).not.toThrow();
    await expectNoAxeViolations(failed.element);
  });
});
