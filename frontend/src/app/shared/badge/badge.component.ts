import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ResolvedText } from '../../core/content/content.models';
import { ContentTextDirective } from '../../core/i18n/content-text.directive';
import { isHexColour, readableTextColour } from './readable-colour';

/**
 * A small coloured label for a category or priority. The colour comes from Contentful, so the text colour
 * is worked out to stay readable on it, and the text label is always shown (colour is never the only cue).
 */
@Component({
  selector: 'app-badge',
  imports: [ContentTextDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span
    class="badge"
    [class.badge--plain]="!background()"
    [style.background-color]="background()"
    [style.color]="textColour()"
    [appText]="label()"
  ></span>`,
  styles: `
    .badge {
      display: inline-block;
      padding: 0 var(--space-2);
      border: 1px solid var(--color-border);
      border-radius: 999px;
      font-size: 0.875rem;
      line-height: 1.5;
    }
    .badge--plain {
      background: var(--color-bg);
      color: var(--color-text);
    }
  `,
})
export class BadgeComponent {
  readonly label = input.required<ResolvedText>();
  /** Background as `#rrggbb`. Anything else gives a plain badge. */
  readonly colour = input<string | null>(null);

  protected readonly background = computed(() => {
    const colour = this.colour();
    return isHexColour(colour) ? colour : null;
  });
  protected readonly textColour = computed(() => {
    const background = this.background();
    return background ? readableTextColour(background) : null;
  });
}
