import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ContentTextDirective } from '../../core/i18n/content-text.directive';
import { StatusService } from './status.service';

/**
 * A polite live region. It is always in the page so screen readers pick up the message when it appears.
 */
@Component({
  selector: 'app-status-region',
  imports: [ContentTextDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="status-region" role="status" aria-live="polite" aria-atomic="true">
      @if (status.messageKey(); as key) {
        <span class="status-region__message" data-testid="status-message" [appText]="key"></span>
      }
    </div>
  `,
  styles: `
    .status-region {
      position: fixed;
      inset-inline: var(--gutter);
      bottom: var(--space-3);
      display: flex;
      justify-content: center;
      pointer-events: none;
    }
    .status-region__message {
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-text);
    }
  `,
})
export class StatusRegionComponent {
  protected readonly status = inject(StatusService);
}
