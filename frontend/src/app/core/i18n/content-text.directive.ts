import { Directive, computed, inject, input } from '@angular/core';
import { ResolvedText } from '../content/content.models';
import { ContentParams, ContentStore } from '../content/content.store';

/**
 * Fills an element with managed text and marks fallback text with its real language.
 *
 *   <button [appText]="'button.save'"></button>      a label key
 *   <p [appText]="settings.footerText"></p>           text that is already resolved
 *
 * When French text is missing and English is shown, the element gets `lang="en-CA"` so screen readers
 * pronounce it correctly. Nothing is shown to the user about the fallback (FR-018).
 */
@Directive({
  selector: '[appText]',
  host: {
    '[textContent]': 'resolved().text',
    '[attr.lang]': 'lang()',
  },
})
export class ContentTextDirective {
  private readonly store = inject(ContentStore);

  readonly appText = input.required<string | ResolvedText>();
  readonly appTextParams = input<ContentParams>();

  protected readonly resolved = computed<ResolvedText>(() => {
    const value = this.appText();
    return typeof value === 'string' ? this.store.text(value, this.appTextParams()) : value;
  });

  protected readonly lang = computed(() => this.store.langFor(this.resolved()));
}
