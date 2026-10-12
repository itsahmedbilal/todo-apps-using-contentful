import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AppConfig } from '../config/app-config';
import {
  CONTENTFUL_CLIENT_FACTORY,
  ContentService,
  ContentUnavailableError,
} from './content.service';

const CONFIG = {
  contentfulSpaceId: 'space-1',
  contentfulEnvironmentId: 'master',
  contentfulDeliveryToken: 'delivery-token',
  apiBaseUrl: 'http://api.test',
};

function setup(
  config = CONFIG,
  getEntries?: (query: Record<string, unknown>) => Promise<{ items: unknown[] }>,
) {
  const getEntriesFn = vi.fn(
    getEntries ?? (async (query) => ({ items: [{ type: query['content_type'] }] })),
  );
  const plainGetEntries = vi.fn(() => {
    throw new Error('A single-locale request must never be made.');
  });
  const factory = vi.fn(() => ({
    withAllLocales: { getEntries: getEntriesFn },
    getEntries: plainGetEntries,
  }));

  TestBed.configureTestingModule({
    providers: [
      { provide: AppConfig, useValue: config },
      { provide: CONTENTFUL_CLIENT_FACTORY, useValue: factory },
    ],
  });
  return { service: TestBed.inject(ContentService), factory, getEntriesFn, plainGetEntries };
}

describe('ContentService', () => {
  it('creates the client from the configuration', async () => {
    const { service, factory } = setup();
    await service.loadAll();
    expect(factory).toHaveBeenCalledWith({
      space: 'space-1',
      environment: 'master',
      accessToken: 'delivery-token',
    });
  });

  it('requests all seven content types, in all locales, in one batch', async () => {
    const { service, getEntriesFn, plainGetEntries } = setup();
    await service.loadAll();

    const types = getEntriesFn.mock.calls.map(([query]) => query['content_type']).sort();
    expect(types).toEqual([
      'appSettings',
      'category',
      'emptyState',
      'faqItem',
      'page',
      'priority',
      'uiLabel',
    ]);
    expect(plainGetEntries).not.toHaveBeenCalled();
    for (const [query] of getEntriesFn.mock.calls) {
      expect(query['locale']).toBeUndefined();
      expect(query['include']).toBe(2);
      expect(query['limit']).toBe(1000);
    }
  });

  it('starts every request before any finishes, so they run in parallel', async () => {
    let started = 0;
    let startedWhenFirstResolved = -1;
    const { service } = setup(CONFIG, async () => {
      started += 1;
      await Promise.resolve();
      if (startedWhenFirstResolved < 0) startedWhenFirstResolved = started;
      return { items: [] };
    });
    await service.loadAll();
    expect(startedWhenFirstResolved).toBe(7);
  });

  it('returns the entries untouched, keyed by what they are', async () => {
    const { service } = setup();
    const content = await service.loadAll();
    expect(content.uiLabels).toEqual([{ type: 'uiLabel' }]);
    expect(content.categories).toEqual([{ type: 'category' }]);
    expect(content.priorities).toEqual([{ type: 'priority' }]);
    expect(content.appSettings).toEqual([{ type: 'appSettings' }]);
    expect(content.emptyStates).toEqual([{ type: 'emptyState' }]);
    expect(content.pages).toEqual([{ type: 'page' }]);
    expect(content.faqItems).toEqual([{ type: 'faqItem' }]);
  });

  it('raises ContentUnavailableError, keeping the cause, when Contentful fails', async () => {
    const cause = new Error('network down');
    const { service } = setup(CONFIG, async () => {
      throw cause;
    });

    await expect(service.loadAll()).rejects.toBeInstanceOf(ContentUnavailableError);
    await expect(service.loadAll()).rejects.toMatchObject({ cause });
  });

  it('raises ContentUnavailableError without calling Contentful when it is not configured', async () => {
    const { service, factory } = setup({
      ...CONFIG,
      contentfulSpaceId: '',
      contentfulDeliveryToken: '',
    });
    await expect(service.loadAll()).rejects.toBeInstanceOf(ContentUnavailableError);
    expect(factory).not.toHaveBeenCalled();
  });
});
