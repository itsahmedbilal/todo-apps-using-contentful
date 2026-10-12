import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AppShell } from './shared/app-shell/app-shell.component';

@Component({
  selector: 'app-root',
  imports: [AppShell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-shell />`,
})
export class App {}
