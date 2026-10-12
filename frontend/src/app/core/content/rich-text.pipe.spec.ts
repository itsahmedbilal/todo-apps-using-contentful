import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RichTextDocument } from './content.models';
import { RichTextPipe } from './rich-text.pipe';

const text = (value: string, marks: string[] = []) => ({
  nodeType: 'text',
  value,
  marks: marks.map((type) => ({ type })),
  data: {},
});
const node = (nodeType: string, content: unknown[], data: object = {}) => ({
  nodeType,
  data,
  content,
});
const doc = (...content: unknown[]): RichTextDocument => ({
  nodeType: 'document',
  data: {},
  content,
});

@Component({
  imports: [RichTextPipe],
  template: `<div [innerHTML]="document | richText"></div>`,
})
class Host {
  document: RichTextDocument | null = null;
}

function render(document: RichTextDocument | null): HTMLElement {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.document = document;
  fixture.detectChanges();
  return fixture.nativeElement.querySelector('div');
}

describe('RichTextPipe', () => {
  const pipe = new RichTextPipe();

  it('renders paragraphs, h2 and h3 headings, lists, links, bold and italic', () => {
    const html = pipe.transform(
      doc(
        node('heading-2', [text('Two')]),
        node('heading-3', [text('Three')]),
        node('paragraph', [
          text('Plain '),
          text('bold', ['bold']),
          text(' '),
          text('italic', ['italic']),
          node('hyperlink', [text('link')], { uri: 'https://example.com' }),
        ]),
        node('unordered-list', [node('list-item', [node('paragraph', [text('one')])])]),
        node('ordered-list', [node('list-item', [node('paragraph', [text('first')])])]),
      ),
    );
    expect(html).toContain('<h2>Two</h2>');
    expect(html).toContain('<h3>Three</h3>');
    expect(html).toContain('<b>bold</b>');
    expect(html).toContain('<i>italic</i>');
    expect(html).toContain('<a href="https://example.com">link</a>');
    expect(html).toContain('<ul><li>');
    expect(html).toContain('<ol><li>');
  });

  it('gives nothing for missing or empty rich text', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform(doc())).toBe('');
  });

  it('escapes markup typed as text', () => {
    const html = pipe.transform(doc(node('paragraph', [text('<script>alert(1)</script>')])));
    expect(html).not.toContain('<script>');
  });

  describe('when bound with [innerHTML]', () => {
    it('keeps the allowed formatting', () => {
      const element = render(doc(node('paragraph', [text('hi', ['bold'])])));
      expect(element.querySelector('p b')?.textContent).toBe('hi');
    });

    it('removes scripts, event handlers and javascript links', () => {
      const element = render(
        doc(
          node('paragraph', [
            text('safe'),
            node('hyperlink', [text('bad')], { uri: 'javascript:alert(1)' }),
            node('hyperlink', [text('evil')], { uri: 'https://x.test" onclick="alert(1)' }),
          ]),
        ),
      );
      expect(element.querySelector('script')).toBeNull();
      expect(element.querySelector('a')?.getAttribute('href')).toMatch(/^unsafe:/);
      expect(element.querySelector('[onclick]')).toBeNull();
      expect(element.textContent).toContain('safe');
    });

    it('renders nothing for missing rich text', () => {
      expect(render(null).innerHTML).toBe('');
    });
  });
});
