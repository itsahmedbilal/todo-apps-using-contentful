// Content types: emptyState, page and faqItem.
// Mirrors specs/001-bilingual-todo-app/contracts/content-model.md.
module.exports = function (migration) {
  const emptyState = migration
    .createContentType('emptyState')
    .name('Empty State')
    .description('Shown when there is nothing to display.')
    .displayField('heading');

  emptyState
    .createField('heading')
    .name('Heading')
    .type('Symbol')
    .localized(true)
    .required(true)
    .validations([{ size: { max: 80 } }]);
  emptyState
    .createField('message')
    .name('Message')
    .type('Text')
    .localized(true)
    .required(true)
    .validations([{ size: { max: 300 } }]);
  emptyState
    .createField('illustration')
    .name('Illustration')
    .type('Link')
    .linkType('Asset')
    .validations([{ linkMimetypeGroup: ['image'] }]);
  emptyState
    .createField('illustrationAlt')
    .name('Illustration Alt Text')
    .type('Symbol')
    .localized(true)
    .validations([{ size: { max: 120 } }]);
  emptyState
    .createField('callToActionLabel')
    .name('Call to Action Label')
    .type('Symbol')
    .localized(true)
    .validations([{ size: { max: 40 } }]);

  const page = migration
    .createContentType('page')
    .name('Page')
    .description('Per-page heading, intro copy, empty state and search-engine text.')
    .displayField('title');

  page
    .createField('title')
    .name('Title')
    .type('Symbol')
    .localized(true)
    .required(true)
    .validations([{ size: { max: 80 } }]);
  page
    .createField('slug')
    .name('Slug')
    .type('Symbol')
    .required(true)
    .validations([{ unique: true }, { in: ['home', 'help'] }]);
  page
    .createField('intro')
    .name('Intro')
    .type('RichText')
    .localized(true)
    .validations([
      { enabledMarks: ['bold', 'italic'] },
      {
        enabledNodeTypes: ['heading-2', 'heading-3', 'ordered-list', 'unordered-list', 'hyperlink'],
      },
    ]);
  page
    .createField('emptyState')
    .name('Empty State')
    .type('Link')
    .linkType('Entry')
    .validations([{ linkContentType: ['emptyState'] }]);
  page
    .createField('seoTitle')
    .name('SEO Title')
    .type('Symbol')
    .localized(true)
    .validations([{ size: { max: 70 } }]);
  page
    .createField('seoDescription')
    .name('SEO Description')
    .type('Text')
    .localized(true)
    .validations([{ size: { max: 160 } }]);

  const faqItem = migration
    .createContentType('faqItem')
    .name('FAQ Item')
    .description('One question and answer on the Help page.')
    .displayField('question');

  faqItem
    .createField('question')
    .name('Question')
    .type('Symbol')
    .localized(true)
    .required(true)
    .validations([{ size: { max: 160 } }]);
  faqItem
    .createField('answer')
    .name('Answer')
    .type('RichText')
    .localized(true)
    .required(true)
    .validations([
      { enabledMarks: ['bold', 'italic'] },
      { enabledNodeTypes: ['ordered-list', 'unordered-list', 'hyperlink'] },
    ]);
  faqItem.createField('sortOrder').name('Sort Order').type('Integer').required(true);
};
