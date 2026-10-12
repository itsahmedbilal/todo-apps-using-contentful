import { DOCUMENT } from '@angular/common';
import { Injectable, Injector, effect, inject } from '@angular/core';
import { LanguageService } from './language.service';

/** Keeps `<html lang>` equal to the active locale (en-CA or fr-CA) so screen readers use the right voice. */
@Injectable({ providedIn: 'root' })
export class HtmlLangSyncService {
  private readonly language = inject(LanguageService);
  private readonly root = inject(DOCUMENT).documentElement;
  private readonly injector = inject(Injector);
  private started = false;

  /** Starts following the active language. Safe to call more than once. */
  start(): void {
    if (this.started) return;
    this.started = true;
    effect(() => this.root.setAttribute('lang', this.language.locale()), {
      injector: this.injector,
    });
  }
}
