// pa11y config for CI only. It reuses pa11y.config.json and adds the Chrome
// sandbox bypass for the CI runner, a throwaway VM that renders only this
// repo's pages. Local runs keep the sandbox on.
const config = require('./pa11y.config.json');

config.defaults.chromeLaunchConfig.args.push(
  '--no-sandbox',
  '--disable-setuid-sandbox',
);

module.exports = config;
