import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TodoApiService } from '../../core/api/todo-api.service';
import { Todo } from '../../core/api/todo.models';
import { RawContent } from '../../core/content/content.models';
import { LanguageService } from '../../core/i18n/language.service';
import { registerLocales } from '../../core/i18n/locales';
import {
  fakeRawContent,
  loadFakeContent,
  provideFakeContent,
  sentinel,
} from '../../../testing/fake-content';
import { TodoListPage } from './todo-list.page';

const task: Todo = {
  id: 1,
  title: 'Café <b>run</b>',
  description: 'Pick up the order',
  completed: false,
  prioritySlug: 'medium',
  dueDate: '2026-03-04',
  createdAt: '',
  updatedAt: '',
};

async function render(raw: RawContent = fakeRawContent()) {
  registerLocales();
  TestBed.configureTestingModule({
    providers: [
      ...provideFakeContent(raw),
      { provide: TodoApiService, useValue: { list: () => of([task]) } },
    ],
  });
  await loadFakeContent('en');
  const fixture = TestBed.createComponent(TodoListPage);
  await fixture.whenStable();
  const element: HTMLElement = fixture.nativeElement;
  const get = <T extends HTMLElement>(testId: string) =>
    element.querySelector<T>(`[data-testid="${testId}"]`);
  const switchTo = async (lang: 'en' | 'fr') => {
    TestBed.inject(LanguageService).activate(lang);
    await fixture.whenStable();
  };
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  };
  await settle();
  return { fixture, element, get, switchTo };
}

describe('TodoListPage when the language changes', () => {
  it('keeps the same component and the values typed in an open form', async () => {
    const { fixture, get, switchTo } = await render();
    get<HTMLButtonElement>('todo-add-button')!.click();
    await fixture.whenStable();
    const input = get<HTMLInputElement>('todo-title-input')!;
    input.value = 'half-typed title';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    const instance = fixture.componentInstance;

    await switchTo('fr');

    expect(fixture.componentInstance).toBe(instance);
    expect(get('todo-title-input')).toBe(input);
    expect(get<HTMLInputElement>('todo-title-input')?.value).toBe('half-typed title');
    expect(get('todo-title-label')?.textContent).toBe(sentinel('form.title.label', 'fr-CA'));
    expect(get('todo-save')?.textContent).toBe(sentinel('button.save', 'fr-CA'));
  });

  it('changes the page wording but never the task text', async () => {
    const { get, switchTo } = await render();
    expect(get('todo-page-heading')?.textContent).toBe(sentinel('page.home.title', 'en-CA'));
    expect(get('todo-edit')?.textContent).toBe(sentinel('button.edit', 'en-CA'));

    await switchTo('fr');

    expect(get('todo-page-heading')?.textContent).toBe(sentinel('page.home.title', 'fr-CA'));
    expect(get('todo-edit')?.textContent).toBe(sentinel('button.edit', 'fr-CA'));
    expect(get('todo-title')?.textContent).toBe(task.title);
    expect(get('todo-description')?.textContent).toBe(task.description);
  });

  it('formats the due date for the new language', async () => {
    const { get, switchTo } = await render();
    expect(get('todo-due')?.textContent).toMatch(/Mar/);
    await switchTo('fr');
    expect(get('todo-due')?.textContent).toMatch(/mars/);
    expect(get('todo-due')?.getAttribute('datetime')).toBe('2026-03-04');
  });

  it('marks English fallback text with lang="en-CA" while French is active', async () => {
    const raw = fakeRawContent();
    const label = raw.uiLabels.find((entry) => entry.fields.key?.['en-CA'] === 'button.addTodo')!;
    delete label.fields.value!['fr-CA'];
    const { get, switchTo } = await render(raw);

    expect(get('todo-add-button')?.hasAttribute('lang')).toBe(false);

    await switchTo('fr');

    expect(get('todo-add-button')?.textContent).toBe(sentinel('button.addTodo', 'en-CA'));
    expect(get('todo-add-button')?.getAttribute('lang')).toBe('en-CA');
    // Text that does have French is not marked.
    expect(get('todo-edit')?.hasAttribute('lang')).toBe(false);

    await switchTo('en');
    expect(get('todo-add-button')?.hasAttribute('lang')).toBe(false);
  });
});
