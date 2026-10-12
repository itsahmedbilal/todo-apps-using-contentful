import { Pipe, PipeTransform, inject } from '@angular/core';
import { ContentParams, ContentStore } from '../content/content.store';

/**
 * Text for a label key, for attribute values (`placeholder`, `aria-label`, `alt`). It is impure on
 * purpose: the text changes when the language changes even though the key does not.
 */
@Pipe({ name: 'translate', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly store = inject(ContentStore);

  transform(key: string, params?: ContentParams): string {
    return this.store.text(key, params).text;
  }
}
