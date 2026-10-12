import { DEFAULT_LOCALE, ContentLocale } from '../i18n/locales';
import {
  ContentSnapshot,
  EmptyStateFields,
  LocalizedField,
  RawAsset,
  RawContent,
  RawEntry,
  ResolvedAppSettings,
  ResolvedCategory,
  ResolvedEmptyState,
  ResolvedFaqItem,
  ResolvedImage,
  ResolvedPage,
  ResolvedPriority,
  ResolvedRichText,
  ResolvedText,
  RichTextDocument,
} from './content.models';

const ALL_LOCALES: readonly ContentLocale[] = ['en-CA', 'fr-CA'];

function isBlank(value: unknown): boolean {
  return (
    value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
  );
}

/**
 * Picks the value for a locale. French falls back to English per field (LOC-04); the result says
 * which locale it really came from so the page can mark fallback text with the right `lang`.
 */
export function pick<T>(
  field: LocalizedField<T> | undefined,
  locale: ContentLocale,
): { value: T | undefined; lang: ContentLocale } {
  const own = field?.[locale];
  if (!isBlank(own)) return { value: own, lang: locale };
  const fallback = field?.[DEFAULT_LOCALE];
  if (locale !== DEFAULT_LOCALE && !isBlank(fallback))
    return { value: fallback, lang: DEFAULT_LOCALE };
  return { value: undefined, lang: locale };
}

/** Value of a field that is not localized (Contentful keeps it under the default locale). */
export function shared<T>(field: LocalizedField<T> | undefined): T | undefined {
  for (const locale of [DEFAULT_LOCALE, ...ALL_LOCALES]) {
    const value = field?.[locale];
    if (!isBlank(value)) return value;
  }
  return undefined;
}

export function resolveText(
  field: LocalizedField<string> | undefined,
  locale: ContentLocale,
): ResolvedText {
  const { value, lang } = pick(field, locale);
  return { text: value ?? '', lang };
}

export function resolveRich(
  field: LocalizedField<RichTextDocument> | undefined,
  locale: ContentLocale,
): ResolvedRichText {
  const { value, lang } = pick(field, locale);
  return { document: value ?? null, lang };
}

function resolveImage(
  asset: LocalizedField<RawAsset> | undefined,
  alt: LocalizedField<string> | undefined,
  locale: ContentLocale,
): ResolvedImage | null {
  const file = shared(asset)?.fields.file;
  const url = shared(file)?.url;
  if (!url) return null;
  return { url: url.startsWith('//') ? `https:${url}` : url, alt: resolveText(alt, locale) };
}

function resolveEmptyState(
  entry: RawEntry<EmptyStateFields>,
  locale: ContentLocale,
): ResolvedEmptyState {
  const f = entry.fields;
  return {
    heading: resolveText(f.heading, locale),
    message: resolveText(f.message, locale),
    callToActionLabel: resolveText(f.callToActionLabel, locale),
    illustration: resolveImage(f.illustration, f.illustrationAlt, locale),
  };
}

/** Resolves every entry for one locale. Entries without their required identifiers are skipped. */
export function buildSnapshot(raw: RawContent, locale: ContentLocale): ContentSnapshot {
  const settings = raw.appSettings[0]?.fields;
  const appSettings: ResolvedAppSettings | null = settings
    ? {
        appTitle: resolveText(settings.appTitle, locale),
        tagline: resolveText(settings.tagline, locale),
        footerText: resolveText(settings.footerText, locale),
        languageSwitcherLabel: resolveText(settings.languageSwitcherLabel, locale),
        logo: resolveImage(settings.logo, settings.logoAlt, locale),
      }
    : null;

  const labels = new Map<string, ResolvedText>();
  for (const entry of raw.uiLabels) {
    const key = shared(entry.fields.key);
    if (key) labels.set(key, resolveText(entry.fields.value, locale));
  }

  const categories: ResolvedCategory[] = [];
  for (const entry of raw.categories) {
    const slug = shared(entry.fields.slug);
    if (!slug) continue;
    categories.push({
      slug,
      name: resolveText(entry.fields.name, locale),
      colour: shared(entry.fields.colour) ?? '#454b54',
      icon: shared(entry.fields.icon) ?? null,
      sortOrder: shared(entry.fields.sortOrder) ?? 0,
    });
  }
  categories.sort((a, b) => a.sortOrder - b.sortOrder);

  const priorities: ResolvedPriority[] = [];
  for (const entry of raw.priorities) {
    const slug = shared(entry.fields.slug);
    if (!slug) continue;
    priorities.push({
      slug,
      label: resolveText(entry.fields.label, locale),
      level: shared(entry.fields.level) ?? 0,
      colour: shared(entry.fields.colour) ?? '#454b54',
    });
  }
  priorities.sort((a, b) => b.level - a.level);

  const pages = new Map<string, ResolvedPage>();
  for (const entry of raw.pages) {
    const slug = shared(entry.fields.slug);
    if (!slug) continue;
    const emptyState = shared(entry.fields.emptyState);
    pages.set(slug, {
      slug,
      title: resolveText(entry.fields.title, locale),
      intro: resolveRich(entry.fields.intro, locale),
      seoTitle: resolveText(entry.fields.seoTitle, locale),
      seoDescription: resolveText(entry.fields.seoDescription, locale),
      emptyState: emptyState?.fields ? resolveEmptyState(emptyState, locale) : null,
    });
  }

  const faq: ResolvedFaqItem[] = raw.faqItems.map((entry) => ({
    id: entry.sys.id,
    question: resolveText(entry.fields.question, locale),
    answer: resolveRich(entry.fields.answer, locale),
    sortOrder: shared(entry.fields.sortOrder) ?? 0,
  }));
  faq.sort((a, b) => a.sortOrder - b.sortOrder);

  return { appSettings, labels, categories, priorities, pages, faq };
}
