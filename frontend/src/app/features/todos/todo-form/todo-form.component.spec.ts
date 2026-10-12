import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { FieldError, Todo, TodoInput } from '../../../core/api/todo.models';
import { assertNoLiteralText } from '../../../../testing/assert-no-literal-text';
import { expectNoAxeViolations } from '../../../../testing/axe';
import { loadFakeContent, provideFakeContent, sentinel } from '../../../../testing/fake-content';
import { TodoFormComponent } from './todo-form.component';

async function render(options: { todo?: Todo; lang?: 'en' | 'fr' } = {}) {
  await loadFakeContent(options.lang ?? 'en');
  const fixture = TestBed.createComponent(TodoFormComponent);
  if (options.todo) fixture.componentRef.setInput('todo', options.todo);
  await fixture.whenStable();
  const element: HTMLElement = fixture.nativeElement;
  const saved = vi.fn<(input: TodoInput) => void>();
  fixture.componentInstance.saved.subscribe(saved);
  const get = <T extends HTMLElement>(testId: string) =>
    element.querySelector<T>(`[data-testid="${testId}"]`);

  async function type(testId: string, value: string) {
    const field = get<HTMLInputElement | HTMLTextAreaElement>(testId)!;
    field.value = value;
    field.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }
  async function submit() {
    get<HTMLFormElement>('todo-form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  }
  const errorText = (testId: string) => get(testId)?.textContent ?? null;

  return { fixture, element, saved, get, type, submit, errorText };
}

describe('TodoFormComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideFakeContent() });
  });

  it('uses the add heading and field labels from managed content', async () => {
    const { get } = await render();
    expect(get('todo-form-heading')?.textContent).toBe(sentinel('form.addTitle', 'en-CA'));
    expect(get('todo-title-label')?.textContent).toBe(sentinel('form.title.label', 'en-CA'));
    expect(get('todo-description-label')?.textContent).toBe(
      sentinel('form.description.label', 'en-CA'),
    );
    expect(get('todo-due-label')?.textContent).toBe(sentinel('form.dueDate.label', 'en-CA'));
    expect(get('todo-due-hint')?.textContent).toBe(sentinel('form.dueDate.hint', 'en-CA'));
    expect(get('todo-save')?.textContent).toBe(sentinel('button.save', 'en-CA'));
    expect(get('todo-cancel')?.textContent).toBe(sentinel('button.cancel', 'en-CA'));
  });

  it('uses the edit heading and starts with the todo values', async () => {
    const todo: Todo = {
      id: 7,
      title: 'Pay rent',
      description: 'before Friday',
      completed: true,
      categorySlug: 'work',
      prioritySlug: 'high',
      dueDate: '2026-03-04',
      createdAt: '',
      updatedAt: '',
    };
    const { get, submit, saved } = await render({ todo });
    expect(get('todo-form-heading')?.textContent).toBe(sentinel('form.editTitle', 'en-CA'));
    expect(get<HTMLInputElement>('todo-title-input')?.value).toBe('Pay rent');
    expect(get<HTMLTextAreaElement>('todo-description-input')?.value).toBe('before Friday');
    expect(get<HTMLInputElement>('todo-due-input')?.value).toBe('2026-03-04');
    await submit();
    expect(saved).toHaveBeenCalledWith({
      title: 'Pay rent',
      description: 'before Friday',
      completed: true,
      categorySlug: 'work',
      prioritySlug: 'high',
      dueDate: '2026-03-04',
    });
  });

  describe('title', () => {
    it('blocks an empty title and shows validation.title.required', async () => {
      const { submit, saved, errorText } = await render();
      await submit();
      expect(saved).not.toHaveBeenCalled();
      expect(errorText('todo-title-error')).toBe(sentinel('validation.title.required', 'en-CA'));
    });

    it('treats a title of only spaces as empty', async () => {
      const { type, submit, saved, errorText } = await render();
      await type('todo-title-input', '    ');
      await submit();
      expect(saved).not.toHaveBeenCalled();
      expect(errorText('todo-title-error')).toBe(sentinel('validation.title.required', 'en-CA'));
    });

    it('accepts a title of 120 characters', async () => {
      const { type, submit, saved } = await render();
      await type('todo-title-input', 'a'.repeat(120));
      await submit();
      expect(saved).toHaveBeenCalledTimes(1);
    });

    it('rejects a title of 121 characters with validation.title.tooLong', async () => {
      const { type, submit, saved, errorText } = await render();
      await type('todo-title-input', 'a'.repeat(121));
      await submit();
      expect(saved).not.toHaveBeenCalled();
      expect(errorText('todo-title-error')).toBe(sentinel('validation.title.tooLong', 'en-CA'));
    });

    it('counts the title after trimming', async () => {
      const { type, submit, saved } = await render();
      await type('todo-title-input', `  ${'a'.repeat(120)}  `);
      await submit();
      expect(saved).toHaveBeenCalledTimes(1);
      expect(saved.mock.calls[0][0].title).toBe('a'.repeat(120));
    });
  });

  describe('description', () => {
    it('accepts 500 characters and rejects 501 with validation.description.tooLong', async () => {
      const { type, submit, saved, errorText } = await render();
      await type('todo-title-input', 'ok');
      await type('todo-description-input', 'd'.repeat(500));
      await submit();
      expect(saved).toHaveBeenCalledTimes(1);

      await type('todo-description-input', 'd'.repeat(501));
      await submit();
      expect(saved).toHaveBeenCalledTimes(1);
      expect(errorText('todo-description-error')).toBe(
        sentinel('validation.description.tooLong', 'en-CA'),
      );
    });
  });

  describe('due date', () => {
    it('shows validation.dueDate.invalid for a date that does not exist', async () => {
      const { get, type, submit, saved, errorText } = await render();
      await type('todo-title-input', 'ok');
      // A date input never reports an impossible date, but a browser without date inputs falls back to
      // plain text, so check the form still rejects one.
      get<HTMLInputElement>('todo-due-input')!.type = 'text';
      await type('todo-due-input', '2026-02-31');
      await submit();
      expect(saved).not.toHaveBeenCalled();
      expect(errorText('todo-due-error')).toBe(sentinel('validation.dueDate.invalid', 'en-CA'));
    });

    it('accepts a date in the past', async () => {
      const { type, submit, saved } = await render();
      await type('todo-title-input', 'ok');
      await type('todo-due-input', '2001-01-01');
      await submit();
      expect(saved.mock.calls[0][0].dueDate).toBe('2001-01-01');
    });

    it('sends no date when the field is empty', async () => {
      const { type, submit, saved } = await render();
      await type('todo-title-input', 'ok');
      await submit();
      expect(saved.mock.calls[0][0].dueDate).toBeNull();
    });
  });

  it('saves trimmed text with the default priority for a new task', async () => {
    const { type, submit, saved } = await render();
    await type('todo-title-input', '  Buy milk  ');
    await type('todo-description-input', '  two litres ');
    await submit();
    expect(saved).toHaveBeenCalledWith({
      title: 'Buy milk',
      description: 'two litres',
      completed: false,
      categorySlug: null,
      prioritySlug: 'medium',
      dueDate: null,
    });
  });

  it('marks invalid fields and connects them to their messages for assistive technology', async () => {
    const { get, submit, element } = await render();
    await submit();
    const input = get<HTMLInputElement>('todo-title-input')!;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const describedBy = input.getAttribute('aria-describedby')!;
    expect(element.querySelector(`#${describedBy.split(' ').at(-1)}`)).toBe(
      get('todo-title-error'),
    );
    expect(document.activeElement === input || element.contains(document.activeElement)).toBe(true);
  });

  describe('errors from the backend', () => {
    const cases: [FieldError, string, string][] = [
      [{ field: 'title', code: 'required' }, 'todo-title-error', 'validation.title.required'],
      [{ field: 'title', code: 'tooLong' }, 'todo-title-error', 'validation.title.tooLong'],
      [
        { field: 'description', code: 'tooLong' },
        'todo-description-error',
        'validation.description.tooLong',
      ],
      [{ field: 'dueDate', code: 'invalid' }, 'todo-due-error', 'validation.dueDate.invalid'],
    ];

    it.each(cases)('maps %j to the same message as the form', async (error, testId, key) => {
      const { fixture, errorText } = await render();
      fixture.componentRef.setInput('serverErrors', [error]);
      await fixture.whenStable();
      expect(errorText(testId)).toBe(sentinel(key, 'en-CA'));
    });

    it('clears a backend error once the person edits that field', async () => {
      const { fixture, type, get } = await render();
      fixture.componentRef.setInput('serverErrors', [{ field: 'title', code: 'required' }]);
      await fixture.whenStable();
      await type('todo-title-input', 'fixed');
      expect(get('todo-title-error')).toBeNull();
    });
  });

  it('emits cancel', async () => {
    const { fixture, get } = await render();
    const cancelled = vi.fn();
    fixture.componentInstance.cancelled.subscribe(cancelled);
    get<HTMLButtonElement>('todo-cancel')!.click();
    expect(cancelled).toHaveBeenCalledTimes(1);
  });

  it('keeps typed values when the language changes', async () => {
    const { fixture, type, get } = await render();
    await type('todo-title-input', 'half typed');
    await loadFakeContent('fr');
    await fixture.whenStable();
    expect(get<HTMLInputElement>('todo-title-input')?.value).toBe('half typed');
    expect(get('todo-title-label')?.textContent).toBe(sentinel('form.title.label', 'fr-CA'));
  });

  it('renders no literal text and has no accessibility violations, also with errors showing', async () => {
    const { fixture, element, submit } = await render({ lang: 'fr' });
    expect(() => assertNoLiteralText(element)).not.toThrow();
    await expectNoAxeViolations(element);
    await submit();
    expect(() => assertNoLiteralText(element)).not.toThrow();
    await expectNoAxeViolations(fixture.nativeElement);
  });
});
