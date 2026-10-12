import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Todo } from '../../../core/api/todo.models';
import { ContentStore } from '../../../core/content/content.store';
import { ContentTextDirective } from '../../../core/i18n/content-text.directive';
import { LanguageService } from '../../../core/i18n/language.service';
import { isOverdue, todayIso } from '../overdue';
import { BadgeComponent } from '../../../shared/badge/badge.component';

/**
 * One task in the list. The title and description are the person's own text: they are shown exactly as
 * typed and never translated. Each action button is named by its own label plus the task title
 * (`aria-labelledby`), so two rows never have buttons with the same name.
 */
@Component({
  selector: 'app-todo-item',
  imports: [BadgeComponent, ContentTextDirective, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="item"
      data-testid="todo-item"
      [class.item--completed]="todo().completed"
      [class.item--overdue]="overdue()"
    >
      <div class="item__body shrinkable">
        <h2 class="item__title" data-testid="todo-title" [id]="titleId()">{{ todo().title }}</h2>
        @if (todo().description) {
          <p class="item__description" data-testid="todo-description">{{ todo().description }}</p>
        }
        <p class="item__meta">
          @if (category(); as name) {
            <app-badge data-testid="todo-category" [label]="name" [colour]="categoryColour()" />
          }
          @if (priority(); as label) {
            <app-badge data-testid="todo-priority" [label]="label" [colour]="priorityColour()" />
          }
          @if (todo().dueDate; as due) {
            <time class="item__due" data-testid="todo-due" [attr.datetime]="due">{{
              due | date: 'mediumDate' : undefined : locale()
            }}</time>
          }
          @if (overdue()) {
            <span class="item__overdue" data-testid="todo-overdue"
              ><span aria-hidden="true">⚠</span> <span [appText]="'status.overdue'"></span
            ></span>
          }
          @if (todo().completed) {
            <span
              class="item__completed"
              data-testid="todo-completed"
              [appText]="'status.completed'"
            ></span>
          }
        </p>
      </div>
      <div class="item__actions">
        <button
          type="button"
          data-testid="todo-toggle"
          [attr.aria-labelledby]="labelledBy('toggle')"
          [attr.aria-disabled]="busy() ? 'true' : null"
          (click)="act(toggled)"
        >
          <span
            [id]="labelId('toggle')"
            [appText]="todo().completed ? 'button.markIncomplete' : 'button.markComplete'"
          ></span>
        </button>
        <button
          type="button"
          data-testid="todo-edit"
          [attr.aria-labelledby]="labelledBy('edit')"
          [attr.aria-disabled]="busy() ? 'true' : null"
          (click)="act(edited)"
        >
          <span [id]="labelId('edit')" [appText]="'button.edit'"></span>
        </button>
        <button
          type="button"
          data-testid="todo-delete"
          [attr.aria-labelledby]="labelledBy('delete')"
          [attr.aria-disabled]="busy() ? 'true' : null"
          (click)="act(removed)"
        >
          <span [id]="labelId('delete')" [appText]="'button.delete'"></span>
        </button>
      </div>
    </div>
  `,
  styles: `
    .item {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
    }
    .item__body {
      flex: 1 1 14rem;
    }
    .item__title {
      margin: 0;
      font-size: 1.1rem;
    }
    .item--overdue {
      border-color: var(--color-error);
    }
    .item--completed .item__title {
      text-decoration: line-through;
    }
    .item__description {
      margin: var(--space-1) 0 0;
      white-space: pre-wrap;
    }
    .item__meta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
      margin: var(--space-1) 0 0;
      color: var(--color-text-muted);
    }
    .item__meta:empty {
      display: none;
    }
    .item__overdue {
      color: var(--color-error);
      font-weight: 600;
    }
    .item__completed {
      color: var(--color-success);
      font-weight: 600;
    }
    .item__actions {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: var(--space-2);
    }
    button {
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--color-primary);
      border-radius: var(--radius);
      background: transparent;
      color: var(--color-primary);
      font: inherit;
      cursor: pointer;
    }
    button[aria-disabled='true'] {
      cursor: progress;
      opacity: 0.7;
    }
  `,
})
export class TodoItemComponent {
  readonly todo = input.required<Todo>();
  /** True while a request for this task is running; the actions do nothing until it finishes. */
  readonly busy = input(false);

  readonly toggled = output<Todo>();
  readonly edited = output<Todo>();
  readonly removed = output<Todo>();

  protected readonly locale = inject(LanguageService).locale;
  private readonly content = inject(ContentStore);

  protected readonly category = computed(() => this.content.categoryName(this.todo().categorySlug));
  protected readonly categoryColour = computed(
    () => this.content.findCategory(this.todo().categorySlug)?.colour ?? null,
  );
  protected readonly priority = computed(() => {
    const label = this.content.priorityLabel(this.todo().prioritySlug);
    return label.text === '' ? null : label;
  });
  protected readonly priorityColour = computed(
    () => this.content.findPriority(this.todo().prioritySlug)?.colour ?? null,
  );
  protected readonly overdue = computed(() => isOverdue(this.todo(), todayIso()));
  protected readonly titleId = computed(() => `todo-${this.todo().id}-title`);

  protected labelId(action: 'toggle' | 'edit' | 'delete'): string {
    return `todo-${this.todo().id}-${action}-label`;
  }

  protected labelledBy(action: 'toggle' | 'edit' | 'delete'): string {
    return `${this.labelId(action)} ${this.titleId()}`;
  }

  protected act(output: { emit(value: Todo): void }): void {
    if (!this.busy()) output.emit(this.todo());
  }
}
