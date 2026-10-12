import { TestBed } from '@angular/core/testing';
import { ResolvedText } from '../../core/content/content.models';
import { ContentStore } from '../../core/content/content.store';
import { assertNoLiteralText } from '../../../testing/assert-no-literal-text';
import { expectNoAxeViolations } from '../../../testing/axe';
import { loadFakeContent, provideFakeContent, sentinel } from '../../../testing/fake-content';
import { BadgeComponent } from './badge.component';
import {
  DARK_TEXT,
  LIGHT_TEXT,
  contrastRatio,
  isHexColour,
  readableTextColour,
} from './readable-colour';

const text = (value: string): ResolvedText => ({ text: value, lang: 'en-CA' });

async function render(label: ResolvedText, colour: string | null, lang: 'en' | 'fr' = 'en') {
  await loadFakeContent(lang);
  const fixture = TestBed.createComponent(BadgeComponent);
  fixture.componentRef.setInput('label', label);
  fixture.componentRef.setInput('colour', colour);
  await fixture.whenStable();
  const badge: HTMLElement = fixture.nativeElement.querySelector('.badge');
  return { fixture, badge };
}

describe('readableTextColour', () => {
  const backgrounds = [
    '#000000',
    '#ffffff',
    '#777777',
    '#767676',
    '#808080',
    '#ff0000',
    '#00ff00',
    '#0000ff',
    '#ffff00',
    '#00ffff',
    '#ff00ff',
    '#1d6fa5',
    '#6b4c9a',
    '#546e7a',
    '#b3261e',
    '#ffaa00',
    '#7f7f00',
    '#0b5cad',
  ];

  it.each(backgrounds)('reaches AA contrast (4.5:1) on %s', (background) => {
    const text = readableTextColour(background);
    expect([DARK_TEXT, LIGHT_TEXT]).toContain(text);
    expect(contrastRatio(background, text)).toBeGreaterThanOrEqual(4.5);
  });

  it('reaches AA contrast on a sweep of colours', () => {
    for (let red = 0; red < 256; red += 51) {
      for (let green = 0; green < 256; green += 51) {
        for (let blue = 0; blue < 256; blue += 51) {
          const hex = `#${[red, green, blue].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
          expect(contrastRatio(hex, readableTextColour(hex))).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it('uses dark text on light backgrounds and light text on dark ones', () => {
    expect(readableTextColour('#ffffff')).toBe(DARK_TEXT);
    expect(readableTextColour('#000000')).toBe(LIGHT_TEXT);
  });

  it('accepts only #rrggbb as a colour', () => {
    expect(isHexColour('#A1b2C3')).toBe(true);
    expect(isHexColour('red')).toBe(false);
    expect(isHexColour('#fff')).toBe(false);
    expect(isHexColour(null)).toBe(false);
  });
});

describe('BadgeComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideFakeContent() });
  });

  it('always renders the text label', async () => {
    const { badge } = await render(text(sentinel('category.work', 'en-CA')), '#6b4c9a');
    expect(badge.textContent).toBe(sentinel('category.work', 'en-CA'));
  });

  it('uses the Contentful colour as background and a readable text colour', async () => {
    const { badge } = await render(text(sentinel('category.work', 'en-CA')), '#ffffff');
    expect(badge.style.backgroundColor).toBe('rgb(255, 255, 255)');
    expect(badge.style.color).toBe('rgb(0, 0, 0)');
  });

  it('picks light text on a dark colour', async () => {
    const { badge } = await render(text(sentinel('priority.high', 'en-CA')), '#1d3557');
    expect(badge.style.color).toBe('rgb(255, 255, 255)');
  });

  it('shows a plain badge, still with its text, when the colour is missing or not a hex colour', async () => {
    const missing = await render(text(sentinel('category.work', 'en-CA')), null);
    expect(missing.badge.classList.contains('badge--plain')).toBe(true);
    expect(missing.badge.textContent).toBe(sentinel('category.work', 'en-CA'));
    expect(missing.badge.style.backgroundColor).toBe('');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: provideFakeContent() });
    const invalid = await render(text(sentinel('category.work', 'en-CA')), 'not-a-colour');
    expect(invalid.badge.classList.contains('badge--plain')).toBe(true);
  });

  it('marks fallback text with its language', async () => {
    const { badge } = await render(
      { text: sentinel('category.work', 'en-CA'), lang: 'en-CA' },
      '#6b4c9a',
      'fr',
    );
    expect(badge.getAttribute('lang')).toBe('en-CA');
  });

  describe('with category and priority lookups', () => {
    it('shows the Uncategorized label for a category that was removed', async () => {
      const store = await loadFakeContent('en');
      const name = store.categoryName('removed')!;
      const { badge } = await render(name, store.findCategory('removed')?.colour ?? null);
      expect(badge.textContent).toBe(sentinel('status.uncategorized', 'en-CA'));
    });

    it('shows the category name in the active language', async () => {
      const store = await loadFakeContent('fr');
      const { badge } = await render(
        store.categoryName('work')!,
        store.findCategory('work')?.colour ?? null,
        'fr',
      );
      expect(badge.textContent).toBe(sentinel('category.work', 'fr-CA'));
    });

    it('shows a known priority label', async () => {
      const store = TestBed.inject(ContentStore);
      await loadFakeContent('en');
      const { badge } = await render(
        store.priorityLabel('high'),
        store.findPriority('high')?.colour ?? null,
      );
      expect(badge.textContent).toBe(sentinel('priority.high', 'en-CA'));
    });
  });

  it('renders no literal text and has no accessibility violations', async () => {
    const { fixture } = await render(text(sentinel('category.work', 'fr-CA')), '#6b4c9a', 'fr');
    expect(() => assertNoLiteralText(fixture.nativeElement)).not.toThrow();
    await expectNoAxeViolations(fixture.nativeElement);
  });
});
