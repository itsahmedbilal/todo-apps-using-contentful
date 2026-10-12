import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { vi } from 'vitest';
import { ContentStore } from '../../core/content/content.store';
import { CONTENT_UNAVAILABLE_FALLBACK } from '../../core/content/fallback-message';
import { assertNoLiteralText } from '../../../testing/assert-no-literal-text';
import { expectNoAxeViolations } from '../../../testing/axe';
import { provideFakeContent } from '../../../testing/fake-content';
import { ContentUnavailableComponent } from './content-unavailable.component';

const { en, fr } = CONTENT_UNAVAILABLE_FALLBACK;

describe('ContentUnavailableComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideFakeContent(new Error('down')) });
  });

  function render() {
    const fixture = TestBed.createComponent(ContentUnavailableComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the whole fallback message in English and French', () => {
    const element: HTMLElement = render().nativeElement;
    const paragraphs = Array.from(element.querySelectorAll('p'));
    expect(paragraphs.map((p) => p.textContent)).toEqual([en.message, fr.message]);
    expect(paragraphs.map((p) => p.getAttribute('lang'))).toEqual(['en', 'fr']);
  });

  it('sets a document title from the fallback constant', () => {
    render();
    expect(TestBed.inject(Title).getTitle()).toBe(`${en.message} / ${fr.message}`);
  });

  it('renders only the fallback constant, and nothing else', () => {
    const element: HTMLElement = render().nativeElement;
    expect(() =>
      assertNoLiteralText(element, [
        en.message,
        fr.message,
        `${en.retry} / ${fr.retry}`,
        en.retry,
        fr.retry,
      ]),
    ).not.toThrow();
  });

  it('has a retry button whose wording is part of the constant', () => {
    const button = render().nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.textContent?.replace(/\s+/g, ' ').trim()).toBe(`${en.retry} / ${fr.retry}`);
  });

  it('announces itself as an alert', () => {
    const section = render().nativeElement.querySelector('section') as HTMLElement;
    expect(section.getAttribute('role')).toBe('alert');
  });

  it('retries loading the content when the button is clicked', () => {
    const retry = vi.spyOn(TestBed.inject(ContentStore), 'retry').mockResolvedValue();
    const button = render().nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('has no accessibility violations', async () => {
    await expectNoAxeViolations(render().nativeElement);
  });
});
