import { Injectable, InjectionToken, inject } from '@angular/core';
import { createClient } from 'contentful';
import { AppConfig } from '../config/app-config';
import { RawContent } from './content.models';

/** Thrown when content cannot be loaded for any reason; the app then shows the fallback message. */
export class ContentUnavailableError extends Error {
  override readonly name = 'ContentUnavailableError';

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

/** The part of the Contentful client this app uses. */
export interface ContentfulClientLike {
  withAllLocales: {
    getEntries(query: Record<string, unknown>): Promise<{ items: unknown[] }>;
  };
}

export type ContentfulClientFactory = (options: {
  space: string;
  environment: string;
  accessToken: string;
}) => ContentfulClientLike;

/** Lets tests swap the Contentful SDK for a fake. */
export const CONTENTFUL_CLIENT_FACTORY = new InjectionToken<ContentfulClientFactory>(
  'CONTENTFUL_CLIENT_FACTORY',
  { providedIn: 'root', factory: () => createClient as unknown as ContentfulClientFactory },
);

const CONTENT_TYPES = {
  appSettings: 'appSettings',
  uiLabels: 'uiLabel',
  categories: 'category',
  priorities: 'priority',
  emptyStates: 'emptyState',
  pages: 'page',
  faqItems: 'faqItem',
} as const satisfies Record<keyof RawContent, string>;

/**
 * The only code that talks to Contentful. Loads every content type in every locale in one batch of
 * parallel requests, using the read-only Delivery API (published entries only).
 */
@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly config = inject(AppConfig);
  private readonly createClient = inject(CONTENTFUL_CLIENT_FACTORY);

  async loadAll(): Promise<RawContent> {
    const { contentfulSpaceId, contentfulEnvironmentId, contentfulDeliveryToken } = this.config;
    if (!contentfulSpaceId || !contentfulDeliveryToken) {
      throw new ContentUnavailableError(
        'Contentful is not configured (space id or Delivery token is empty).',
      );
    }

    try {
      const client = this.createClient({
        space: contentfulSpaceId,
        environment: contentfulEnvironmentId,
        accessToken: contentfulDeliveryToken,
      });

      const keys = Object.keys(CONTENT_TYPES) as (keyof RawContent)[];
      const results = await Promise.all(
        keys.map((key) =>
          client.withAllLocales.getEntries({
            content_type: CONTENT_TYPES[key],
            include: 2,
            limit: 1000,
          }),
        ),
      );

      const content = {} as Record<keyof RawContent, unknown[]>;
      keys.forEach((key, index) => (content[key] = results[index].items));
      return content as unknown as RawContent;
    } catch (error) {
      throw new ContentUnavailableError('Could not load content from Contentful.', {
        cause: error,
      });
    }
  }
}
