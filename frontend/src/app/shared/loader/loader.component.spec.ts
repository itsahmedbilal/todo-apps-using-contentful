import { TestBed } from '@angular/core/testing';
import { assertNoLiteralText } from '../../../testing/assert-no-literal-text';
import { expectNoAxeViolations } from '../../../testing/axe';
import { loadFakeContent, provideFakeContent, sentinel } from '../../../testing/fake-content';
import { LoaderComponent } from './loader.component';

describe('LoaderComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideFakeContent() });
  });

  it('is a busy container with a decorative spinner and no wording by default', async () => {
    const fixture = TestBed.createComponent(LoaderComponent);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(element.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(element.textContent?.trim()).toBe('');
  });

  it('announces a label from the managed content when given a key', async () => {
    await loadFakeContent('en');
    const fixture = TestBed.createComponent(LoaderComponent);
    fixture.componentRef.setInput('labelKey', 'status.loading');
    await fixture.whenStable();
    const status = fixture.nativeElement.querySelector('[role="status"]') as HTMLElement;

    expect(status.textContent).toBe(sentinel('status.loading', 'en-CA'));
    expect(status.classList).toContain('visually-hidden');
    expect(() => assertNoLiteralText(fixture.nativeElement)).not.toThrow();
  });

  it('has no accessibility violations', async () => {
    await loadFakeContent('fr');
    const fixture = TestBed.createComponent(LoaderComponent);
    fixture.componentRef.setInput('labelKey', 'status.loading');
    await fixture.whenStable();
    await expectNoAxeViolations(fixture.nativeElement);
  });
});
