import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { ContentStore } from '../../core/content/content.store';
import { ContentTextDirective } from '../../core/i18n/content-text.directive';
import { LanguageService } from '../../core/i18n/language.service';

/** Shown for any address the app does not know. */
@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, ContentTextDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="not-found container">
      <h1 [appText]="'notFound.heading'"></h1>
      <p [appText]="'notFound.message'"></p>
      <a [routerLink]="homeLink()" [appText]="'notFound.backHome'"></a>
    </section>
  `,
  styles: `
    .not-found {
      padding-block: var(--space-5);
    }
    a {
      color: var(--color-primary);
    }
  `,
})
export class NotFoundPage {
  private readonly language = inject(LanguageService);
  private readonly content = inject(ContentStore);
  protected readonly homeLink = computed(() => ['/', this.language.urlLang()]);

  constructor() {
    // Every page needs a title: use the not-found heading, or the app title if that is missing.
    const title = inject(Title);
    effect(() =>
      title.setTitle(
        this.content.text('notFound.heading').text ||
          this.content.appSettings()?.appTitle.text ||
          '',
      ),
    );
  }
}
