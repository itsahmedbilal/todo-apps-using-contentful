import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ContentTextDirective } from '../../core/i18n/content-text.directive';

/** A friendly error message with a retry button. Both texts come from managed content. */
@Component({
  selector: 'app-error-panel',
  imports: [ContentTextDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="error-panel" role="alert">
      <p class="error-panel__message" [appText]="messageKey()"></p>
      <button
        type="button"
        class="error-panel__retry"
        [appText]="retryKey()"
        (click)="retry.emit()"
      ></button>
    </div>
  `,
  styles: `
    .error-panel {
      padding: var(--space-3);
      border: 1px solid var(--color-error);
      border-radius: var(--radius);
    }
    .error-panel__message {
      margin: 0 0 var(--space-3);
      color: var(--color-error);
    }
    .error-panel__retry {
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
export class ErrorPanelComponent {
  /** Label key for the message, for example `message.error.load`. */
  readonly messageKey = input.required<string>();
  /** Label key for the retry button. */
  readonly retryKey = input('button.retry');
  readonly retry = output<void>();
}
