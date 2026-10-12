import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentStore } from '../../core/content/content.store';
import { ContentTextDirective } from '../../core/i18n/content-text.directive';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { LanguageSwitcherComponent } from '../language-switcher/language-switcher.component';

/** App title, logo, tagline and main navigation. All wording comes from Contentful. */
@Component({
  selector: 'app-header',
  imports: [RouterLink, ContentTextDirective, LanguageSwitcherComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="header">
      <div class="container header__inner">
        @if (settings(); as s) {
          @if (s.logo; as logo) {
            <img
              class="header__logo"
              [src]="logo.url"
              [alt]="logo.alt.text"
              [attr.lang]="store.langFor(logo.alt)"
            />
          }
          <div class="header__titles shrinkable">
            <a class="header__title" [routerLink]="homeLink()" [appText]="s.appTitle"></a>
            @if (s.tagline.text) {
              <p class="header__tagline" [appText]="s.tagline"></p>
            }
          </div>
        }
        <nav class="header__nav" [attr.aria-label]="'nav.main.label' | translate">
          <ul class="header__links">
            <li><a [routerLink]="homeLink()" [appText]="'nav.home'"></a></li>
            <li><a [routerLink]="helpLink()" data-testid="nav-help" [appText]="'nav.help'"></a></li>
          </ul>
        </nav>
        <app-language-switcher />
      </div>
    </header>
  `,
  styles: `
    .header {
      border-bottom: 1px solid var(--color-border);
      background: var(--color-surface);
    }
    .header__inner {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
      padding-block: var(--space-3);
    }
    .header__logo {
      height: 2.5rem;
      width: auto;
    }
    .header__titles {
      flex: 1 1 12rem;
    }
    .header__title {
      color: var(--color-text);
      font-size: 1.25rem;
      font-weight: 700;
      text-decoration: none;
    }
    .header__tagline {
      margin: 0;
      color: var(--color-text-muted);
    }
    .header__links {
      display: flex;
      gap: var(--space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .header__links a {
      color: var(--color-primary);
    }
  `,
})
export class HeaderComponent {
  protected readonly store = inject(ContentStore);
  private readonly language = inject(LanguageService);

  protected readonly settings = this.store.appSettings;
  protected readonly homeLink = computed(() => ['/', this.language.urlLang()]);
  protected readonly helpLink = computed(() => ['/', this.language.urlLang(), 'help']);
}
