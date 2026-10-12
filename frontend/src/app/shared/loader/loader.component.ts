import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ContentTextDirective } from '../../core/i18n/content-text.directive';

/**
 * A loading indicator. Before any content has loaded there is no text to show, so by default it is a
 * spinner with `aria-busy="true"` on its container and no wording. Once content is available, pass a
 * label key and screen readers also hear that text.
 */
@Component({
  selector: 'app-loader',
  imports: [ContentTextDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="loader" aria-busy="true">
      <span class="loader__spinner" aria-hidden="true"></span>
      @if (labelKey(); as key) {
        <span class="visually-hidden" role="status" [appText]="key"></span>
      }
    </div>
  `,
  styles: `
    .loader {
      display: flex;
      justify-content: center;
      padding: var(--space-5);
    }
    .loader__spinner {
      width: 2rem;
      height: 2rem;
      border: 0.25rem solid var(--color-border);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: loader-spin 0.8s linear infinite;
    }
    @keyframes loader-spin {
      to {
        transform: rotate(360deg);
      }
    }
  `,
})
export class LoaderComponent {
  /** Label key such as `status.loading`. Leave out before content has loaded. */
  readonly labelKey = input<string | null>(null);
}
