import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ContentStore } from '../../core/content/content.store';
import { ContentTextDirective } from '../../core/i18n/content-text.directive';

/** The footer line from Contentful. Hidden when the editors have not written one. */
@Component({
  selector: 'app-footer',
  imports: [ContentTextDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (settings(); as s) {
      @if (s.footerText.text) {
        <footer class="footer">
          <div class="container">
            <p class="footer__text" [appText]="s.footerText"></p>
          </div>
        </footer>
      }
    }
  `,
  styles: `
    .footer {
      margin-top: var(--space-5);
      border-top: 1px solid var(--color-border);
      background: var(--color-surface);
    }
    .footer__text {
      margin: 0;
      padding-block: var(--space-3);
      color: var(--color-text-muted);
    }
  `,
})
export class FooterComponent {
  protected readonly settings = inject(ContentStore).appSettings;
}
