import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LanguageService } from './language.service';
import { isUrlLang } from './locales';

/** Looks like a language code (en, fr, de, pt-BR) rather than a page name. */
const LANGUAGE_LIKE = /^[A-Za-z]{2}(?:-[A-Za-z]{2})?$/;

/**
 * Guards `/:lang/...`. A supported language (en, fr) becomes the active one. Anything else is sent to the
 * same page under the language the app would choose by itself (saved preference, browser, English):
 *
 *   /help       ->  /en/help      (no language in the address)
 *   /de/help    ->  /en/help      (a language we do not support)
 */
export const languageGuard: CanActivateFn = (route, state) => {
  const language = inject(LanguageService);
  const router = inject(Router);

  const segment = route.paramMap.get('lang');
  if (isUrlLang(segment)) {
    language.activate(segment);
    return true;
  }

  const target = language.resolveInitial(null);
  const rest = LANGUAGE_LIKE.test(segment ?? '') ? state.url.replace(/^\/[^/?#]*/, '') : state.url;
  return router.parseUrl(`/${target}${rest}`);
};

/** Guards the root address: sends `/` to the language the app would choose by itself. */
export const rootRedirectGuard: CanActivateFn = () => {
  const target = inject(LanguageService).resolveInitial(null);
  return inject(Router).parseUrl(`/${target}`);
};
