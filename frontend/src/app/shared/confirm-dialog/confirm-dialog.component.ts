import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ResolvedText } from '../../core/content/content.models';
import { ContentTextDirective } from '../../core/i18n/content-text.directive';

let nextId = 0;

/**
 * A confirmation question in a native modal `<dialog>`. The browser traps focus inside it and Escape
 * cancels it. The parent shows it with `@if` and removes it when `confirm` or `cancel` is emitted; focus
 * goes back to the element that opened it when it is removed.
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [ContentTextDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      class="dialog"
      data-testid="confirm-dialog"
      [attr.aria-labelledby]="headingId"
      [attr.aria-describedby]="messageId"
      (cancel)="onCancel($event)"
    >
      <h2 class="dialog__heading" [id]="headingId" [appText]="heading()"></h2>
      <p class="dialog__message" [id]="messageId" [appText]="message()"></p>
      <div class="dialog__actions">
        <button
          type="button"
          class="dialog__cancel"
          data-testid="confirm-cancel"
          autofocus
          [appText]="'button.cancel'"
          (click)="cancelled.emit()"
        ></button>
        <button
          type="button"
          class="dialog__confirm"
          data-testid="confirm-ok"
          [appText]="'button.confirm'"
          (click)="confirmed.emit()"
        ></button>
      </div>
    </dialog>
  `,
  styles: `
    .dialog {
      width: min(100% - 2 * var(--gutter), 28rem);
      padding: var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-bg);
      color: var(--color-text);
    }
    .dialog::backdrop {
      background: rgb(0 0 0 / 0.6);
    }
    .dialog__heading {
      margin: 0 0 var(--space-2);
      font-size: 1.25rem;
    }
    .dialog__message {
      margin: 0 0 var(--space-4);
    }
    .dialog__actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--space-2);
    }
    button {
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--color-primary);
      border-radius: var(--radius);
      font: inherit;
      cursor: pointer;
    }
    .dialog__cancel {
      background: transparent;
      color: var(--color-primary);
    }
    .dialog__confirm {
      background: var(--color-primary);
      color: var(--color-on-primary);
    }
  `,
})
export class ConfirmDialogComponent {
  /** Heading text, already resolved from Contentful. */
  readonly heading = input.required<ResolvedText>();
  readonly message = input.required<ResolvedText>();
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  protected readonly headingId = `confirm-dialog-heading-${nextId}`;
  protected readonly messageId = `confirm-dialog-message-${nextId++}`;

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly document = inject(DOCUMENT);
  private readonly opener = this.document.activeElement as HTMLElement | null;

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
    inject(DestroyRef).onDestroy(() => this.opener?.focus?.());
  }

  /** Escape: stop the browser closing the dialog itself, and let the parent decide. */
  protected onCancel(event: Event): void {
    event.preventDefault();
    this.cancelled.emit();
  }
}
