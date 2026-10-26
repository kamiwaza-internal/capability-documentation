module.exports = async function config() {
  const {validatePublication} = await import('./scripts/publication.mjs');
  validatePublication(require('./data/publication.json'));
  const {validateLocalStamps} = await import('./scripts/local-stamps.mjs');
  validateLocalStamps(require('./data/local-stamps.json'), require('./data/publication.json'));
  const {validateReleaseStamps} = await import('./scripts/release-stamps.mjs');
  validateReleaseStamps(require('./data/release-stamps-1.3.2.json'), require('./data/publication.json'));
  const {validateDescriptions} = await import('./scripts/project-descriptions.mjs');
  validateDescriptions(require('./data/descriptions.json'), require('./data/publication.json'));
  if (process.env.GITHUB_SHA && !/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA)) throw new Error('Invalid site build revision');
  const {loadReleaseCorpora} = await import('./scripts/release-corpora.mjs');
  const currentVerification = loadReleaseCorpora().filter(row => row.presentation !== 'original-tagged-release').map(row => row.currentVerification).filter(Boolean);
  const {loadReleaseWork} = await import('./scripts/release-work.mjs');
  const releaseWork = loadReleaseWork({publication: require('./data/publication.json')}).map(({retainedBytes, ...row}) => row);
  return {
    title: 'Kamiwaza Sales Dev Kit',
    tagline: 'Know what is established. See the conditions. Choose your release.',
    url: 'https://capabilities.kamiwaza.dev',
    baseUrl: '/',
    organizationName: 'kamiwaza-internal',
    projectName: 'capability-documentation',
    trailingSlash: true,
    onBrokenLinks: 'throw',
    onDuplicateRoutes: 'throw',
    staticDirectories: [],
    favicon: 'favicon.svg',
    // The commit this site was built from, when CI provides it. Not a test or publication date.
    customFields: {currentVerification, releaseWork, buildRevision: process.env.GITHUB_SHA || null, builtAt: new Date().toISOString()},
    plugins: ['./scripts/published-bundles.mjs'],
    presets: [['classic', {docs: false, blog: false, theme: {customCss: './src/css/custom.css'}}]],
    themeConfig: {
      navbar: {title: 'Kamiwaza · Sales Dev Kit', items: [{to: '/', label: 'About and evidence', position: 'left'}]},
      footer: {style: 'dark', copyright: 'Documented does not mean verified. Evidence applies only to its named build.'},
    },
  };
};
