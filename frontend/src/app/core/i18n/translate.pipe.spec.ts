import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { loadFakeContent, provideFakeContent, sentinel } from '../../../testing/fake-content';
import { LanguageService } from './language.service';
import { TranslatePipe } from './translate.pipe';

@Component({
  selector: 'app-pipe-host',
  imports: [TranslatePipe],
  template: `<button type="button" [attr.aria-label]="key() | translate"></button>`,
})
class PipeHost {
  readonly key = input('button.save');
}

describe('TranslatePipe', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideFakeContent() });
  });

  it('returns the text for a key in the active language', async () => {
    await loadFakeContent('en');
    const pipe = TestBed.runInInjectionContext(() => new TranslatePipe());
    expect(pipe.transform('button.save')).toBe(sentinel('button.save', 'en-CA'));
  });

  it('substitutes placeholders', async () => {
    await loadFakeContent('en');
    const pipe = TestBed.runInInjectionContext(() => new TranslatePipe());
    // The fixture text has no placeholder, so the text comes back unchanged.
    expect(pipe.transform('button.save', { count: 2 })).toBe(sentinel('button.save', 'en-CA'));
  });

  it('gives an empty string for a key that does not exist', async () => {
    await loadFakeContent('en');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const pipe = TestBed.runInInjectionContext(() => new TranslatePipe());
    expect(pipe.transform('no.such.key')).toBe('');
  });

  it('updates in the template when the language changes', async () => {
    await loadFakeContent('en');
    const fixture = TestBed.createComponent(PipeHost);
    await fixture.whenStable();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe(sentinel('button.save', 'en-CA'));

    TestBed.inject(LanguageService).activate('fr');
    fixture.detectChanges();
    expect(button.getAttribute('aria-label')).toBe(sentinel('button.save', 'fr-CA'));
  });
});
