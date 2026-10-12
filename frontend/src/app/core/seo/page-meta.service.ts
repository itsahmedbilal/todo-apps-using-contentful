import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ContentStore } from '../content/content.store';

/**
 * Keeps the browser tab title and the meta description in step with a Page entry in Contentful, in the
 * active language. Call `follow()` from a page component's constructor; it stops when the page is destroyed.
 */
@Injectable({ providedIn: 'root' })
export class PageMetaService {
  private readonly content = inject(ContentStore);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  follow(pageSlug: string): void {
    effect(() => {
      const snapshot = this.content.snapshot();
      const page = snapshot.pages.get(pageSlug);
      this.title.setTitle(
        page?.seoTitle.text || page?.title.text || snapshot.appSettings?.appTitle.text || '',
      );
      const description = page?.seoDescription.text;
      if (description) {
        this.meta.updateTag({ name: 'description', content: description });
      } else {
        this.document.head.querySelector('meta[name="description"]')?.remove();
      }
    });
  }
}
