// Content types: appSettings (single entry) and uiLabel.
// Mirrors specs/001-bilingual-todo-app/contracts/content-model.md.
// "Required" on localized fields applies to the default locale (en-CA); French completeness is
// enforced by scripts/check-translations.mjs (FR-038).
module.exports = function (migration) {
  const appSettings = migration
    .createContentType('appSettings')
    .name('App Settings')
    .description('Single entry with the app title, tagline, logo and footer.')
    .displayField('appTitle');

  appSettings
    .createField('appTitle')
    .name('App Title')
    .type('Symbol')
    .localized(true)
    .required(true)
    .validations([{ size: { max: 60 } }]);
  appSettings
    .createField('tagline')
    .name('Tagline')
    .type('Symbol')
    .localized(true)
    .validations([{ size: { max: 120 } }]);
  appSettings
    .createField('logo')
    .name('Logo')
    .type('Link')
    .linkType('Asset')
    .validations([{ linkMimetypeGroup: ['image'] }]);
  appSettings
    .createField('logoAlt')
    .name('Logo Alt Text')
    .type('Symbol')
    .localized(true)
    .validations([{ size: { max: 120 } }]);
  appSettings
    .createField('footerText')
    .name('Footer Text')
    .type('Symbol')
    .localized(true)
    .validations([{ size: { max: 160 } }]);
  appSettings
    .createField('languageSwitcherLabel')
    .name('Language Switcher Label')
    .type('Symbol')
    .localized(true)
    .required(true)
    .validations([{ size: { max: 60 } }]);

  const uiLabel = migration
    .createContentType('uiLabel')
    .name('UI Label')
    .description('Small reusable strings: buttons, placeholders, messages, validation text.')
    .displayField('key');

  uiLabel
    .createField('key')
    .name('Key')
    .type('Symbol')
    .required(true)
    .validations([{ unique: true }, { regexp: { pattern: '^[a-z][A-Za-z0-9.]*$' } }]);
  uiLabel
    .createField('value')
    .name('Value')
    .type('Symbol')
    .localized(true)
    .required(true)
    .validations([{ size: { max: 200 } }]);
  uiLabel
    .createField('group')
    .name('Group')
    .type('Symbol')
    .required(true)
    .validations([
      { in: ['Buttons', 'Forms', 'Validation', 'Messages', 'Filters', 'Navigation', 'Status'] },
    ]);
};
