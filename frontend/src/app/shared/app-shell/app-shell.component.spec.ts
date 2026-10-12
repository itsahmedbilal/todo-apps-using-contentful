import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { ContentService } from '../../core/content/content.service';
import { ContentStore } from '../../core/content/content.store';
import { CONTENT_UNAVAILABLE_FALLBACK } from '../../core/content/fallback-message';
import { assertNoLiteralText } from '../../../testing/assert-no-literal-text';
import { expectNoAxeViolations } from '../../../testing/axe';
import {
  fakeRawContent,
  loadFakeContent,
  provideFakeContent,
  sentinel,
} from '../../../testing/fake-content';
import { StatusService } from '../status-region/status.service';
import { AppShell } from './app-shell.component';

const { en, fr } = CONTENT_UNAVAILABLE_FALLBACK;
const FALLBACK_TEXTS = [en.message, fr.message, en.retry, fr.retry, `${en.retry} / ${fr.retry}`];

describe('AppShell', () => {
  describe('while content is loading', () => {
    it('shows only the loader', async () => {
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          { provide: ContentService, useValue: { loadAll: () => new Promise(() => undefined) } },
        ],
      });
      void TestBed.inject(ContentStore).load();
      const fixture = TestBed.createComponent(AppShell);
      await fixture.whenStable();
      const element: HTMLElement = fixture.nativeElement;

      expect(element.querySelector('[aria-busy="true"]')).not.toBeNull();
      expect(element.querySelector('header, main, footer')).toBeNull();
      expect(element.textContent?.trim()).toBe('');
    });

    it('also shows the loader before loading has started', async () => {
      TestBed.configureTestingModule({ providers: [provideRouter([]), ...provideFakeContent()] });
      const fixture = TestBed.createComponent(AppShell);
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('[aria-busy="true"]')).not.toBeNull();
    });
  });

  describe('when content is ready', () => {
    async function render(lang: 'en' | 'fr' = 'en') {
      TestBed.configureTestingModule({
        providers: [provideRouter([]), ...provideFakeContent(fakeRawContent({ withLogo: true }))],
      });
      await loadFakeContent(lang);
      const fixture = TestBed.createComponent(AppShell);
      await fixture.whenStable();
      return { fixture, element: fixture.nativeElement as HTMLElement };
    }

    it('shows the skip link, header, main area, footer and status region', async () => {
      const { element } = await render('en');
      expect(element.querySelector('a.skip-link')?.textContent).toBe(
        sentinel('nav.skipToContent', 'en-CA'),
      );
      expect(element.querySelector('app-header header')).not.toBeNull();
      expect(element.querySelector('main#main')).not.toBeNull();
      expect(element.querySelector('app-footer footer')).not.toBeNull();
      expect(element.querySelector('app-status-region [role="status"]')).not.toBeNull();
      expect(element.querySelector('[aria-busy="true"]')).toBeNull();
    });

    it('puts the skip link first, before the header', async () => {
      const { element } = await render('en');
      const first = element.querySelector('a, header') as HTMLElement;
      expect(first.classList).toContain('skip-link');
    });

    it('moves focus to the main area when the skip link is used', async () => {
      const { element } = await render('en');
      document.body.appendChild(element);
      (element.querySelector('a.skip-link') as HTMLAnchorElement).click();
      expect(document.activeElement).toBe(element.querySelector('main'));
      element.remove();
    });

    it('shows a message announced by the status service', async () => {
      const { fixture, element } = await render('fr');
      TestBed.inject(StatusService).announce('message.itemSaved');
      await fixture.whenStable();
      expect(element.querySelector('app-status-region')?.textContent?.trim()).toBe(
        sentinel('message.itemSaved', 'fr-CA'),
      );
    });

    it('renders no literal text in either language and has no accessibility violations', async () => {
      for (const lang of ['en', 'fr'] as const) {
        TestBed.resetTestingModule();
        const { element } = await render(lang);
        expect(() => assertNoLiteralText(element)).not.toThrow();
        await expectNoAxeViolations(element);
      }
    });
  });

  describe('when content cannot be loaded', () => {
    async function renderError() {
      TestBed.configureTestingModule({
        providers: [provideRouter([]), ...provideFakeContent(new Error('down'))],
      });
      await TestBed.inject(ContentStore).load();
      const fixture = TestBed.createComponent(AppShell);
      await fixture.whenStable();
      return { fixture, element: fixture.nativeElement as HTMLElement };
    }

    it('shows only the fallback message, without the header or footer', async () => {
      const { element } = await renderError();
      expect(element.querySelector('app-content-unavailable')).not.toBeNull();
      expect(
        element.querySelector('app-header, app-footer, app-status-region, a.skip-link'),
      ).toBeNull();
      expect(element.querySelector('main')).not.toBeNull();
    });

    it('shows nothing but the single fallback text, and has no accessibility violations', async () => {
      const { element } = await renderError();
      expect(() => assertNoLiteralText(element, FALLBACK_TEXTS)).not.toThrow();
      await expectNoAxeViolations(element);
    });

    it('recovers into the full page when retry succeeds', async () => {
      const { fixture, element } = await renderError();
      const service = TestBed.inject(ContentService) as unknown as {
        loadAll: ReturnType<typeof vi.fn>;
      };
      service.loadAll.mockResolvedValue(fakeRawContent());

      (element.querySelector('app-content-unavailable button') as HTMLButtonElement).click();
      await fixture.whenStable();

      expect(element.querySelector('app-content-unavailable')).toBeNull();
      expect(element.querySelector('app-header header')).not.toBeNull();
    });
  });
});
