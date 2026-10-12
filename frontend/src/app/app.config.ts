import { provideHttpClient, withFetch } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { ContentStore } from './core/content/content.store';
import { HtmlLangSyncService } from './core/i18n/html-lang-sync.service';
import { registerLocales } from './core/i18n/locales';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    // Register date and number formats for both languages, and start loading content without
    // holding up the first render: the shell shows a loader until the content is ready.
    provideAppInitializer(() => {
      registerLocales();
      inject(HtmlLangSyncService).start();
      void inject(ContentStore).load();
    }),
  ],
};
