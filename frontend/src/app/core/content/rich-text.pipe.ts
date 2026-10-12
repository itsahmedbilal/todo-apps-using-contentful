import { Pipe, PipeTransform } from '@angular/core';
import { documentToHtmlString } from '@contentful/rich-text-html-renderer';
import { Document } from '@contentful/rich-text-types';
import { RichTextDocument } from './content.models';

/**
 * Turns a Contentful rich text document into HTML. Bind the result with `[innerHTML]` so Angular's
 * sanitizer removes anything unsafe (scripts, event handlers, `javascript:` links) before it reaches the page.
 * Missing or empty rich text gives an empty string.
 */
@Pipe({ name: 'richText' })
export class RichTextPipe implements PipeTransform {
  transform(document: RichTextDocument | null | undefined): string {
    if (!document || !Array.isArray(document.content) || document.content.length === 0) return '';
    return documentToHtmlString(document as unknown as Document);
  }
}
