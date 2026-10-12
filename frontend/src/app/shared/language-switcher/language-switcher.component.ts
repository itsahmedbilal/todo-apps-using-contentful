import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { ContentStore } from '../../core/content/content.store';
import { ContentTextDirective } from '../../core/i18n/content-text.directive';
import { LanguageService } from '../../core/i18n/language.service';
import { UrlLang } from '../../core/i18n/locales';

const LANGUAGE_PREFIX = /^\/(?:en|fr)(?=[/?#]|$)/;

/**
 * Switches between English and French. It is a link to the same page under the other language, so the
 * address changes, it works with the keyboard, and the page is not reloaded. Choosing a language also
 * saves it for the next visit.
 */
@Component({
  selector: 'app-language-switcher',
  imports: [ContentTextDirective, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="group" [attr.aria-label]="groupLabel()">
      <a
        class="switcher"
        data-testid="language-switcher"
        [routerLink]="target()"
        (click)="choose()"
      >
        <span [attr.lang]="other()"><span [appText]="'language.name.' + other()"></span></span>
      </a>
    </div>
  `,
  styles: `
    .switcher {
      color: var(--color-primary);
    }
  `,
})
export class LanguageSwitcherComponent {
  private readonly language = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly content = inject(ContentStore);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly other = computed<UrlLang>(() =>
    this.language.urlLang() === 'en' ? 'fr' : 'en',
  );
  protected readonly groupLabel = computed(
    () => this.content.appSettings()?.languageSwitcherLabel.text ?? null,
  );

  /** The current address with the language segment swapped. */
  protected readonly target = computed(() => this.router.parseUrl(this.swapLanguage(this.url())));

  private swapLanguage(url: string): string {
    const prefix = `/${this.other()}`;
    if (LANGUAGE_PREFIX.test(url)) return url.replace(LANGUAGE_PREFIX, prefix);
    return `${prefix}${url === '/' ? '' : url}`;
  }

  protected choose(): void {
    this.language.setLanguage(this.other());
  }
}
