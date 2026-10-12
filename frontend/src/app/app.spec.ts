import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { loadFakeContent, provideFakeContent } from '../testing/fake-content';
import { App } from './app';

describe('App', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), ...provideFakeContent()] });
  });

  it('creates the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the page shell once content has loaded', async () => {
    await loadFakeContent('en');
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('app-shell header')).not.toBeNull();
    expect(element.querySelector('app-shell main')).not.toBeNull();
    expect(element.querySelector('app-shell footer')).not.toBeNull();
  });
});
