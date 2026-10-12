import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ContentStore } from '../../core/content/content.store';
import { CONTENT_UNAVAILABLE_FALLBACK } from '../../core/content/fallback-message';

/**
 * Shown only when Contentful cannot be reached. It renders the single hard-coded fallback message in
 * both languages, because the content that would say it in one language is exactly what is missing.
 */
@Component({
  selector: 'app-content-unavailable',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="content-unavailable container" role="alert">
      <p lang="en">{{ fallback.en.message }}</p>
      <p lang="fr">{{ fallback.fr.message }}</p>
      <button type="button" class="button" (click)="retry()">
        <span lang="en">{{ fallback.en.retry }}</span> /
        <span lang="fr">{{ fallback.fr.retry }}</span>
      </button>
    </section>
  `,
  styles: `
    .content-unavailable {
      padding-block: var(--space-5);
    }
    .button {
      padding: var(--space-2) var(--space-3);
      border: 0;
      border-radius: var(--radius);
      background: var(--color-primary);
      color: var(--color-on-primary);
      font: inherit;
      cursor: pointer;
    }
  `,
})
export class ContentUnavailableComponent {
  private readonly store = inject(ContentStore);
  protected readonly fallback = CONTENT_UNAVAILABLE_FALLBACK;

  constructor() {
    inject(Title).setTitle(`${this.fallback.en.message} / ${this.fallback.fr.message}`);
  }

  protected retry(): void {
    void this.store.retry();
  }
}
