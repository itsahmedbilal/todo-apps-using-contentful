import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FieldError, Todo, TodoField, TodoInput } from '../../../core/api/todo.models';
import { ContentStore } from '../../../core/content/content.store';
import { ContentTextDirective } from '../../../core/i18n/content-text.directive';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 500;
const DEFAULT_PRIORITY = 'medium';
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const KNOWN_ERRORS = new Set([
  'title.required',
  'title.tooLong',
  'description.tooLong',
  'dueDate.invalid',
]);
const GENERIC_ERROR = 'message.error.generic';

let nextId = 0;

function isRealDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/**
 * Adds or edits a task. Validation messages are label keys (`validation.<field>.<code>`), so they follow
 * the active language. Typed values live in signals, so they survive a language switch. Task text is
 * saved exactly as typed (trimmed) and is never translated.
 */
@Component({
  selector: 'app-todo-form',
  imports: [ContentTextDirective, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="form" data-testid="todo-form" novalidate (submit)="onSubmit($event)">
      <h2
        class="form__heading"
        data-testid="todo-form-heading"
        [appText]="todo() ? 'form.editTitle' : 'form.addTitle'"
      ></h2>

      <div class="form__field">
        <label
          [for]="id + '-title'"
          data-testid="todo-title-label"
          [appText]="'form.title.label'"
        ></label>
        <input
          #titleInput
          type="text"
          autocomplete="off"
          data-testid="todo-title-input"
          [id]="id + '-title'"
          [value]="title()"
          [placeholder]="'form.title.placeholder' | translate"
          [attr.aria-invalid]="titleError() ? 'true' : null"
          [attr.aria-describedby]="titleError() ? id + '-title-error' : null"
          (input)="onTitle($event)"
        />
        @if (titleError(); as key) {
          <p
            class="form__error"
            data-testid="todo-title-error"
            [id]="id + '-title-error'"
            [appText]="key"
          ></p>
        }
      </div>

      <div class="form__field">
        <label
          [for]="id + '-description'"
          data-testid="todo-description-label"
          [appText]="'form.description.label'"
        ></label>
        <textarea
          #descriptionInput
          rows="3"
          data-testid="todo-description-input"
          [id]="id + '-description'"
          [value]="description()"
          [placeholder]="'form.description.placeholder' | translate"
          [attr.aria-invalid]="descriptionError() ? 'true' : null"
          [attr.aria-describedby]="descriptionError() ? id + '-description-error' : null"
          (input)="onDescription($event)"
        ></textarea>
        @if (descriptionError(); as key) {
          <p
            class="form__error"
            data-testid="todo-description-error"
            [id]="id + '-description-error'"
            [appText]="key"
          ></p>
        }
      </div>

      <div class="form__field">
        <label
          [for]="id + '-due'"
          data-testid="todo-due-label"
          [appText]="'form.dueDate.label'"
        ></label>
        <input
          #dueInput
          type="date"
          data-testid="todo-due-input"
          [id]="id + '-due'"
          [value]="dueDate()"
          [attr.aria-invalid]="dueDateError() ? 'true' : null"
          [attr.aria-describedby]="
            dueDateError() ? id + '-due-hint ' + id + '-due-error' : id + '-due-hint'
          "
          (input)="onDueDate($event)"
        />
        <p
          class="form__hint"
          data-testid="todo-due-hint"
          [id]="id + '-due-hint'"
          [appText]="'form.dueDate.hint'"
        ></p>
        @if (dueDateError(); as key) {
          <p
            class="form__error"
            data-testid="todo-due-error"
            [id]="id + '-due-error'"
            [appText]="key"
          ></p>
        }
      </div>

      <div class="form__field">
        <label
          [for]="id + '-category'"
          data-testid="todo-category-label"
          [appText]="'form.category.label'"
        ></label>
        <select
          data-testid="todo-category-select"
          [id]="id + '-category'"
          (change)="onCategory($event)"
        >
          <option
            value=""
            [selected]="categorySlug() === ''"
            [appText]="'form.category.none'"
          ></option>
          @for (category of categories(); track category.slug) {
            <option
              [value]="category.slug"
              [selected]="categorySlug() === category.slug"
              [appText]="category.name"
            ></option>
          }
        </select>
      </div>

      <div class="form__field">
        <label
          [for]="id + '-priority'"
          data-testid="todo-priority-label"
          [appText]="'form.priority.label'"
        ></label>
        <select
          data-testid="todo-priority-select"
          [id]="id + '-priority'"
          (change)="onPriority($event)"
        >
          @for (priority of priorities(); track priority.slug) {
            <option
              [value]="priority.slug"
              [selected]="prioritySlug() === priority.slug"
              [appText]="priority.label"
            ></option>
          }
        </select>
      </div>

      <div class="form__actions">
        <button
          type="submit"
          class="form__save"
          data-testid="todo-save"
          [disabled]="saving()"
          [appText]="'button.save'"
        ></button>
        <button
          type="button"
          class="form__cancel"
          data-testid="todo-cancel"
          [appText]="'button.cancel'"
          (click)="cancelled.emit()"
        ></button>
      </div>
    </form>
  `,
  styles: `
    .form {
      display: grid;
      gap: var(--space-3);
      padding: var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
    }
    .form__heading {
      margin: 0;
      font-size: 1.25rem;
    }
    .form__field {
      display: grid;
      gap: var(--space-1);
    }
    label {
      font-weight: 600;
    }
    input,
    select,
    textarea {
      width: 100%;
      padding: var(--space-2);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-bg);
      color: var(--color-text);
      font: inherit;
    }
    input[aria-invalid='true'],
    textarea[aria-invalid='true'] {
      border-color: var(--color-error);
    }
    .form__hint {
      margin: 0;
      color: var(--color-text-muted);
    }
    .form__error {
      margin: 0;
      color: var(--color-error);
    }
    .form__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
    button {
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--color-primary);
      border-radius: var(--radius);
      font: inherit;
      cursor: pointer;
    }
    button:disabled {
      cursor: progress;
      opacity: 0.7;
    }
    .form__save {
      background: var(--color-primary);
      color: var(--color-on-primary);
    }
    .form__cancel {
      background: transparent;
      color: var(--color-primary);
    }
  `,
})
export class TodoFormComponent {
  /** The task being edited. Leave out to add a new one. */
  readonly todo = input<Todo | null>(null);
  /** Field errors returned by the backend (HTTP 400). */
  readonly serverErrors = input<readonly FieldError[]>([]);
  readonly saving = input(false);

  readonly saved = output<TodoInput>();
  readonly cancelled = output<void>();

  protected readonly id = `todo-form-${nextId++}`;

  protected readonly title = linkedSignal(() => this.todo()?.title ?? '');
  protected readonly description = linkedSignal(() => this.todo()?.description ?? '');
  protected readonly dueDate = linkedSignal(() => this.todo()?.dueDate ?? '');
  /** The chosen category slug; an empty string means no category. */
  protected readonly categorySlug = linkedSignal(() => this.todo()?.categorySlug ?? '');
  protected readonly prioritySlug = linkedSignal(
    () => this.todo()?.prioritySlug ?? DEFAULT_PRIORITY,
  );

  private readonly content = inject(ContentStore);
  protected readonly categories = computed(() => this.content.snapshot().categories);
  protected readonly priorities = computed(() => this.content.snapshot().priorities);

  private readonly submitted = signal(false);
  /** Fields edited since the backend last reported errors; their backend errors no longer apply. */
  private readonly edited = linkedSignal<readonly FieldError[], ReadonlySet<TodoField>>({
    source: this.serverErrors,
    computation: () => new Set(),
  });

  private readonly titleInput = viewChild.required<ElementRef<HTMLInputElement>>('titleInput');
  private readonly descriptionInput =
    viewChild.required<ElementRef<HTMLTextAreaElement>>('descriptionInput');
  private readonly dueInput = viewChild.required<ElementRef<HTMLInputElement>>('dueInput');

  private readonly clientErrors = computed<Partial<Record<TodoField, string>>>(() => {
    const errors: Partial<Record<TodoField, string>> = {};
    const title = this.title().trim();
    if (title.length === 0) errors.title = 'validation.title.required';
    else if (title.length > TITLE_MAX) errors.title = 'validation.title.tooLong';
    if (this.description().trim().length > DESCRIPTION_MAX) {
      errors.description = 'validation.description.tooLong';
    }
    const due = this.dueDate();
    if (due !== '' && !isRealDate(due)) errors.dueDate = 'validation.dueDate.invalid';
    return errors;
  });

  protected readonly titleError = computed(() => this.errorFor('title'));
  protected readonly descriptionError = computed(() => this.errorFor('description'));
  protected readonly dueDateError = computed(() => this.errorFor('dueDate'));

  constructor() {
    afterNextRender(() => this.titleInput().nativeElement.focus());
  }

  protected onTitle(event: Event): void {
    this.title.set((event.target as HTMLInputElement).value);
    this.markEdited('title');
  }

  protected onDescription(event: Event): void {
    this.description.set((event.target as HTMLTextAreaElement).value);
    this.markEdited('description');
  }

  protected onCategory(event: Event): void {
    this.categorySlug.set((event.target as HTMLSelectElement).value);
  }

  protected onPriority(event: Event): void {
    this.prioritySlug.set((event.target as HTMLSelectElement).value);
  }

  protected onDueDate(event: Event): void {
    this.dueDate.set((event.target as HTMLInputElement).value);
    this.markEdited('dueDate');
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.submitted.set(true);

    const errors = this.clientErrors();
    if (errors.title) return this.titleInput().nativeElement.focus();
    if (errors.description) return this.descriptionInput().nativeElement.focus();
    if (errors.dueDate) return this.dueInput().nativeElement.focus();

    const existing = this.todo();
    this.saved.emit({
      title: this.title().trim(),
      description: this.description().trim(),
      completed: existing?.completed ?? false,
      categorySlug: this.categorySlug() === '' ? null : this.categorySlug(),
      prioritySlug: this.prioritySlug(),
      dueDate: this.dueDate() === '' ? null : this.dueDate(),
    });
  }

  private errorFor(field: TodoField): string | null {
    if (this.submitted()) {
      const client = this.clientErrors()[field];
      if (client) return client;
    }
    if (this.edited().has(field)) return null;
    const server = this.serverErrors().find((error) => error.field === field);
    if (!server) return null;
    const key = `validation.${server.field}.${server.code}`;
    return KNOWN_ERRORS.has(`${server.field}.${server.code}`) ? key : GENERIC_ERROR;
  }

  private markEdited(field: TodoField): void {
    this.edited.update((set) => new Set(set).add(field));
  }
}
