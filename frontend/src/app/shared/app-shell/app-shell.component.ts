import { ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ContentStore } from '../../core/content/content.store';
import { ContentTextDirective } from '../../core/i18n/content-text.directive';
import { ContentUnavailableComponent } from '../content-unavailable/content-unavailable.component';
import { FooterComponent } from '../footer/footer.component';
import { HeaderComponent } from '../header/header.component';
import { LoaderComponent } from '../loader/loader.component';
import { StatusRegionComponent } from '../status-region/status-region.component';

/**
 * The page frame: skip link, header, main content, footer and the live status region.
 * Until content has loaded it shows a loader; if content cannot be loaded it shows only the fallback message.
 */
@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    ContentTextDirective,
    ContentUnavailableComponent,
    FooterComponent,
    HeaderComponent,
    LoaderComponent,
    StatusRegionComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (store.status()) {
      @case ('error') {
        <main id="main" tabindex="-1">
          <app-content-unavailable />
        </main>
      }
      @case ('ready') {
        <a
          class="skip-link"
          href="#main"
          [appText]="'nav.skipToContent'"
          (click)="skipToContent($event)"
        ></a>
        <app-header />
        <main id="main" tabindex="-1" #main>
          <router-outlet />
        </main>
        <app-footer />
        <app-status-region />
      }
      @default {
        <app-loader />
      }
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    main {
      flex: 1 0 auto;
    }
    main:focus {
      outline: none;
    }
    .skip-link {
      position: absolute;
      inset-inline-start: var(--space-2);
      top: -4rem;
      padding: var(--space-2) var(--space-3);
      background: var(--color-primary);
      color: var(--color-on-primary);
      border-radius: var(--radius);
      z-index: 10;
    }
    .skip-link:focus {
      top: var(--space-2);
    }
  `,
})
export class AppShell {
  protected readonly store = inject(ContentStore);
  private readonly main = viewChild<ElementRef<HTMLElement>>('main');

  protected skipToContent(event: Event): void {
    event.preventDefault();
    this.main()?.nativeElement.focus();
  }
}
