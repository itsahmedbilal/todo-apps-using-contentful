import { TestBed } from '@angular/core/testing';
import { assertNoLiteralText } from '../../../testing/assert-no-literal-text';
import { expectNoAxeViolations } from '../../../testing/axe';
import { loadFakeContent, provideFakeContent, sentinel } from '../../../testing/fake-content';
import { ErrorPanelComponent } from './error-panel.component';

async function render(lang: 'en' | 'fr') {
  await loadFakeContent(lang);
  const fixture = TestBed.createComponent(ErrorPanelComponent);
  fixture.componentRef.setInput('messageKey', 'message.error.load');
  await fixture.whenStable();
  return fixture;
}

describe('ErrorPanelComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideFakeContent() });
  });

  it('shows the message and a retry button from managed content', async () => {
    const fixture = await render('en');
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('p')?.textContent).toBe(sentinel('message.error.load', 'en-CA'));
    expect(element.querySelector('button')?.textContent).toBe(sentinel('button.retry', 'en-CA'));
  });

  it('follows the active language', async () => {
    const fixture = await render('fr');
    expect(fixture.nativeElement.querySelector('p')?.textContent).toBe(
      sentinel('message.error.load', 'fr-CA'),
    );
  });

  it('can use a different retry label', async () => {
    const fixture = await render('en');
    fixture.componentRef.setInput('retryKey', 'button.confirm');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('button')?.textContent).toBe(
      sentinel('button.confirm', 'en-CA'),
    );
  });

  it('emits retry when the button is clicked', async () => {
    const fixture = await render('en');
    let retries = 0;
    fixture.componentInstance.retry.subscribe(() => (retries += 1));
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(retries).toBe(1);
  });

  it('is announced as an alert, renders no literal text, and has no accessibility violations', async () => {
    const fixture = await render('fr');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    expect(() => assertNoLiteralText(fixture.nativeElement)).not.toThrow();
    await expectNoAxeViolations(fixture.nativeElement);
  });
});
