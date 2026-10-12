import { Todo } from '../../core/api/todo.models';

/** Today's date as YYYY-MM-DD in the browser's time zone. */
export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** A task is overdue when it is not completed and its due date is before today. Due today is not overdue. */
export function isOverdue(todo: Pick<Todo, 'completed' | 'dueDate'>, today: string): boolean {
  return !todo.completed && !!todo.dueDate && todo.dueDate < today;
}
