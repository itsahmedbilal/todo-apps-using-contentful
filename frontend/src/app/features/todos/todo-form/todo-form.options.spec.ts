import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Todo, TodoInput } from '../../../core/api/todo.models';
import { RawContent } from '../../../core/content/content.models';
import { assertNoLiteralText } from '../../../../testing/assert-no-literal-text';
import { expectNoAxeViolations } from '../../../../testing/axe';
import {
  fakeRawContent,
  loadFakeContent,
  provideFakeContent,
  sentinel,
} from '../../../../testing/fake-content';
import { TodoFormComponent } from './todo-form.component';

function contentWithMedium(): RawContent {
  const raw = fakeRawContent();
  raw.priorities.push({
    sys: { id: 'priority-medium', contentType: { sys: { id: 'priority' } } },
    fields: {
      label: {
        'en-CA': sentinel('priority.medium', 'en-CA'),
        'fr-CA': sentinel('priority.medium', 'fr-CA'),
      },
      slug: { 'en-CA': 'medium' },
      level: { 'en-CA': 2 },
      colour: { 'en-CA': '#ffaa00' },
    },
  });
  return raw;
}

async function render(options: { todo?: Todo; lang?: 'en' | 'fr' } = {}) {
  TestBed.configureTestingModule({ providers: provideFakeContent(contentWithMedium()) });
  await loadFakeContent(options.lang ?? 'en');
  const fixture = TestBed.createComponent(TodoFormComponent);
  if (options.todo) fixture.componentRef.setInput('todo', options.todo);
  await fixture.whenStable();
  const element: HTMLElement = fixture.nativeElement;
  const saved = vi.fn<(input: TodoInput) => void>();
  fixture.componentInstance.saved.subscribe(saved);
  const get = <T extends HTMLElement>(testId: string) =>
    element.querySelector<T>(`[data-testid="${testId}"]`);
  const optionValues = (testId: string) =>
    Array.from(get<HTMLSelectElement>(testId)!.options).map((option) => option.value);
  const optionTexts = (testId: string) =>
    Array.from(get<HTMLSelectElement>(testId)!.options).map((option) => option.textContent);

  async function choose(testId: string, value: string) {
    const select = get<HTMLSelectElement>(testId)!;
    select.value = value;
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }
  async function type(testId: string, value: string) {
    const field = get<HTMLInputElement>(testId)!;
    field.value = value;
    field.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }
  async function submit() {
    get('todo-form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  }
  return { fixture, element, saved, get, optionValues, optionTexts, choose, type, submit };
}

const existing: Todo = {
  id: 3,
  title: 'Existing',
  completed: false,
  categorySlug: 'work',
  prioritySlug: 'high',
  createdAt: '',
  updatedAt: '',
};

describe('TodoFormComponent category and priority options', () => {
  it('lists categories in sortOrder after the "none" choice', async () => {
    const { optionValues, optionTexts } = await render();
    expect(optionValues('todo-category-select')).toEqual(['', 'personal', 'work']);
    expect(optionTexts('todo-category-select')).toEqual([
      sentinel('form.category.none', 'en-CA'),
      sentinel('category.personal', 'en-CA'),
      sentinel('category.work', 'en-CA'),
    ]);
  });

  it('lists priorities in level order, highest first', async () => {
    const { optionValues } = await render();
    expect(optionValues('todo-priority-select')).toEqual(['high', 'medium', 'low']);
  });

  it('shows the options in the active language', async () => {
    const { optionTexts } = await render({ lang: 'fr' });
    expect(optionTexts('todo-category-select')).toEqual([
      sentinel('form.category.none', 'fr-CA'),
      sentinel('category.personal', 'fr-CA'),
      sentinel('category.work', 'fr-CA'),
    ]);
    expect(optionTexts('todo-priority-select')).toContain(sentinel('priority.medium', 'fr-CA'));
  });

  it('labels both selects from managed content', async () => {
    const { get } = await render();
    expect(get('todo-category-label')?.textContent).toBe(sentinel('form.category.label', 'en-CA'));
    expect(get('todo-priority-label')?.textContent).toBe(sentinel('form.priority.label', 'en-CA'));
  });

  it('defaults a new task to no category and Medium priority', async () => {
    const { get, saved, type, submit } = await render();
    expect(get<HTMLSelectElement>('todo-category-select')?.value).toBe('');
    expect(get<HTMLSelectElement>('todo-priority-select')?.value).toBe('medium');
    await type('todo-title-input', 'x');
    await submit();
    expect(saved.mock.calls[0][0].categorySlug).toBeNull();
    expect(saved.mock.calls[0][0].prioritySlug).toBe('medium');
  });

  it('saves the chosen category and priority', async () => {
    const { saved, type, choose, submit } = await render();
    await type('todo-title-input', 'x');
    await choose('todo-category-select', 'work');
    await choose('todo-priority-select', 'low');
    await submit();
    expect(saved.mock.calls[0][0]).toMatchObject({ categorySlug: 'work', prioritySlug: 'low' });
  });

  it('can set a task back to no category', async () => {
    const { saved, choose, submit } = await render({ todo: existing });
    await choose('todo-category-select', '');
    await submit();
    expect(saved.mock.calls[0][0].categorySlug).toBeNull();
  });

  it('starts an edit with the task category and priority selected', async () => {
    const { get, saved, submit } = await render({ todo: existing });
    expect(get<HTMLSelectElement>('todo-category-select')?.value).toBe('work');
    expect(get<HTMLSelectElement>('todo-priority-select')?.value).toBe('high');
    await submit();
    expect(saved.mock.calls[0][0]).toMatchObject({ categorySlug: 'work', prioritySlug: 'high' });
  });

  it('keeps the chosen options when the language changes', async () => {
    const { fixture, get, choose } = await render();
    await choose('todo-category-select', 'work');
    await loadFakeContent('fr');
    await fixture.whenStable();
    expect(get<HTMLSelectElement>('todo-category-select')?.value).toBe('work');
  });

  it('renders no literal text and has no accessibility violations', async () => {
    const { element } = await render({ lang: 'fr' });
    expect(() => assertNoLiteralText(element)).not.toThrow();
    await expectNoAxeViolations(element);
  });
});
