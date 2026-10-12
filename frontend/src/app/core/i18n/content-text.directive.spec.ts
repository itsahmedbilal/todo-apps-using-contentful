import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ResolvedText } from '../content/content.models';
import {
  KEY_MISSING_IN_FRENCH,
  loadFakeContent,
  provideFakeContent,
  sentinel,
} from '../../../testing/fake-content';
import { ContentTextDirective } from './content-text.directive';
import { LanguageService } from './language.service';

@Component({
  selector: 'app-text-host',
  imports: [ContentTextDirective],
  template: `<span [appText]="value()" [appTextParams]="params()"></span>`,
})
class TextHost {
  readonly value = input<string | ResolvedText>('button.save');
  readonly params = input<Record<string, string | number>>();
}

async function render(lang: 'en' | 'fr', value?: string | ResolvedText) {
  await loadFakeContent(lang);
  const fixture = TestBed.createComponent(TextHost);
  if (value !== undefined) fixture.componentRef.setInput('value', value);
  await fixture.whenStable();
  return { fixture, span: fixture.nativeElement.querySelector('span') as HTMLSpanElement };
}

describe('ContentTextDirective', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideFakeContent() });
  });

  it('shows the text for a label key', async () => {
    const { span } = await render('en');
    expect(span.textContent).toBe(sentinel('button.save', 'en-CA'));
  });

  it('does not set lang when the text is in the page language', async () => {
    const { span } = await render('fr');
    expect(span.textContent).toBe(sentinel('button.save', 'fr-CA'));
    expect(span.hasAttribute('lang')).toBe(false);
  });

  it('marks English fallback text on a French page with lang="en-CA"', async () => {
    const { span } = await render('fr', KEY_MISSING_IN_FRENCH);
    expect(span.textContent).toBe(sentinel(KEY_MISSING_IN_FRENCH, 'en-CA'));
    expect(span.getAttribute('lang')).toBe('en-CA');
  });

  it('does not mark the same text on an English page', async () => {
    const { span } = await render('en', KEY_MISSING_IN_FRENCH);
    expect(span.hasAttribute('lang')).toBe(false);
  });

  it('shows text that is already resolved, and marks it when it is fallback', async () => {
    const fallback: ResolvedText = { text: 'Hello', lang: 'en-CA' };
    const { span } = await render('fr', fallback);
    expect(span.textContent).toBe('Hello');
    expect(span.getAttribute('lang')).toBe('en-CA');
  });

  it('follows the language when it changes', async () => {
    const { fixture, span } = await render('en', KEY_MISSING_IN_FRENCH);
    TestBed.inject(LanguageService).activate('fr');
    fixture.detectChanges();
    expect(span.getAttribute('lang')).toBe('en-CA');
    TestBed.inject(LanguageService).activate('en');
    fixture.detectChanges();
    expect(span.hasAttribute('lang')).toBe(false);
  });

  it('shows nothing, and no lang, for a missing key', async () => {
    const { span } = await render('en', 'no.such.key');
    expect(span.textContent).toBe('');
    expect(span.hasAttribute('lang')).toBe(false);
  });
});
