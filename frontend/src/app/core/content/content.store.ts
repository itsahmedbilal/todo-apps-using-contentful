import { Injectable, computed, inject, isDevMode, signal } from '@angular/core';
import { LanguageService } from '../i18n/language.service';
import { buildSnapshot } from './content.resolve';
import {
  ContentSnapshot,
  LoadStatus,
  RawContent,
  ResolvedCategory,
  ResolvedPriority,
  ResolvedText,
} from './content.models';
import { ContentService } from './content.service';

export type ContentParams = Readonly<Record<string, string | number>>;

const EMPTY_SNAPSHOT: ContentSnapshot = {
  appSettings: null,
  labels: new Map(),
  categories: [],
  priorities: [],
  pages: new Map(),
  faq: [],
};

/**
 * Holds all Contentful content for the session. It loads once; both languages are kept, so switching
 * language only re-resolves what is already in memory.
 */
@Injectable({ providedIn: 'root' })
export class ContentStore {
  private readonly service = inject(ContentService);
  private readonly language = inject(LanguageService);

  private readonly raw = signal<RawContent | null>(null);
  private readonly loadStatus = signal<LoadStatus>('idle');
  private readonly loadError = signal<unknown>(null);
  private readonly warned = new Set<string>();

  readonly status = this.loadStatus.asReadonly();
  readonly error = this.loadError.asReadonly();

  readonly snapshot = computed<ContentSnapshot>(() => {
    const raw = this.raw();
    return raw ? buildSnapshot(raw, this.language.locale()) : EMPTY_SNAPSHOT;
  });
  readonly appSettings = computed(() => this.snapshot().appSettings);

  /** Loads the content once. Does nothing if a load is running or has finished. */
  async load(): Promise<void> {
    if (this.loadStatus() === 'loading' || this.loadStatus() === 'ready') return;
    await this.fetch();
  }

  /** Tries again after a failure. */
  async retry(): Promise<void> {
    if (this.loadStatus() === 'loading') return;
    await this.fetch();
  }

  /**
   * Text for a label key, with `{name}` placeholders replaced. A key missing in both languages gives
   * empty text (never the key itself) and a warning during development.
   */
  text(key: string, params?: ContentParams): ResolvedText {
    const found = this.snapshot().labels.get(key);
    if (!found || found.text === '') {
      this.warnMissing(key);
      return { text: '', lang: this.language.locale() };
    }
    if (!params) return found;
    return {
      text: found.text.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
        name in params ? String(params[name]) : placeholder,
      ),
      lang: found.lang,
    };
  }

  /** Picks `<baseKey>.one` or `<baseKey>.other` with the plural rules of the active language. */
  plural(baseKey: string, count: number): ResolvedText {
    const category = new Intl.PluralRules(this.language.locale()).select(count);
    const key = category === 'one' ? `${baseKey}.one` : `${baseKey}.other`;
    return this.text(key, { count });
  }

  /** The category with this slug, or null when there is none (or it has been removed). */
  findCategory(slug: string | null | undefined): ResolvedCategory | null {
    return this.snapshot().categories.find((category) => category.slug === slug) ?? null;
  }

  /** The priority with this slug. An unknown slug gives Medium, and null if even Medium is missing. */
  findPriority(slug: string | null | undefined): ResolvedPriority | null {
    const { priorities } = this.snapshot();
    return (
      priorities.find((priority) => priority.slug === slug) ??
      priorities.find((priority) => priority.slug === 'medium') ??
      null
    );
  }

  /**
   * The name to show for a task's category: null when the task has none, and the Uncategorized label when
   * its category was removed from Contentful (FR-030).
   */
  categoryName(slug: string | null | undefined): ResolvedText | null {
    if (!slug) return null;
    return this.findCategory(slug)?.name ?? this.text('status.uncategorized');
  }

  /** The label to show for a task's priority; unknown priorities read as Medium. */
  priorityLabel(slug: string | null | undefined): ResolvedText {
    return this.findPriority(slug)?.label ?? { text: '', lang: this.language.locale() };
  }

  /** The `lang` to put on an element: only set when the text came from a different language than the page. */
  langFor(resolved: ResolvedText): string | null {
    return resolved.text !== '' && resolved.lang !== this.language.locale() ? resolved.lang : null;
  }

  private async fetch(): Promise<void> {
    this.loadStatus.set('loading');
    this.loadError.set(null);
    try {
      this.raw.set(await this.service.loadAll());
      this.loadStatus.set('ready');
    } catch (error) {
      this.loadError.set(error);
      this.loadStatus.set('error');
    }
  }

  private warnMissing(key: string): void {
    if (!isDevMode() || this.warned.has(key)) return;
    this.warned.add(key);
    console.warn(`Missing content label "${key}" in every language.`);
  }
}
