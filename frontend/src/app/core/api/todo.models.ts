// Shapes from specs/001-bilingual-todo-app/contracts/todos-api.openapi.yaml.

export interface Todo {
  id: string | number;
  /** 1-120 characters. Shown exactly as typed, never translated. */
  title: string;
  /** Up to 500 characters. */
  description?: string;
  completed: boolean;
  /** Slug of a Contentful category. May no longer exist. */
  categorySlug?: string | null;
  /** Slug of a Contentful priority. */
  prioritySlug: string;
  /** ISO date, YYYY-MM-DD. May be in the past. */
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TodoInput {
  title: string;
  description?: string;
  completed?: boolean;
  categorySlug?: string | null;
  prioritySlug?: string;
  dueDate?: string | null;
}

export type TodoPatch = Partial<TodoInput>;

export type TodoField = keyof TodoInput;
export type FieldErrorCode = 'required' | 'tooLong' | 'invalid';

export interface FieldError {
  field: TodoField;
  code: FieldErrorCode;
}

/** The backend rejected the input (HTTP 400). `fields` says which fields and why. */
export class ApiValidationError extends Error {
  override readonly name = 'ApiValidationError';

  constructor(readonly fields: readonly FieldError[]) {
    super('The todo was rejected by validation.');
  }
}

/** The backend could not be reached or failed (any other error). `status` is 0 for network failures. */
export class ApiUnavailableError extends Error {
  override readonly name = 'ApiUnavailableError';

  constructor(
    readonly status: number,
    options?: { cause?: unknown },
  ) {
    super(`The todo service failed with status ${status}.`, options);
  }
}
