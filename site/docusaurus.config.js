module.exports = async function config() {
  const {validatePublication} = await import('./scripts/publication.mjs');
  validatePublication(require('./data/publication.json'));
  return {
    title: 'Kamiwaza capabilities',
    tagline: 'Know what is established. See the conditions. Choose your release.',
    url: 'https://capabilities.kamiwaza.dev',
    baseUrl: '/',
    organizationName: 'kamiwaza-internal',
    projectName: 'capability-documentation',
    trailingSlash: true,
    onBrokenLinks: 'throw',
    onDuplicateRoutes: 'throw',
    staticDirectories: [],
    plugins: [require.resolve('./scripts/published-bundles.mjs')],
    presets: [['classic', {docs: false, blog: false, theme: {customCss: './src/css/custom.css'}}]],
    themeConfig: {
      navbar: {title: 'Kamiwaza · Capabilities', items: [{to: '/', label: 'Release catalog', position: 'left'}]},
      footer: {style: 'dark', copyright: 'Documented does not mean verified. Evidence applies only to its named build.'},
    },
  };
};
