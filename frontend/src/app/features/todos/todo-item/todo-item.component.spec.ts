import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Todo } from '../../../core/api/todo.models';
import { registerLocales } from '../../../core/i18n/locales';
import { assertNoLiteralText } from '../../../../testing/assert-no-literal-text';
import { expectNoAxeViolations } from '../../../../testing/axe';
import { loadFakeContent, provideFakeContent, sentinel } from '../../../../testing/fake-content';
import { TodoItemComponent } from './todo-item.component';

const baseTodo: Todo = {
  id: 4,
  title: 'Water the plants <b>daily</b>',
  description: 'Use the green can',
  completed: false,
  prioritySlug: 'medium',
  dueDate: '2026-03-04',
  createdAt: '',
  updatedAt: '',
};

async function render(todo: Todo = baseTodo, lang: 'en' | 'fr' = 'en') {
  await loadFakeContent(lang);
  const fixture = TestBed.createComponent(TodoItemComponent);
  fixture.componentRef.setInput('todo', todo);
  await fixture.whenStable();
  const element: HTMLElement = fixture.nativeElement;
  const get = <T extends HTMLElement>(testId: string) =>
    element.querySelector<T>(`[data-testid="${testId}"]`);
  return { fixture, element, get };
}

/** The accessible name computed from aria-labelledby, as a screen reader would read it. */
function accessibleName(element: HTMLElement, button: HTMLElement): string {
  const ids = button.getAttribute('aria-labelledby')!.split(' ');
  return ids.map((id) => element.querySelector(`#${id}`)?.textContent).join(' ');
}

describe('TodoItemComponent', () => {
  beforeEach(() => {
    registerLocales();
    TestBed.configureTestingModule({ providers: provideFakeContent() });
  });

  it('shows the title and description exactly as typed, without interpreting them', async () => {
    const { get, element } = await render();
    expect(get('todo-title')?.textContent).toBe('Water the plants <b>daily</b>');
    expect(get('todo-description')?.textContent).toBe('Use the green can');
    expect(element.querySelector('b')).toBeNull();
  });

  it('leaves out the description and due date when the task has none', async () => {
    const { get } = await render({ ...baseTodo, description: '', dueDate: null });
    expect(get('todo-description')).toBeNull();
    expect(get('todo-due')).toBeNull();
  });

  it('formats the due date for the active language', async () => {
    const english = await render(baseTodo, 'en');
    const englishText = english.get('todo-due')?.textContent ?? '';
    expect(englishText).toContain('2026');
    expect(englishText).toMatch(/Mar/);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: provideFakeContent() });
    const french = await render(baseTodo, 'fr');
    expect(french.get('todo-due')?.textContent).toMatch(/mars/);
  });

  it('labels the toggle button by completion state', async () => {
    const active = await render();
    expect(active.get('todo-toggle')?.textContent).toBe(sentinel('button.markComplete', 'en-CA'));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: provideFakeContent() });
    const done = await render({ ...baseTodo, completed: true });
    expect(done.get('todo-toggle')?.textContent).toBe(sentinel('button.markIncomplete', 'en-CA'));
    expect(done.get('todo-completed')?.textContent).toBe(sentinel('status.completed', 'en-CA'));
  });

  it('does not show the completed text for an active task', async () => {
    const { get } = await render();
    expect(get('todo-completed')).toBeNull();
  });

  it('emits toggle, edit and remove with the todo', async () => {
    const { fixture, get } = await render();
    const toggled = vi.fn();
    const edited = vi.fn();
    const removed = vi.fn();
    fixture.componentInstance.toggled.subscribe(toggled);
    fixture.componentInstance.edited.subscribe(edited);
    fixture.componentInstance.removed.subscribe(removed);

    get<HTMLButtonElement>('todo-toggle')!.click();
    get<HTMLButtonElement>('todo-edit')!.click();
    get<HTMLButtonElement>('todo-delete')!.click();

    expect(toggled).toHaveBeenCalledWith(baseTodo);
    expect(edited).toHaveBeenCalledWith(baseTodo);
    expect(removed).toHaveBeenCalledWith(baseTodo);
  });

  it('gives each action an accessible name made of its label and the task title', async () => {
    const { get, element } = await render();
    const title = baseTodo.title;
    expect(accessibleName(element, get('todo-toggle')!)).toBe(
      `${sentinel('button.markComplete', 'en-CA')} ${title}`,
    );
    expect(accessibleName(element, get('todo-edit')!)).toBe(
      `${sentinel('button.edit', 'en-CA')} ${title}`,
    );
    expect(accessibleName(element, get('todo-delete')!)).toBe(
      `${sentinel('button.delete', 'en-CA')} ${title}`,
    );
  });

  it('never gives two rows the same button names', async () => {
    await loadFakeContent('en');
    const first = TestBed.createComponent(TodoItemComponent);
    const second = TestBed.createComponent(TodoItemComponent);
    first.componentRef.setInput('todo', { ...baseTodo, id: 1 });
    second.componentRef.setInput('todo', { ...baseTodo, id: 2 });
    await first.whenStable();
    await second.whenStable();
    document.body.append(first.nativeElement, second.nativeElement);
    const ids = [...document.querySelectorAll('[id]')].map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    first.nativeElement.remove();
    second.nativeElement.remove();
  });

  it('disables the actions while a request for this task is running', async () => {
    const { fixture, get } = await render();
    fixture.componentRef.setInput('busy', true);
    await fixture.whenStable();
    expect(get<HTMLButtonElement>('todo-toggle')?.getAttribute('aria-disabled')).toBe('true');
  });

  it('renders no literal text and has no accessibility violations', async () => {
    const { element } = await render({ ...baseTodo, dueDate: null, completed: true }, 'fr');
    expect(() =>
      assertNoLiteralText(element, [baseTodo.title, baseTodo.description!]),
    ).not.toThrow();
    await expectNoAxeViolations(element);
  });

  describe('category and priority', () => {
    it('shows both as text labels in the active language', async () => {
      const { get } = await render(
        { ...baseTodo, categorySlug: 'work', prioritySlug: 'high' },
        'fr',
      );
      expect(get('todo-category')?.textContent).toBe(sentinel('category.work', 'fr-CA'));
      expect(get('todo-priority')?.textContent).toBe(sentinel('priority.high', 'fr-CA'));
    });

    it('shows the uncategorized label when the category was removed', async () => {
      const { get } = await render({ ...baseTodo, categorySlug: 'gone' });
      expect(get('todo-category')?.textContent).toBe(sentinel('status.uncategorized', 'en-CA'));
    });

    it('shows no category badge when the task has no category', async () => {
      const { get } = await render({ ...baseTodo, categorySlug: null });
      expect(get('todo-category')).toBeNull();
    });

    it('shows no priority badge when there is no label to show for it', async () => {
      const { get } = await render({ ...baseTodo, prioritySlug: 'unknown' });
      expect(get('todo-priority')).toBeNull();
    });
  });
});

describe('TodoItemComponent overdue state', () => {
  async function renderWith(todo: Partial<Todo>) {
    TestBed.configureTestingModule({ providers: provideFakeContent() });
    await loadFakeContent('en');
    const fixture = TestBed.createComponent(TodoItemComponent);
    fixture.componentRef.setInput('todo', {
      id: 1,
      title: 'x',
      completed: false,
      prioritySlug: 'medium',
      createdAt: '',
      updatedAt: '',
      ...todo,
    });
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows an icon and the overdue text, not colour alone, for a past-due active task', async () => {
    const element = await renderWith({ dueDate: '2000-01-01' });
    const overdue = element.querySelector('[data-testid="todo-overdue"]')!;
    expect(overdue.textContent).toContain(sentinel('status.overdue', 'en-CA'));
    expect(overdue.querySelector('[aria-hidden="true"]')).not.toBeNull();
    await expectNoAxeViolations(element);
  });

  it('shows nothing for a completed, future or undated task', async () => {
    for (const todo of [
      { dueDate: '2000-01-01', completed: true },
      { dueDate: '2999-01-01' },
      {},
    ]) {
      TestBed.resetTestingModule();
      const element = await renderWith(todo);
      expect(element.querySelector('[data-testid="todo-overdue"]')).toBeNull();
    }
  });
});
