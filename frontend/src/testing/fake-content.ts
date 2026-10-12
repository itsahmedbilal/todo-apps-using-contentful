import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  ContentLocale,
  RawAsset,
  RawContent,
  RawEntry,
  RichTextDocument,
  UiLabelFields,
} from '../app/core/content/content.models';
import { ContentService } from '../app/core/content/content.service';
import { ContentStore } from '../app/core/content/content.store';
import { LanguageService } from '../app/core/i18n/language.service';
import { UrlLang } from '../app/core/i18n/locales';

/**
 * Every label key from specs/001-bilingual-todo-app/contracts/content-model.md. Tests render with
 * sentinel values instead of real wording, so a test can tell managed text from literal text.
 */
export const FAKE_LABEL_KEYS: readonly string[] = [
  'button.addTodo',
  'button.save',
  'button.cancel',
  'button.edit',
  'button.delete',
  'button.markComplete',
  'button.markIncomplete',
  'button.retry',
  'button.clearCompleted',
  'button.confirm',
  'button.clearSearch',
  'form.title.label',
  'form.title.placeholder',
  'form.description.label',
  'form.description.placeholder',
  'form.dueDate.label',
  'form.dueDate.hint',
  'form.category.label',
  'form.category.none',
  'form.priority.label',
  'form.addTitle',
  'form.editTitle',
  'validation.title.required',
  'validation.title.tooLong',
  'validation.description.tooLong',
  'validation.dueDate.invalid',
  'message.itemSaved',
  'message.itemDeleted',
  'message.completedCleared',
  'message.deleteConfirm',
  'message.clearCompletedConfirm',
  'dialog.delete.heading',
  'dialog.clearCompleted.heading',
  'message.error.generic',
  'message.error.load',
  'message.noResults',
  'message.contentUnavailable',
  'filter.status.label',
  'filter.status.all',
  'filter.status.active',
  'filter.status.completed',
  'filter.category.label',
  'filter.category.all',
  'filter.priority.label',
  'filter.priority.all',
  'sort.label',
  'sort.dueDate',
  'sort.priority',
  'sort.createdAt',
  'search.label',
  'search.placeholder',
  'status.itemsRemaining.one',
  'status.itemsRemaining.other',
  'status.overdue',
  'status.loading',
  'status.uncategorized',
  'status.completed',
  'list.region.label',
  'nav.home',
  'nav.help',
  'nav.main.label',
  'nav.skipToContent',
  'language.name.en',
  'language.name.fr',
  'notFound.heading',
  'notFound.message',
  'notFound.backHome',
];

/** This key has no French value in the fixtures, to exercise the English fallback. */
export const KEY_MISSING_IN_FRENCH = 'nav.home';

/** Placeholder text for a key, for example ⟦fr-CA:button.save⟧. */
export function sentinel(key: string, locale: ContentLocale): string {
  return `⟦${locale}:${key}⟧`;
}

function localized(key: string, withFrench = true): Partial<Record<ContentLocale, string>> {
  return withFrench
    ? { 'en-CA': sentinel(key, 'en-CA'), 'fr-CA': sentinel(key, 'fr-CA') }
    : { 'en-CA': sentinel(key, 'en-CA') };
}

/** A rich text document with one paragraph holding the sentinel for a key. */
function richText(key: string, locale: ContentLocale): RichTextDocument {
  return {
    nodeType: 'document',
    data: {},
    content: [
      {
        nodeType: 'paragraph',
        data: {},
        content: [{ nodeType: 'text', value: sentinel(key, locale), marks: [], data: {} }],
      },
    ],
  };
}

function richLocalized(key: string): Record<ContentLocale, RichTextDocument> {
  return { 'en-CA': richText(key, 'en-CA'), 'fr-CA': richText(key, 'fr-CA') };
}

function entry<F>(contentType: string, id: string, fields: F): RawEntry<F> {
  return { sys: { id, contentType: { sys: { id: contentType } } }, fields };
}

function asset(id: string, url: string): RawAsset {
  return { sys: { id }, fields: { file: { 'en-CA': { url, contentType: 'image/png' } } } };
}

export interface FakeContentOptions {
  /** Adds a logo (with alt text) to the app settings. */
  withLogo?: boolean;
  /** Adds an illustration (with alt text) to the home empty state. */
  withIllustration?: boolean;
  /** Label keys to include. Defaults to every key in the contract. */
  labelKeys?: readonly string[];
}

export function fakeRawContent(options: FakeContentOptions = {}): RawContent {
  const labelKeys = options.labelKeys ?? FAKE_LABEL_KEYS;

  const uiLabels: RawEntry<UiLabelFields>[] = labelKeys.map((key) =>
    entry('uiLabel', `uiLabel-${key}`, {
      key: { 'en-CA': key },
      group: { 'en-CA': 'Buttons' },
      value: localized(key, key !== KEY_MISSING_IN_FRENCH),
    }),
  );

  const emptyState = entry('emptyState', 'emptyState-home', {
    heading: localized('emptyState.heading'),
    message: localized('emptyState.message'),
    callToActionLabel: localized('emptyState.callToActionLabel'),
    ...(options.withIllustration
      ? {
          illustration: { 'en-CA': asset('illustration', '//images.example/empty.png') },
          illustrationAlt: localized('emptyState.illustrationAlt'),
        }
      : {}),
  });

  return {
    appSettings: [
      entry('appSettings', 'appSettings', {
        appTitle: localized('appSettings.appTitle'),
        tagline: localized('appSettings.tagline'),
        footerText: localized('appSettings.footerText'),
        languageSwitcherLabel: localized('appSettings.languageSwitcherLabel'),
        ...(options.withLogo
          ? {
              logo: { 'en-CA': asset('logo', '//images.example/logo.png') },
              logoAlt: localized('appSettings.logoAlt'),
            }
          : {}),
      }),
    ],
    uiLabels,
    categories: [
      entry('category', 'category-work', {
        name: localized('category.work'),
        slug: { 'en-CA': 'work' },
        colour: { 'en-CA': '#6b4c9a' },
        sortOrder: { 'en-CA': 2 },
      }),
      entry('category', 'category-personal', {
        name: localized('category.personal'),
        slug: { 'en-CA': 'personal' },
        colour: { 'en-CA': '#1d6fa5' },
        sortOrder: { 'en-CA': 1 },
      }),
    ],
    priorities: [
      entry('priority', 'priority-low', {
        label: localized('priority.low'),
        slug: { 'en-CA': 'low' },
        level: { 'en-CA': 1 },
        colour: { 'en-CA': '#546e7a' },
      }),
      entry('priority', 'priority-high', {
        label: localized('priority.high'),
        slug: { 'en-CA': 'high' },
        level: { 'en-CA': 3 },
        colour: { 'en-CA': '#b3261e' },
      }),
    ],
    emptyStates: [emptyState],
    pages: [
      entry('page', 'page-home', {
        title: localized('page.home.title'),
        slug: { 'en-CA': 'home' },
        seoTitle: localized('page.home.seoTitle'),
        seoDescription: localized('page.home.seoDescription'),
        emptyState: { 'en-CA': emptyState },
      }),
      entry('page', 'page-help', {
        title: localized('page.help.title'),
        slug: { 'en-CA': 'help' },
        intro: richLocalized('page.help.intro'),
        seoTitle: localized('page.help.seoTitle'),
        seoDescription: localized('page.help.seoDescription'),
      }),
    ],
    faqItems: [
      entry('faqItem', 'faqItem-2', {
        question: localized('faq.2.question'),
        answer: richLocalized('faq.2.answer'),
        sortOrder: { 'en-CA': 2 },
      }),
      entry('faqItem', 'faqItem-1', {
        question: localized('faq.1.question'),
        answer: richLocalized('faq.1.answer'),
        sortOrder: { 'en-CA': 1 },
      }),
    ],
  };
}

/** Providers that replace the Contentful loader with fixture content. */
export function provideFakeContent(raw: RawContent | Error = fakeRawContent()) {
  return [
    {
      provide: ContentService,
      useValue: {
        loadAll: vi.fn(() => (raw instanceof Error ? Promise.reject(raw) : Promise.resolve(raw))),
      },
    },
  ];
}

/** Activates a language and loads the fixture content into the store. Call after configuring TestBed. */
export async function loadFakeContent(lang: UrlLang = 'en'): Promise<ContentStore> {
  TestBed.inject(LanguageService).activate(lang);
  const store = TestBed.inject(ContentStore);
  await store.load();
  return store;
}
