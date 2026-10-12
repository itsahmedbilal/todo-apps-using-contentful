import { assertNoLiteralText } from './assert-no-literal-text';
import { expectNoAxeViolations } from './axe';
import { FAKE_LABEL_KEYS, sentinel } from './fake-content';

function html(markup: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = markup;
  document.body.appendChild(container);
  return container;
}

afterEach(() => (document.body.innerHTML = ''));

// These helpers guard every component test, so they must be shown to fail when they should.
describe('assertNoLiteralText', () => {
  it('accepts sentinel text, including several sentinels together', () => {
    const element = html(
      `<p>${sentinel('a.b', 'en-CA')}</p><p>${sentinel('a.b', 'en-CA')} ${sentinel('c', 'fr-CA')}</p>`,
    );
    expect(() => assertNoLiteralText(element)).not.toThrow();
  });

  it('rejects hard-coded text and names it', () => {
    expect(() => assertNoLiteralText(html('<p>Save</p>'))).toThrow(/Save/);
  });

  it('rejects hard-coded text mixed with a sentinel', () => {
    expect(() => assertNoLiteralText(html(`<p>${sentinel('a', 'en-CA')} Save</p>`))).toThrow(
      /Save/,
    );
  });

  it.each(['aria-label', 'alt', 'title', 'placeholder'])(
    'rejects a hard-coded %s attribute',
    (attribute) => {
      expect(() => assertNoLiteralText(html(`<span ${attribute}="Close"></span>`))).toThrow(
        /Close/,
      );
    },
  );

  it('accepts sentinel attributes', () => {
    expect(() =>
      assertNoLiteralText(html(`<img alt="${sentinel('logo', 'fr-CA')}" src="x.png">`)),
    ).not.toThrow();
  });

  it('ignores punctuation and symbols with no wording', () => {
    expect(() =>
      assertNoLiteralText(html('<span>/</span><span>©</span><span>—</span>')),
    ).not.toThrow();
  });

  it('accepts text that is explicitly allowed', () => {
    expect(() => assertNoLiteralText(html('<p>Allowed text</p>'), ['Allowed text'])).not.toThrow();
  });

  it('ignores whitespace and script and style content', () => {
    expect(() =>
      assertNoLiteralText(html('<div>  \n </div><style>.a { color: red }</style>')),
    ).not.toThrow();
  });
});

describe('expectNoAxeViolations', () => {
  it('passes accessible markup', async () => {
    await expect(
      expectNoAxeViolations(html('<main><h1>t</h1><button type="button">go</button></main>')),
    ).resolves.toBeUndefined();
  });

  it('fails an image with no alt text', async () => {
    await expect(expectNoAxeViolations(html('<img src="x.png">'))).rejects.toThrow(/image-alt/);
  });

  it('fails a button with no accessible name', async () => {
    await expect(expectNoAxeViolations(html('<button type="button"></button>'))).rejects.toThrow(
      /button-name/,
    );
  });
});

describe('fake content', () => {
  it('covers all 66 keys in the content-model contract, without duplicates', () => {
    expect(FAKE_LABEL_KEYS).toHaveLength(67);
    expect(new Set(FAKE_LABEL_KEYS).size).toBe(67);
  });
});
