import { TestBed } from '@angular/core/testing';
import { RawContent } from '../../core/content/content.models';
import { LanguageService } from '../../core/i18n/language.service';
import { assertNoLiteralText } from '../../../testing/assert-no-literal-text';
import { expectNoAxeViolations } from '../../../testing/axe';
import {
  fakeRawContent,
  loadFakeContent,
  provideFakeContent,
  sentinel,
} from '../../../testing/fake-content';
import { HelpPage } from './help.page';

async function render(lang: 'en' | 'fr' = 'en', raw: RawContent = fakeRawContent()) {
  TestBed.configureTestingModule({ providers: provideFakeContent(raw) });
  await loadFakeContent(lang);
  const fixture = TestBed.createComponent(HelpPage);
  await fixture.whenStable();
  const element: HTMLElement = fixture.nativeElement;
  const all = (testId: string) =>
    Array.from(element.querySelectorAll<HTMLElement>(`[data-testid="${testId}"]`));
  return { fixture, element, all };
}

describe('HelpPage', () => {
  it('shows the Help page title as the main heading and its intro', async () => {
    const { element } = await render();
    const heading = element.querySelector('[data-testid="help-heading"]')!;
    expect(heading.tagName).toBe('H1');
    expect(heading.textContent).toBe(sentinel('page.help.title', 'en-CA'));
    expect(element.querySelector('[data-testid="help-intro"]')?.textContent).toBe(
      sentinel('page.help.intro', 'en-CA'),
    );
  });

  it('lists the FAQ in sortOrder with rich text answers rendered as HTML', async () => {
    const { all } = await render();
    expect(all('help-question').map((q) => q.textContent)).toEqual([
      sentinel('faq.1.question', 'en-CA'),
      sentinel('faq.2.question', 'en-CA'),
    ]);
    expect(all('help-answer').map((a) => a.querySelector('p')?.textContent)).toEqual([
      sentinel('faq.1.answer', 'en-CA'),
      sentinel('faq.2.answer', 'en-CA'),
    ]);
  });

  it('passes answers through the sanitizer', async () => {
    const raw = fakeRawContent();
    raw.faqItems[1].fields.answer!['en-CA'] = {
      nodeType: 'document',
      data: {},
      content: [
        {
          nodeType: 'paragraph',
          data: {},
          content: [
            {
              nodeType: 'hyperlink',
              data: { uri: 'javascript:alert(1)' },
              content: [{ nodeType: 'text', value: 'x', marks: [], data: {} }],
            },
          ],
        },
      ],
    };
    const { element } = await render('en', raw);
    expect(element.querySelector('a')?.getAttribute('href')).not.toMatch(/^javascript:/);
  });

  it('follows a language switch', async () => {
    const { fixture, all } = await render('en');
    TestBed.inject(LanguageService).activate('fr');
    await fixture.whenStable();
    expect(all('help-question')[0].textContent).toBe(sentinel('faq.1.question', 'fr-CA'));
    expect(all('help-answer')[0].textContent).toBe(sentinel('faq.1.answer', 'fr-CA'));
  });

  it('marks English fallback answers with their language', async () => {
    const raw = fakeRawContent();
    delete raw.faqItems[1].fields.answer!['fr-CA'];
    const { all } = await render('fr', raw);
    const answers = all('help-answer');
    expect(answers[0].getAttribute('lang')).toBe('en-CA');
    expect(answers[1].getAttribute('lang')).toBeNull();
  });

  it('renders no literal text and has no accessibility violations', async () => {
    const { element } = await render('fr');
    expect(() => assertNoLiteralText(element)).not.toThrow();
    await expectNoAxeViolations(element);
  });
});
