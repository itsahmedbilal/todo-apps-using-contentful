import { TestBed } from '@angular/core/testing';
import { HtmlLangSyncService } from './html-lang-sync.service';
import { LanguageService } from './language.service';

describe('HtmlLangSyncService', () => {
  afterEach(() => document.documentElement.removeAttribute('lang'));

  it('sets <html lang> to the active locale', () => {
    TestBed.inject(LanguageService).activate('en');
    TestBed.inject(HtmlLangSyncService).start();
    TestBed.tick();
    expect(document.documentElement.lang).toBe('en-CA');
  });

  it('updates when the language changes', () => {
    const language = TestBed.inject(LanguageService);
    language.activate('en');
    TestBed.inject(HtmlLangSyncService).start();
    TestBed.tick();
    language.activate('fr');
    TestBed.tick();
    expect(document.documentElement.lang).toBe('fr-CA');
    language.activate('en');
    TestBed.tick();
    expect(document.documentElement.lang).toBe('en-CA');
  });

  it('starting twice does not break anything', () => {
    TestBed.inject(LanguageService).activate('fr');
    const service = TestBed.inject(HtmlLangSyncService);
    service.start();
    service.start();
    TestBed.tick();
    expect(document.documentElement.lang).toBe('fr-CA');
  });
});
