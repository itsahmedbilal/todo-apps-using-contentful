import { ContentLocale } from '../i18n/locales';

export type { ContentLocale } from '../i18n/locales';

/** Contentful field values as delivered when every locale is requested. */
export type LocalizedField<T> = Partial<Record<ContentLocale, T>>;

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

/** A minimal rich text document; the rich-text pipe hands it to the Contentful renderer. */
export interface RichTextDocument {
  nodeType: 'document';
  data: Record<string, unknown>;
  content: unknown[];
}

export interface RawEntry<F> {
  sys: { id: string; contentType?: { sys: { id: string } } };
  fields: F;
}

export interface RawAsset {
  sys: { id: string };
  fields: {
    title?: LocalizedField<string>;
    description?: LocalizedField<string>;
    file?: LocalizedField<{ url: string; contentType?: string }>;
  };
}

export interface AppSettingsFields {
  appTitle?: LocalizedField<string>;
  tagline?: LocalizedField<string>;
  logo?: LocalizedField<RawAsset>;
  logoAlt?: LocalizedField<string>;
  footerText?: LocalizedField<string>;
  languageSwitcherLabel?: LocalizedField<string>;
}

export interface UiLabelFields {
  key?: LocalizedField<string>;
  value?: LocalizedField<string>;
  group?: LocalizedField<string>;
}

export interface CategoryFields {
  name?: LocalizedField<string>;
  slug?: LocalizedField<string>;
  colour?: LocalizedField<string>;
  icon?: LocalizedField<string>;
  sortOrder?: LocalizedField<number>;
}

export interface PriorityFields {
  label?: LocalizedField<string>;
  slug?: LocalizedField<string>;
  level?: LocalizedField<number>;
  colour?: LocalizedField<string>;
}

export interface EmptyStateFields {
  heading?: LocalizedField<string>;
  message?: LocalizedField<string>;
  illustration?: LocalizedField<RawAsset>;
  illustrationAlt?: LocalizedField<string>;
  callToActionLabel?: LocalizedField<string>;
}

export interface PageFields {
  title?: LocalizedField<string>;
  slug?: LocalizedField<string>;
  intro?: LocalizedField<RichTextDocument>;
  emptyState?: LocalizedField<RawEntry<EmptyStateFields>>;
  seoTitle?: LocalizedField<string>;
  seoDescription?: LocalizedField<string>;
}

export interface FaqItemFields {
  question?: LocalizedField<string>;
  answer?: LocalizedField<RichTextDocument>;
  sortOrder?: LocalizedField<number>;
}

/** Everything the single content load returns, still in every locale. */
export interface RawContent {
  appSettings: RawEntry<AppSettingsFields>[];
  uiLabels: RawEntry<UiLabelFields>[];
  categories: RawEntry<CategoryFields>[];
  priorities: RawEntry<PriorityFields>[];
  emptyStates: RawEntry<EmptyStateFields>[];
  pages: RawEntry<PageFields>[];
  faqItems: RawEntry<FaqItemFields>[];
}

/** Text after fallback resolution. `lang` is the locale the text actually came from. */
export interface ResolvedText {
  text: string;
  lang: ContentLocale;
}

export interface ResolvedRichText {
  document: RichTextDocument | null;
  lang: ContentLocale;
}

export interface ResolvedImage {
  url: string;
  alt: ResolvedText;
}

export interface ResolvedAppSettings {
  appTitle: ResolvedText;
  tagline: ResolvedText;
  footerText: ResolvedText;
  languageSwitcherLabel: ResolvedText;
  logo: ResolvedImage | null;
}

export interface ResolvedCategory {
  slug: string;
  name: ResolvedText;
  colour: string;
  icon: string | null;
  sortOrder: number;
}

export interface ResolvedPriority {
  slug: string;
  label: ResolvedText;
  level: number;
  colour: string;
}

export interface ResolvedEmptyState {
  heading: ResolvedText;
  message: ResolvedText;
  callToActionLabel: ResolvedText;
  illustration: ResolvedImage | null;
}

export interface ResolvedPage {
  slug: string;
  title: ResolvedText;
  intro: ResolvedRichText;
  seoTitle: ResolvedText;
  seoDescription: ResolvedText;
  emptyState: ResolvedEmptyState | null;
}

export interface ResolvedFaqItem {
  id: string;
  question: ResolvedText;
  answer: ResolvedRichText;
  sortOrder: number;
}

/** All content resolved for one locale. */
export interface ContentSnapshot {
  appSettings: ResolvedAppSettings | null;
  labels: ReadonlyMap<string, ResolvedText>;
  categories: readonly ResolvedCategory[];
  priorities: readonly ResolvedPriority[];
  pages: ReadonlyMap<string, ResolvedPage>;
  faq: readonly ResolvedFaqItem[];
}
