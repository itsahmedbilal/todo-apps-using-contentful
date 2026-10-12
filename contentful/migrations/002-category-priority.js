// Content types: category and priority.
// Mirrors specs/001-bilingual-todo-app/contracts/content-model.md.
module.exports = function (migration) {
  const category = migration
    .createContentType('category')
    .name('Category')
    .description('Groups tasks. Tasks refer to it by slug, never by translated name.')
    .displayField('name');

  category
    .createField('name')
    .name('Name')
    .type('Symbol')
    .localized(true)
    .required(true)
    .validations([{ size: { max: 40 } }]);
  category
    .createField('slug')
    .name('Slug')
    .type('Symbol')
    .required(true)
    .validations([{ unique: true }, { regexp: { pattern: '^[a-z0-9-]+$' } }]);
  category
    .createField('colour')
    .name('Colour')
    .type('Symbol')
    .required(true)
    .validations([{ regexp: { pattern: '^#[0-9A-Fa-f]{6}$' } }]);
  category.createField('icon').name('Icon').type('Symbol');
  category.createField('sortOrder').name('Sort Order').type('Integer').required(true);

  const priority = migration
    .createContentType('priority')
    .name('Priority')
    .description('Task importance. Tasks refer to it by slug; level is used for sorting.')
    .displayField('label');

  priority
    .createField('label')
    .name('Label')
    .type('Symbol')
    .localized(true)
    .required(true)
    .validations([{ size: { max: 40 } }]);
  priority
    .createField('slug')
    .name('Slug')
    .type('Symbol')
    .required(true)
    .validations([{ unique: true }, { in: ['low', 'medium', 'high'] }]);
  priority
    .createField('level')
    .name('Level')
    .type('Integer')
    .required(true)
    .validations([{ range: { min: 1, max: 10 } }]);
  priority
    .createField('colour')
    .name('Colour')
    .type('Symbol')
    .required(true)
    .validations([{ regexp: { pattern: '^#[0-9A-Fa-f]{6}$' } }]);
};
