import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { AppConfig } from '../config/app-config';
import {
  ApiUnavailableError,
  ApiValidationError,
  FieldError,
  Todo,
  TodoInput,
  TodoPatch,
} from './todo.models';

function toApiError(error: unknown): Error {
  if (error instanceof HttpErrorResponse) {
    const body: unknown = error.error;
    if (error.status === 400 && isValidationBody(body)) {
      return new ApiValidationError(body.fields);
    }
    return new ApiUnavailableError(error.status, { cause: error });
  }
  return new ApiUnavailableError(0, { cause: error });
}

function isValidationBody(body: unknown): body is { error: string; fields: FieldError[] } {
  return (
    typeof body === 'object' &&
    body !== null &&
    (body as { error?: unknown }).error === 'validation_failed' &&
    Array.isArray((body as { fields?: unknown }).fields)
  );
}

/**
 * The only code that talks to the todo backend. It uses only the endpoints in the API contract, so a
 * real API can replace the mock by changing the base URL in the environment file.
 */
@Injectable({ providedIn: 'root' })
export class TodoApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(AppConfig).apiBaseUrl;

  list(): Observable<Todo[]> {
    return this.http.get<Todo[]>(this.url()).pipe(catchError(this.fail));
  }

  get(id: Todo['id']): Observable<Todo> {
    return this.http.get<Todo>(this.url(id)).pipe(catchError(this.fail));
  }

  create(input: TodoInput): Observable<Todo> {
    return this.http.post<Todo>(this.url(), input).pipe(catchError(this.fail));
  }

  /** Replaces a todo (PUT). */
  update(id: Todo['id'], input: TodoInput): Observable<Todo> {
    return this.http.put<Todo>(this.url(id), input).pipe(catchError(this.fail));
  }

  /** Changes some fields (PATCH), for example to complete a todo. */
  patch(id: Todo['id'], patch: TodoPatch): Observable<Todo> {
    return this.http.patch<Todo>(this.url(id), patch).pipe(catchError(this.fail));
  }

  remove(id: Todo['id']): Observable<void> {
    return this.http.delete<void>(this.url(id)).pipe(catchError(this.fail));
  }

  private url(id?: Todo['id']): string {
    const base = `${this.baseUrl.replace(/\/+$/, '')}/todos`;
    return id === undefined ? base : `${base}/${encodeURIComponent(String(id))}`;
  }

  private readonly fail = (error: unknown): Observable<never> =>
    throwError(() => toApiError(error));
}
