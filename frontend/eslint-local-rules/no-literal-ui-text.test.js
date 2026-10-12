const { describe, it } = require('node:test');
const { RuleTester } = require('eslint');
const templateParser = require('@angular-eslint/template-parser');
const rule = require('./no-literal-ui-text');

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({ languageOptions: { parser: templateParser } });
const filename = 'test.html';
const bad = { messageId: 'literalText' };

tester.run('no-literal-ui-text', rule, {
  valid: [
    // Managed text: label keys, resolved values, and the translate pipe
    { filename, code: `<button type="button" [appText]="'button.save'"></button>` },
    { filename, code: `<nav [attr.aria-label]="'nav.main.label' | translate"></nav>` },
    { filename, code: `<input [placeholder]="'form.title.placeholder' | translate" />` },
    { filename, code: `<img [src]="logo.url" [alt]="logo.alt.text" />` },
    { filename, code: `<p>{{ settings.footerText }}</p>` },
    { filename, code: `<p>{{ 'nav.home' | translate }}</p>` },
    // Text with no wording: separators and symbols
    { filename, code: `<span>/</span><span>©</span><span>—</span><span> | </span>` },
    // Attributes that are not text
    {
      filename,
      code: `<a href="#main" class="skip-link" id="a" lang="en" role="alert" aria-live="polite"></a>`,
    },
    { filename, code: `<div aria-busy="true" aria-hidden="true" tabindex="-1"></div>` },
    // Inside control-flow blocks and templates
    { filename, code: `@if (a) { <p [appText]="key"></p> } @else { <p [appText]="other"></p> }` },
    { filename, code: `<ng-template><span [appText]="'status.loading'"></span></ng-template>` },
    // Whitespace only
    { filename, code: `<div>\n   \n</div>` },
  ],

  invalid: [
    { filename, code: `<p>Save</p>`, errors: [bad] },
    { filename, code: `<button type="button">Cancel</button>`, errors: [bad] },
    { filename, code: `<span>Bonjour</span>`, errors: [bad] },
    { filename, code: `<p>Page 1</p>`, errors: [bad] },
    // Words next to an interpolation
    { filename, code: `<span>{{ count }} items</span>`, errors: [bad] },
    { filename, code: `<span>Total: {{ count }}</span>`, errors: [bad] },
    // A string literal inside an interpolation
    { filename, code: `<span>{{ 'Hello' }}</span>`, errors: [bad] },
    // Literal text attributes
    { filename, code: `<img alt="Logo" src="x.png" />`, errors: [bad] },
    { filename, code: `<button aria-label="Close"></button>`, errors: [bad] },
    { filename, code: `<input placeholder="Search" />`, errors: [bad] },
    { filename, code: `<span title="Help"></span>`, errors: [bad] },
    { filename, code: `<option label="Pick one"></option>`, errors: [bad] },
    { filename, code: `<div aria-description="Details"></div>`, errors: [bad] },
    // Text attributes bound to a string literal
    { filename, code: `<img [alt]="'Logo'" />`, errors: [bad] },
    { filename, code: `<button [attr.aria-label]="'Close'"></button>`, errors: [bad] },
    // One report per attribute, even when both branches are literals
    { filename, code: `<div [title]="open ? 'Close' : 'Open'"></div>`, errors: [bad] },
    // Inside control-flow blocks and templates
    { filename, code: `@if (a) { <b>In block</b> }`, errors: [bad] },
    { filename, code: `<ng-template><b>Hi</b></ng-template>`, errors: [bad] },
    { filename, code: `@for (item of items; track item) { <li>Item</li> }`, errors: [bad] },
    // Several problems are all reported
    { filename, code: `<p>One</p><p>Two</p>`, errors: [bad, bad] },
  ],
});
