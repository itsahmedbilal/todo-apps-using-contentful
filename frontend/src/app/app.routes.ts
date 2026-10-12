import { Routes } from '@angular/router';
import { languageGuard, rootRedirectGuard } from './core/i18n/language.guard';

/**
 * The language is the first part of every address: /en/... and /fr/...
 * Feature pages are added as children of `:lang`, before the catch-all, as they are built.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', canActivate: [rootRedirectGuard], children: [] },
  {
    path: ':lang',
    canActivate: [languageGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./features/todos/todo-list.page').then((m) => m.TodoListPage),
      },
      {
        path: 'help',
        loadComponent: () => import('./features/help/help.page').then((m) => m.HelpPage),
      },
      {
        path: '**',
        loadComponent: () =>
          import('./features/not-found/not-found.page').then((m) => m.NotFoundPage),
      },
    ],
  },
];
