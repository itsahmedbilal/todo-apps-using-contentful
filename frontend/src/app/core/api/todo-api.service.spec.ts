import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AppConfig } from '../config/app-config';
import { TodoApiService } from './todo-api.service';
import { ApiUnavailableError, ApiValidationError, Todo } from './todo.models';

const BASE = 'http://api.test';

const todo: Todo = {
  id: 1,
  title: 'Buy milk',
  completed: false,
  prioritySlug: 'medium',
  createdAt: '2026-10-12T10:00:00.000Z',
  updatedAt: '2026-10-12T10:00:00.000Z',
};

describe('TodoApiService', () => {
  let api: TodoApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfig, useValue: { apiBaseUrl: `${BASE}/` } },
      ],
    });
    api = TestBed.inject(TodoApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('the endpoints', () => {
    it('GET /todos lists todos', async () => {
      const result = firstValueFrom(api.list());
      const request = http.expectOne(`${BASE}/todos`);
      expect(request.request.method).toBe('GET');
      request.flush([todo]);
      expect(await result).toEqual([todo]);
    });

    it('GET /todos/:id gets one todo', async () => {
      const result = firstValueFrom(api.get(1));
      const request = http.expectOne(`${BASE}/todos/1`);
      expect(request.request.method).toBe('GET');
      request.flush(todo);
      expect(await result).toEqual(todo);
    });

    it('POST /todos creates a todo', async () => {
      const result = firstValueFrom(api.create({ title: 'Buy milk' }));
      const request = http.expectOne(`${BASE}/todos`);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ title: 'Buy milk' });
      request.flush(todo, { status: 201, statusText: 'Created' });
      expect(await result).toEqual(todo);
    });

    it('PUT /todos/:id replaces a todo', async () => {
      const result = firstValueFrom(api.update(1, { title: 'New', prioritySlug: 'high' }));
      const request = http.expectOne(`${BASE}/todos/1`);
      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual({ title: 'New', prioritySlug: 'high' });
      request.flush({ ...todo, title: 'New' });
      expect((await result).title).toBe('New');
    });

    it('PATCH /todos/:id changes some fields', async () => {
      const result = firstValueFrom(api.patch(1, { completed: true }));
      const request = http.expectOne(`${BASE}/todos/1`);
      expect(request.request.method).toBe('PATCH');
      expect(request.request.body).toEqual({ completed: true });
      request.flush({ ...todo, completed: true });
      expect((await result).completed).toBe(true);
    });

    it('DELETE /todos/:id removes a todo', async () => {
      const result = firstValueFrom(api.remove(1));
      const request = http.expectOne(`${BASE}/todos/1`);
      expect(request.request.method).toBe('DELETE');
      request.flush(null, { status: 204, statusText: 'No Content' });
      expect(await result).toBeNull();
    });

    it('does not double the slash when the base URL ends with one', () => {
      firstValueFrom(api.list()).catch(() => undefined);
      http.expectOne(`${BASE}/todos`).flush([]);
    });

    it('encodes ids placed in the path', () => {
      firstValueFrom(api.get('a/b')).catch(() => undefined);
      http.expectOne(`${BASE}/todos/a%2Fb`).flush(todo);
    });
  });

  describe('errors', () => {
    it('maps 400 validation errors to ApiValidationError with the field codes', async () => {
      const result = firstValueFrom(api.create({ title: '' }));
      http
        .expectOne(`${BASE}/todos`)
        .flush(
          { error: 'validation_failed', fields: [{ field: 'title', code: 'required' }] },
          { status: 400, statusText: 'Bad Request' },
        );

      const error = await result.catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ApiValidationError);
      expect((error as ApiValidationError).fields).toEqual([{ field: 'title', code: 'required' }]);
    });

    it('maps 404 to ApiUnavailableError with the status', async () => {
      const result = firstValueFrom(api.get(99));
      http
        .expectOne(`${BASE}/todos/99`)
        .flush({ error: 'not_found' }, { status: 404, statusText: 'Not Found' });
      const error = await result.catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ApiUnavailableError);
      expect((error as ApiUnavailableError).status).toBe(404);
    });

    it('maps 500 to ApiUnavailableError with the status', async () => {
      const result = firstValueFrom(api.list());
      http
        .expectOne(`${BASE}/todos`)
        .flush({ error: 'server_error' }, { status: 500, statusText: 'Server Error' });
      const error = await result.catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ApiUnavailableError);
      expect((error as ApiUnavailableError).status).toBe(500);
    });

    it('maps a 400 without the validation shape to ApiUnavailableError', async () => {
      const result = firstValueFrom(api.list());
      http.expectOne(`${BASE}/todos`).flush('nope', { status: 400, statusText: 'Bad Request' });
      expect(await result.catch((e: unknown) => e)).toBeInstanceOf(ApiUnavailableError);
    });

    it('maps a network failure to ApiUnavailableError with status 0', async () => {
      const result = firstValueFrom(api.list());
      http.expectOne(`${BASE}/todos`).error(new ProgressEvent('error'));
      const error = await result.catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ApiUnavailableError);
      expect((error as ApiUnavailableError).status).toBe(0);
    });
  });
});
