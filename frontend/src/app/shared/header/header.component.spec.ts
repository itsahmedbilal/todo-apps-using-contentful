import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { assertNoLiteralText } from '../../../testing/assert-no-literal-text';
import { expectNoAxeViolations } from '../../../testing/axe';
import {
  KEY_MISSING_IN_FRENCH,
  fakeRawContent,
  loadFakeContent,
  provideFakeContent,
  sentinel,
} from '../../../testing/fake-content';
import { HeaderComponent } from './header.component';

async function render(lang: 'en' | 'fr', withLogo = false) {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), ...provideFakeContent(fakeRawContent({ withLogo }))],
  });
  await loadFakeContent(lang);
  const fixture = TestBed.createComponent(HeaderComponent);
  await fixture.whenStable();
  return { fixture, element: fixture.nativeElement as HTMLElement };
}

describe('HeaderComponent', () => {
  it('shows the app title and tagline from the settings', async () => {
    const { element } = await render('en');
    expect(element.querySelector('.header__title')?.textContent).toBe(
      sentinel('appSettings.appTitle', 'en-CA'),
    );
    expect(element.querySelector('.header__tagline')?.textContent).toBe(
      sentinel('appSettings.tagline', 'en-CA'),
    );
  });

  it('shows the logo with its alt text in the active language', async () => {
    const { element } = await render('fr', true);
    const logo = element.querySelector('img') as HTMLImageElement;
    expect(logo.getAttribute('src')).toBe('https://images.example/logo.png');
    expect(logo.getAttribute('alt')).toBe(sentinel('appSettings.logoAlt', 'fr-CA'));
  });

  it('shows no image when there is no logo', async () => {
    const { element } = await render('en');
    expect(element.querySelector('img')).toBeNull();
  });

  it('has a main navigation with the home and help links', async () => {
    const { element } = await render('en');
    const nav = element.querySelector('nav') as HTMLElement;
    expect(nav.getAttribute('aria-label')).toBe(sentinel('nav.main.label', 'en-CA'));
    const links = Array.from(nav.querySelectorAll('a'));
    expect(links).toHaveLength(2);
    expect(links[0].textContent).toBe(sentinel('nav.home', 'en-CA'));
    expect(links[0].getAttribute('href')).toBe('/en');
    expect(links[1].textContent).toBe(sentinel('nav.help', 'en-CA'));
    expect(links[1].getAttribute('href')).toBe('/en/help');
  });

  it('includes the language switcher', async () => {
    const { element } = await render('en');
    expect(
      element.querySelector('app-language-switcher [data-testid="language-switcher"]'),
    ).not.toBeNull();
  });

  it('links to the active language and uses its wording', async () => {
    const { element } = await render('fr');
    const link = element.querySelector('nav a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/fr');
    expect(element.querySelector('.header__title')?.getAttribute('href')).toBe('/fr');
  });

  it('marks English fallback text with its own language', async () => {
    const { element } = await render('fr');
    const link = element.querySelector('nav a') as HTMLAnchorElement;
    expect(link.textContent).toBe(sentinel(KEY_MISSING_IN_FRENCH, 'en-CA'));
    expect(link.getAttribute('lang')).toBe('en-CA');
  });

  it('renders no literal text and has no accessibility violations', async () => {
    const { element } = await render('fr', true);
    expect(() => assertNoLiteralText(element)).not.toThrow();
    await expectNoAxeViolations(element);
  });
});
