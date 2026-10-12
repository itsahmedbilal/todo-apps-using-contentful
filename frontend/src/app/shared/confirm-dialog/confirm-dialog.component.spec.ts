import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ResolvedText } from '../../core/content/content.models';
import { assertNoLiteralText } from '../../../testing/assert-no-literal-text';
import { expectNoAxeViolations } from '../../../testing/axe';
import { loadFakeContent, provideFakeContent, sentinel } from '../../../testing/fake-content';
import { ConfirmDialogComponent } from './confirm-dialog.component';

const heading: ResolvedText = { text: sentinel('dialog.delete.heading', 'en-CA'), lang: 'en-CA' };
const message: ResolvedText = { text: sentinel('message.deleteConfirm', 'en-CA'), lang: 'en-CA' };

// jsdom does not implement the native modal dialog, so a stand-in records the calls and sets `open`.
function stubDialog() {
  const proto = HTMLDialogElement.prototype;
  const showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  const close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  });
  vi.spyOn(proto, 'showModal').mockImplementation(showModal);
  vi.spyOn(proto, 'close').mockImplementation(close);
  return { showModal, close };
}

async function render() {
  await loadFakeContent('en');
  const fixture = TestBed.createComponent(ConfirmDialogComponent);
  fixture.componentRef.setInput('heading', heading);
  fixture.componentRef.setInput('message', message);
  await fixture.whenStable();
  return fixture;
}

describe('ConfirmDialogComponent', () => {
  beforeEach(() => {
    if (!('showModal' in HTMLDialogElement.prototype)) {
      Object.assign(HTMLDialogElement.prototype, { showModal: vi.fn(), close: vi.fn() });
    }
    TestBed.configureTestingModule({ providers: provideFakeContent() });
  });

  afterEach(() => vi.restoreAllMocks());

  it('opens as a modal dialog when it appears', async () => {
    const { showModal } = stubDialog();
    const fixture = await render();
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('dialog').hasAttribute('open')).toBe(true);
  });

  it('is named by its heading through aria-labelledby and describes itself with the message', async () => {
    stubDialog();
    const fixture = await render();
    const dialog: HTMLElement = fixture.nativeElement.querySelector('dialog');
    const headingElement = fixture.nativeElement.querySelector(
      `#${dialog.getAttribute('aria-labelledby')}`,
    );
    expect(headingElement?.textContent).toBe(heading.text);
    const description = fixture.nativeElement.querySelector(
      `#${dialog.getAttribute('aria-describedby')}`,
    );
    expect(description?.textContent).toBe(message.text);
  });

  it('uses the confirm and cancel labels from managed content', async () => {
    stubDialog();
    const fixture = await render();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[data-testid="confirm-ok"]')?.textContent).toBe(
      sentinel('button.confirm', 'en-CA'),
    );
    expect(element.querySelector('[data-testid="confirm-cancel"]')?.textContent).toBe(
      sentinel('button.cancel', 'en-CA'),
    );
  });

  it('emits confirm when the confirm button is used', async () => {
    stubDialog();
    const fixture = await render();
    const confirmed = vi.fn();
    fixture.componentInstance.confirmed.subscribe(confirmed);
    fixture.nativeElement.querySelector('[data-testid="confirm-ok"]').click();
    expect(confirmed).toHaveBeenCalledTimes(1);
  });

  it('emits cancel when the cancel button is used', async () => {
    stubDialog();
    const fixture = await render();
    const cancelled = vi.fn();
    fixture.componentInstance.cancelled.subscribe(cancelled);
    fixture.nativeElement.querySelector('[data-testid="confirm-cancel"]').click();
    expect(cancelled).toHaveBeenCalledTimes(1);
  });

  it('cancels on Escape (the native cancel event) and keeps the dialog for the parent to remove', async () => {
    stubDialog();
    const fixture = await render();
    const cancelled = vi.fn();
    fixture.componentInstance.cancelled.subscribe(cancelled);
    const event = new Event('cancel', { cancelable: true });
    fixture.nativeElement.querySelector('dialog').dispatchEvent(event);
    expect(cancelled).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('returns focus to the element that opened it when it is removed', async () => {
    stubDialog();
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const fixture = await render();
    fixture.destroy();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('renders no literal text and has no accessibility violations', async () => {
    stubDialog();
    const fixture = await render();
    expect(() => assertNoLiteralText(fixture.nativeElement)).not.toThrow();
    await expectNoAxeViolations(fixture.nativeElement);
  });
});
