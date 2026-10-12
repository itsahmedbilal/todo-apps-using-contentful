// Local ESLint plugin that enforces constitution Principle II (no hard-coded UI text).
module.exports = {
  rules: {
    'no-literal-ui-text': require('./no-literal-ui-text'),
    'no-literal-text-in-tests': require('./no-literal-text-in-tests'),
  },
};
