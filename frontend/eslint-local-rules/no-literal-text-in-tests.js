// Constitution, Principle II also covers tests of UI behavior: a test must not type the wording it expects.
// Assert text through Contentful fixture values (src/testing/fake-content.ts, or the seed files in e2e) and
// find elements with data-testid or a role, never with literal text.
//
// Reported when a literal string (or regular expression) is used as:
//   getByText / getByLabel / getByPlaceholder / getByAltText / getByTitle      first argument
//   getByRole(role, { name: '...' })                                            the name option
//   toHaveText / toContainText / toHaveTextContent / toHaveAccessibleName ...   first argument
//   toHaveAttribute('aria-label' | 'alt' | 'title' | 'placeholder', '...')      the value
//   { hasText: '...' } / { hasNotText: '...' }                                  locator filter options
//
// Not reported: getByTestId('...'), getByRole('button') without a name, and values that come from a variable.

const FIRST_ARGUMENT_IS_TEXT = new Set([
  'getByText',
  'getByLabel',
  'getByPlaceholder',
  'getByAltText',
  'getByTitle',
  'toHaveText',
  'toContainText',
  'toHaveTextContent',
  'toHaveAccessibleName',
  'toHaveAccessibleDescription',
]);

const TEXT_ATTRIBUTES = new Set(['aria-label', 'alt', 'title', 'placeholder']);
const HAS_WORD_CHARACTER = /[\p{L}\p{N}]/u;

function isLiteralText(node) {
  if (!node) return false;
  if (node.type === 'Literal') {
    if (node.regex) return true;
    return typeof node.value === 'string' && HAS_WORD_CHARACTER.test(node.value);
  }
  if (node.type === 'TemplateLiteral') {
    return node.quasis.some((quasi) => HAS_WORD_CHARACTER.test(quasi.value.cooked ?? ''));
  }
  return false;
}

function calleeName(callee) {
  if (callee.type === 'Identifier') return callee.name;
  if (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.property.type === 'Identifier'
  ) {
    return callee.property.name;
  }
  return null;
}

function propertyKey(property) {
  if (property.type !== 'Property') return null;
  if (property.key.type === 'Identifier') return property.key.name;
  if (property.key.type === 'Literal') return String(property.key.value);
  return null;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow literal UI text in test locators and assertions.',
    },
    schema: [],
    messages: {
      literalText:
        'Literal UI text in a test ({{where}}). Assert through Contentful fixture values or use a data-testid / role locator.',
    },
  },

  create(context) {
    function report(node, where) {
      context.report({ node, messageId: 'literalText', data: { where } });
    }

    return {
      CallExpression(node) {
        const name = calleeName(node.callee);
        if (!name) return;
        const [first, second] = node.arguments;

        if (FIRST_ARGUMENT_IS_TEXT.has(name) && isLiteralText(first)) {
          report(first, name);
        }

        if (name === 'getByRole' && second && second.type === 'ObjectExpression') {
          for (const property of second.properties) {
            if (propertyKey(property) === 'name' && isLiteralText(property.value))
              report(property.value, 'getByRole name');
          }
        }

        if (
          name === 'toHaveAttribute' &&
          first &&
          first.type === 'Literal' &&
          TEXT_ATTRIBUTES.has(first.value)
        ) {
          if (isLiteralText(second)) report(second, `toHaveAttribute ${first.value}`);
        }

        // Locator filter options on any call, for example locator('li', { hasText: '...' }) or .filter({ hasText: '...' }).
        for (const argument of node.arguments) {
          if (argument.type !== 'ObjectExpression' || name === 'getByRole') continue;
          for (const property of argument.properties) {
            const key = propertyKey(property);
            if ((key === 'hasText' || key === 'hasNotText') && isLiteralText(property.value)) {
              report(property.value, key);
            }
          }
        }
      },
    };
  },
};
