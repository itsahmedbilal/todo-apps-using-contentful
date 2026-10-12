// Constitution, Principle II: no user-visible string may be written literally in a template.
// All wording comes from Contentful through the appText directive or the translate pipe.
//
// Reported:
//   - static text:                      <p>Save</p>
//   - words around an interpolation:    <span>{{ n }} items</span>
//   - a string literal in an interpolation:  {{ 'Save' }}
//   - literal text attributes:          alt, title, placeholder, label, aria-label (and similar)
//   - the same attributes bound to a string literal:  [alt]="'Logo'"
//
// Not reported: label keys ('nav.home' | translate, [appText]="'nav.home'"), bound values such as
// {{ settings.footerText }}, and text with no letters or digits (a separator such as "/" or "-").

const TEXT_ATTRIBUTES = new Set([
  'aria-label',
  'aria-description',
  'aria-placeholder',
  'aria-roledescription',
  'aria-valuetext',
  'alt',
  'title',
  'placeholder',
  'label',
]);

const HAS_WORD_CHARACTER = /[\p{L}\p{N}]/u;

function hasWords(text) {
  return typeof text === 'string' && HAS_WORD_CHARACTER.test(text);
}

// Does this expression show a string literal as text? Pipes are skipped on purpose: 'key' | translate
// is a lookup key, not wording.
function showsLiteral(ast) {
  if (!ast) return false;
  switch (ast.type) {
    case 'LiteralPrimitive':
      return hasWords(ast.value);
    case 'Conditional':
      return showsLiteral(ast.trueExp) || showsLiteral(ast.falseExp);
    case 'Binary':
      return showsLiteral(ast.left) || showsLiteral(ast.right);
    case 'ParenthesizedExpression':
      return showsLiteral(ast.expression);
    default:
      return false;
  }
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow hard-coded user-visible text in Angular templates.',
    },
    schema: [],
    messages: {
      literalText:
        'Hard-coded UI text "{{text}}". Show managed content instead: [appText]="\'label.key\'" or the translate pipe.',
    },
  },

  create(context) {
    function report(node, text) {
      context.report({ node, messageId: 'literalText', data: { text: String(text).trim() } });
    }

    return {
      Text(node) {
        if (hasWords(node.value)) report(node, node.value);
      },

      BoundText(node) {
        const interpolation = node.value && node.value.ast;
        if (!interpolation) return;
        for (const part of interpolation.strings || []) {
          if (hasWords(part)) report(node, part);
        }
        for (const expression of interpolation.expressions || []) {
          if (showsLiteral(expression)) report(node, expression.value);
        }
      },

      TextAttribute(node) {
        if (TEXT_ATTRIBUTES.has(node.name) && hasWords(node.value)) report(node, node.value);
      },

      BoundAttribute(node) {
        if (!TEXT_ATTRIBUTES.has(node.name)) return;
        const expression = node.value && node.value.ast;
        if (showsLiteral(expression)) report(node, '(string literal)');
      },
    };
  },
};
