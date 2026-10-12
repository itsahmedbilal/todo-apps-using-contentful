import axe from 'axe-core';

/**
 * Fails on any accessibility violation axe finds in the element.
 *
 * Two rules are off because jsdom cannot evaluate them: colour contrast (no layout or paint; contrast is
 * checked on the design tokens and again in the browser by the Playwright axe run) and the page-level
 * landmark rule (a single component is not a whole page).
 */
export async function expectNoAxeViolations(root: Element): Promise<void> {
  const results = await axe.run(root, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
  });

  if (results.violations.length > 0) {
    const summary = results.violations
      .map((violation) => {
        const targets = violation.nodes.map((node) => node.target.join(' ')).join(', ');
        return `${violation.id}: ${violation.help} (${targets})`;
      })
      .join('\n  ');
    throw new Error(`Accessibility violations:\n  ${summary}`);
  }
}
