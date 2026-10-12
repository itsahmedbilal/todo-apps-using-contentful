import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ResolvedRichText } from '../../core/content/content.models';
import { ContentStore } from '../../core/content/content.store';
import { RichTextPipe } from '../../core/content/rich-text.pipe';
import { ContentTextDirective } from '../../core/i18n/content-text.directive';
import { PageMetaService } from '../../core/seo/page-meta.service';

/** The Help page: an introduction and the frequently asked questions, all from Contentful. */
@Component({
  selector: 'app-help-page',
  imports: [ContentTextDirective, RichTextPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container help">
      @if (page(); as p) {
        <h1 class="help__heading" data-testid="help-heading" [appText]="p.title"></h1>
        @if (p.intro.document; as intro) {
          <div
            class="rich"
            data-testid="help-intro"
            [attr.lang]="langOf(p.intro)"
            [innerHTML]="intro | richText"
          ></div>
        }
      }
      <ul class="help__faq" data-testid="help-faq">
        @for (item of faq(); track item.id) {
          <li class="help__item" data-testid="help-faq-item">
            <h2 class="help__question" data-testid="help-question" [appText]="item.question"></h2>
            <div
              class="rich"
              data-testid="help-answer"
              [attr.lang]="langOf(item.answer)"
              [innerHTML]="item.answer.document | richText"
            ></div>
          </li>
        }
      </ul>
    </div>
  `,
  styles: `
    .help {
      display: grid;
      gap: var(--space-4);
      padding-block: var(--space-4);
    }
    .help__heading,
    .help__question {
      margin: 0;
    }
    .help__question {
      font-size: 1.1rem;
    }
    .help__faq {
      display: grid;
      gap: var(--space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .help__item {
      padding: var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
    }
  `,
})
export class HelpPage {
  private readonly content = inject(ContentStore);
  protected readonly page = computed(() => this.content.snapshot().pages.get('help') ?? null);
  protected readonly faq = computed(() => this.content.snapshot().faq);

  constructor() {
    inject(PageMetaService).follow('help');
  }

  /** The `lang` for rich text: only set when it fell back to the other language. */
  protected langOf(rich: ResolvedRichText): string | null {
    return this.content.langFor({ text: 'x', lang: rich.lang });
  }
}
