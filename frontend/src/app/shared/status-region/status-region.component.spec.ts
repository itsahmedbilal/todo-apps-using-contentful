import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { assertNoLiteralText } from '../../../testing/assert-no-literal-text';
import { expectNoAxeViolations } from '../../../testing/axe';
import { loadFakeContent, provideFakeContent, sentinel } from '../../../testing/fake-content';
import { StatusRegionComponent } from './status-region.component';
import { StatusService } from './status.service';

describe('StatusService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('announces a message key and clears it after the duration', () => {
    const service = TestBed.inject(StatusService);
    service.announce('message.itemSaved', 1000);
    expect(service.messageKey()).toBe('message.itemSaved');
    vi.advanceTimersByTime(999);
    expect(service.messageKey()).toBe('message.itemSaved');
    vi.advanceTimersByTime(1);
    expect(service.messageKey()).toBeNull();
  });

  it('a newer message replaces the older one and restarts the timer', () => {
    const service = TestBed.inject(StatusService);
    service.announce('message.itemSaved', 1000);
    vi.advanceTimersByTime(800);
    service.announce('message.itemDeleted', 1000);
    vi.advanceTimersByTime(800);
    expect(service.messageKey()).toBe('message.itemDeleted');
    vi.advanceTimersByTime(200);
    expect(service.messageKey()).toBeNull();
  });

  it('clear removes the message at once', () => {
    const service = TestBed.inject(StatusService);
    service.announce('message.itemSaved');
    service.clear();
    expect(service.messageKey()).toBeNull();
  });
});

describe('StatusRegionComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideFakeContent() });
  });

  it('is a polite live region that is present even when there is no message', async () => {
    const fixture = TestBed.createComponent(StatusRegionComponent);
    await fixture.whenStable();
    const region = fixture.nativeElement.querySelector('[role="status"]') as HTMLElement;
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.textContent?.trim()).toBe('');
  });

  it('shows the announced message in the active language', async () => {
    await loadFakeContent('fr');
    const fixture = TestBed.createComponent(StatusRegionComponent);
    TestBed.inject(StatusService).announce('message.itemSaved');
    await fixture.whenStable();

    const region = fixture.nativeElement as HTMLElement;
    expect(region.textContent?.trim()).toBe(sentinel('message.itemSaved', 'fr-CA'));
    expect(() => assertNoLiteralText(region)).not.toThrow();
  });

  it('has no accessibility violations', async () => {
    await loadFakeContent('en');
    const fixture = TestBed.createComponent(StatusRegionComponent);
    TestBed.inject(StatusService).announce('message.itemSaved');
    await fixture.whenStable();
    await expectNoAxeViolations(fixture.nativeElement);
  });
});
