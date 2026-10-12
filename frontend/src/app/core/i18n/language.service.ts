import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { DEFAULT_URL_LANG, UrlLang, isUrlLang, toLocale } from './locales';

const STORAGE_KEY = 'todo.lang';

/**
 * Knows which language is active. The initial language is chosen in this order (FR-016):
 * language in the URL, saved preference, browser language, English.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly active = signal<UrlLang>(this.resolveInitial(null));

  readonly urlLang = this.active.asReadonly();
  readonly locale = computed(() => toLocale(this.active()));

  /** Applies the order above. Pass the language segment from the URL, or null when there is none. */
  resolveInitial(urlSegment: string | null | undefined): UrlLang {
    if (isUrlLang(urlSegment)) return urlSegment;
    return this.readStored() ?? this.readBrowser() ?? DEFAULT_URL_LANG;
  }

  /** Makes a language active without saving it (used when the URL decides). */
  activate(lang: UrlLang): void {
    this.active.set(lang);
  }

  /** The user chose a language: make it active and remember it for the next visit. */
  setLanguage(lang: UrlLang): void {
    this.activate(lang);
    this.writeStored(lang);
  }

  private readStored(): UrlLang | null {
    try {
      const value = this.window?.localStorage.getItem(STORAGE_KEY);
      return isUrlLang(value) ? value : null;
    } catch {
      return null; // storage can be blocked or unavailable
    }
  }

  private writeStored(lang: UrlLang): void {
    try {
      this.window?.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // storage can be blocked or unavailable; the language still applies for this visit
    }
  }

  private readBrowser(): UrlLang | null {
    try {
      const preferred = this.window?.navigator.languages ?? [];
      for (const tag of preferred) {
        const primary = tag.toLowerCase().split('-')[0];
        if (isUrlLang(primary)) return primary;
      }
    } catch {
      // ignore and fall back to the default
    }
    return null;
  }
}
