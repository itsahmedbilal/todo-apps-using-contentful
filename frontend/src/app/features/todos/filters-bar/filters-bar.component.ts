import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { ContentStore } from '../../../core/content/content.store';
import { ContentTextDirective } from '../../../core/i18n/content-text.directive';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { SortBy, StatusFilter, TodoFilterState } from '../todo-filters';

let nextId = 0;

const STATUSES: readonly StatusFilter[] = ['all', 'active', 'completed'];
const SORTS: readonly SortBy[] = ['createdAt', 'dueDate', 'priority'];

/** Status, category and priority filters, a sort choice and a title search for the task list. */
@Component({
  selector: 'app-filters-bar',
  imports: [ContentTextDirective, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="filters" data-testid="filters-bar" (submit)="$event.preventDefault()">
      <div class="filters__field filters__field--search">
        <label
          [for]="id + '-search'"
          data-testid="filter-search-label"
          [appText]="'search.label'"
        ></label>
        <div class="filters__search">
          <input
            type="search"
            autocomplete="off"
            data-testid="filter-search"
            [id]="id + '-search'"
            [value]="filters().search"
            [placeholder]="'search.placeholder' | translate"
            (input)="changed.emit({ search: value($event) })"
          />
          @if (filters().search !== '') {
            <button
              type="button"
              data-testid="filter-search-clear"
              [appText]="'button.clearSearch'"
              (click)="changed.emit({ search: '' })"
            ></button>
          }
        </div>
      </div>

      <div class="filters__field">
        <label
          [for]="id + '-status'"
          data-testid="filter-status-label"
          [appText]="'filter.status.label'"
        ></label>
        <select
          data-testid="filter-status"
          [id]="id + '-status'"
          (change)="changed.emit({ status: asStatus($event) })"
        >
          @for (status of statuses; track status) {
            <option
              [value]="status"
              [selected]="filters().status === status"
              [appText]="'filter.status.' + status"
            ></option>
          }
        </select>
      </div>

      <div class="filters__field">
        <label
          [for]="id + '-category'"
          data-testid="filter-category-label"
          [appText]="'filter.category.label'"
        ></label>
        <select
          data-testid="filter-category"
          [id]="id + '-category'"
          (change)="changed.emit({ categorySlug: orNull($event) })"
        >
          <option
            value=""
            [selected]="filters().categorySlug === null"
            [appText]="'filter.category.all'"
          ></option>
          @for (category of categories(); track category.slug) {
            <option
              [value]="category.slug"
              [selected]="filters().categorySlug === category.slug"
              [appText]="category.name"
            ></option>
          }
        </select>
      </div>

      <div class="filters__field">
        <label
          [for]="id + '-priority'"
          data-testid="filter-priority-label"
          [appText]="'filter.priority.label'"
        ></label>
        <select
          data-testid="filter-priority"
          [id]="id + '-priority'"
          (change)="changed.emit({ prioritySlug: orNull($event) })"
        >
          <option
            value=""
            [selected]="filters().prioritySlug === null"
            [appText]="'filter.priority.all'"
          ></option>
          @for (priority of priorities(); track priority.slug) {
            <option
              [value]="priority.slug"
              [selected]="filters().prioritySlug === priority.slug"
              [appText]="priority.label"
            ></option>
          }
        </select>
      </div>

      <div class="filters__field">
        <label
          [for]="id + '-sort'"
          data-testid="filter-sort-label"
          [appText]="'sort.label'"
        ></label>
        <select
          data-testid="filter-sort"
          [id]="id + '-sort'"
          (change)="changed.emit({ sortBy: asSort($event) })"
        >
          @for (sort of sorts; track sort) {
            <option
              [value]="sort"
              [selected]="filters().sortBy === sort"
              [appText]="'sort.' + sort"
            ></option>
          }
        </select>
      </div>
    </form>
  `,
  styles: `
    .filters {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
      gap: var(--space-3);
    }
    .filters__field {
      display: grid;
      align-content: start;
      gap: var(--space-1);
    }
    .filters__field--search {
      grid-column: 1 / -1;
    }
    .filters__search {
      display: flex;
      gap: var(--space-2);
    }
    label {
      font-weight: 600;
    }
    input,
    select {
      width: 100%;
      min-width: 0;
      padding: var(--space-2);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-bg);
      color: var(--color-text);
      font: inherit;
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
  `,
})
export class FiltersBarComponent {
  readonly filters = input.required<TodoFilterState>();
  /** The filters the user just changed. */
  readonly changed = output<Partial<TodoFilterState>>();

  protected readonly id = `todo-filters-${nextId++}`;
  protected readonly statuses = STATUSES;
  protected readonly sorts = SORTS;

  private readonly content = inject(ContentStore);
  protected readonly categories = computed(() => this.content.snapshot().categories);
  protected readonly priorities = computed(() => this.content.snapshot().priorities);

  protected value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  /** The chosen slug, or null for the "all" option. */
  protected orNull(event: Event): string | null {
    return this.value(event) || null;
  }

  protected asStatus(event: Event): StatusFilter {
    return this.value(event) as StatusFilter;
  }

  protected asSort(event: Event): SortBy {
    return this.value(event) as SortBy;
  }
}
