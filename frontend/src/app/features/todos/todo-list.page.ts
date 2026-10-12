import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ApiValidationError, FieldError, Todo, TodoInput } from '../../core/api/todo.models';
import { ContentStore } from '../../core/content/content.store';
import { PageMetaService } from '../../core/seo/page-meta.service';
import { ContentTextDirective } from '../../core/i18n/content-text.directive';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { ErrorPanelComponent } from '../../shared/error-panel/error-panel.component';
import { LoaderComponent } from '../../shared/loader/loader.component';
import { FiltersBarComponent } from './filters-bar/filters-bar.component';
import { TodoFormComponent } from './todo-form/todo-form.component';
import { TodoItemComponent } from './todo-item/todo-item.component';
import { ScrollListDirective } from './scroll-list/scroll-list.directive';
import { TodoStore } from './todo.store';

/** What the add/edit form is showing: a new task (`todo` is null) or an existing one. */
interface FormState {
  todo: Todo | null;
}

/** The task list: add, edit, complete and delete (after confirming), with loading, empty and error states. */
@Component({
  selector: 'app-todo-list-page',
  imports: [
    ConfirmDialogComponent,
    ContentTextDirective,
    ErrorPanelComponent,
    FiltersBarComponent,
    LoaderComponent,
    ScrollListDirective,
    TodoFormComponent,
    TodoItemComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      @if (page(); as p) {
        <h1 class="page__heading" data-testid="todo-page-heading" [appText]="p.title"></h1>
      }

      @if (store.actionFailed()) {
        <p
          class="page__action-error"
          role="alert"
          data-testid="todo-action-error"
          [appText]="'message.error.generic'"
        ></p>
      }

      @switch (store.status()) {
        @case ('error') {
          <div data-testid="todo-error">
            <app-error-panel messageKey="message.error.load" (retry)="store.retry()" />
          </div>
        }
        @case ('ready') {
          @if (formState(); as form) {
            <app-todo-form
              [todo]="form.todo"
              [serverErrors]="serverErrors()"
              [saving]="store.isSaving()"
              (saved)="onSave($event)"
              (cancelled)="closeForm()"
            />
          } @else if (store.todos().length > 0) {
            <button
              type="button"
              class="page__add"
              data-testid="todo-add-button"
              [appText]="'button.addTodo'"
              (click)="openForm(null)"
            ></button>
          }

          @if (store.todos().length > 0) {
            <app-filters-bar [filters]="store.filters()" (changed)="store.setFilters($event)" />
            <p class="page__remaining" data-testid="todo-remaining" [appText]="remaining()"></p>
          }

          @if (store.completedCount() > 0) {
            <button
              type="button"
              class="page__clear"
              data-testid="todo-clear-completed"
              [disabled]="store.isClearing()"
              [appText]="'button.clearCompleted'"
              (click)="clearing.set(true)"
            ></button>
          }

          @if (visibleTodos().length > 0) {
            <div
              class="page__scroll"
              data-testid="todo-scroll"
              appScrollList
              [rowCount]="visibleTodos().length"
              [label]="regionLabel().text"
              [labelLang]="content.langFor(regionLabel())"
              [revealId]="revealId()"
              (revealed)="revealId.set(null)"
            >
              <ul class="page__list" data-testid="todo-list">
                @for (item of visibleTodos(); track item.id) {
                  <li [attr.data-task-id]="item.id">
                    <app-todo-item
                      [todo]="item"
                      [busy]="store.isBusy(item.id)"
                      (toggled)="store.toggle($event.id)"
                      (edited)="openForm($event)"
                      (removed)="deleting.set($event)"
                    />
                  </li>
                }
              </ul>
            </div>
          } @else if (store.todos().length > 0) {
            <p
              class="page__no-results"
              data-testid="todo-no-results"
              [appText]="'message.noResults'"
            ></p>
          } @else if (!formState()) {
            <section class="page__empty" data-testid="todo-empty">
              @if (emptyState(); as empty) {
                @if (empty.illustration; as illustration) {
                  <img
                    class="page__illustration"
                    data-testid="todo-empty-illustration"
                    [src]="illustration.url"
                    [alt]="illustration.alt.text"
                    [attr.lang]="content.langFor(illustration.alt)"
                  />
                }
                <h2 data-testid="todo-empty-heading" [appText]="empty.heading"></h2>
                <p data-testid="todo-empty-message" [appText]="empty.message"></p>
              }
              <button
                type="button"
                class="page__add"
                data-testid="todo-empty-action"
                [appText]="ctaLabel()"
                (click)="openForm(null)"
              ></button>
            </section>
          }
        }
        @default {
          <div data-testid="todo-loader">
            <app-loader [labelKey]="'status.loading'" />
          </div>
        }
      }

      @if (clearing()) {
        <app-confirm-dialog
          [heading]="clearHeading()"
          [message]="clearMessage()"
          (confirmed)="confirmClear()"
          (cancelled)="clearing.set(false)"
        />
      }

      @if (deleting(); as target) {
        <app-confirm-dialog
          [heading]="deleteHeading()"
          [message]="deleteMessage()"
          (confirmed)="confirmDelete(target)"
          (cancelled)="deleting.set(null)"
        />
      }
    </div>
  `,
  styles: `
    .page {
      display: grid;
      gap: var(--space-4);
      padding-block: var(--space-4);
    }
    .page__heading {
      margin: 0;
    }
    .page__action-error {
      margin: 0;
      color: var(--color-error);
    }
    .page__add {
      justify-self: start;
      padding: var(--space-2) var(--space-3);
      border: 0;
      border-radius: var(--radius);
      background: var(--color-primary);
      color: var(--color-on-primary);
      font: inherit;
      cursor: pointer;
    }
    .page__remaining,
    .page__no-results {
      margin: 0;
    }
    .page__clear {
      justify-self: start;
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--color-primary);
      border-radius: var(--radius);
      background: transparent;
      color: var(--color-primary);
      font: inherit;
      cursor: pointer;
    }
    .page__scroll {
      min-width: 0;
      // Keeps the focus ring inside the scroll area, where it would otherwise be clipped.
      padding: var(--focus-ring-offset);
    }
    .page__scroll:focus-visible {
      outline-offset: calc(-1 * var(--focus-ring-width));
    }
    .page__list {
      display: grid;
      gap: var(--space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .page__empty {
      display: grid;
      justify-items: start;
      gap: var(--space-2);
    }
    .page__empty h2,
    .page__empty p {
      margin: 0;
    }
    .page__illustration {
      max-width: 16rem;
    }
  `,
})
export class TodoListPage {
  protected readonly store = inject(TodoStore);
  protected readonly content = inject(ContentStore);

  protected readonly formState = signal<FormState | null>(null);
  protected readonly serverErrors = signal<readonly FieldError[]>([]);
  protected readonly deleting = signal<Todo | null>(null);
  /** The task just added, so the list can scroll it into view (FR-009). */
  protected readonly revealId = signal<Todo['id'] | null>(null);
  protected readonly clearing = signal(false);

  protected readonly visibleTodos = this.store.visibleTodos;
  protected readonly remaining = computed(() =>
    this.content.plural('status.itemsRemaining', this.store.remainingCount()),
  );
  protected readonly page = computed(() => this.content.snapshot().pages.get('home') ?? null);
  protected readonly emptyState = computed(() => this.page()?.emptyState ?? null);
  /** The empty state's own button wording, or the standard add label when it has none. */
  protected readonly ctaLabel = computed(() => {
    const label = this.emptyState()?.callToActionLabel;
    return label && label.text !== '' ? label : 'button.addTodo';
  });
  protected readonly regionLabel = computed(() => this.content.text('list.region.label'));
  protected readonly deleteHeading = computed(() => this.content.text('dialog.delete.heading'));
  protected readonly clearHeading = computed(() =>
    this.content.text('dialog.clearCompleted.heading'),
  );
  protected readonly clearMessage = computed(() =>
    this.content.text('message.clearCompletedConfirm', { count: this.store.completedCount() }),
  );
  protected readonly deleteMessage = computed(() => this.content.text('message.deleteConfirm'));

  constructor() {
    inject(PageMetaService).follow('home');
    if (this.store.status() !== 'ready') void this.store.load();
  }

  protected openForm(todo: Todo | null): void {
    this.store.clearActionFailure();
    this.serverErrors.set([]);
    this.formState.set({ todo });
  }

  protected closeForm(): void {
    this.store.clearActionFailure();
    this.formState.set(null);
  }

  protected async onSave(input: TodoInput): Promise<void> {
    const editing = this.formState()?.todo;
    const result = editing
      ? await this.store.update(editing.id, input)
      : await this.store.add(input);
    if (result.ok) {
      this.formState.set(null);
      if (!editing) this.revealId.set(result.value.id);
    } else if (result.error instanceof ApiValidationError) {
      this.serverErrors.set(result.error.fields);
    }
  }

  protected async confirmClear(): Promise<void> {
    this.clearing.set(false);
    await this.store.clearCompleted();
  }

  protected async confirmDelete(todo: Todo): Promise<void> {
    this.deleting.set(null);
    await this.store.remove(todo.id);
  }
}
