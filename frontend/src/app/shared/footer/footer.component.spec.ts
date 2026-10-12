import { TestBed } from '@angular/core/testing';
import { assertNoLiteralText } from '../../../testing/assert-no-literal-text';
import { expectNoAxeViolations } from '../../../testing/axe';
import {
  fakeRawContent,
  loadFakeContent,
  provideFakeContent,
  sentinel,
} from '../../../testing/fake-content';
import { FooterComponent } from './footer.component';

async function render(lang: 'en' | 'fr', raw = fakeRawContent()) {
  TestBed.configureTestingModule({ providers: provideFakeContent(raw) });
  await loadFakeContent(lang);
  const fixture = TestBed.createComponent(FooterComponent);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('FooterComponent', () => {
  it('shows the footer text in the active language', async () => {
    const element = await render('fr');
    expect(element.querySelector('footer p')?.textContent).toBe(
      sentinel('appSettings.footerText', 'fr-CA'),
    );
  });

  it('is a contentinfo landmark', async () => {
    const element = await render('en');
    expect(element.querySelector('footer')).not.toBeNull();
  });

  it('shows nothing when the editors have not written a footer', async () => {
    const raw = fakeRawContent();
    raw.appSettings[0].fields.footerText = undefined;
    const element = await render('en', raw);
    expect(element.querySelector('footer')).toBeNull();
  });

  it('shows nothing before the content has loaded', () => {
    TestBed.configureTestingModule({ providers: provideFakeContent() });
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('footer')).toBeNull();
  });

  it('renders no literal text and has no accessibility violations', async () => {
    const element = await render('fr');
    expect(() => assertNoLiteralText(element)).not.toThrow();
    await expectNoAxeViolations(element);
  });
});
