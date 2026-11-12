import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {filterPrimary, joinPrimaryStamps, primaryCapabilities, releaseOverview} from '../src/catalog.mjs';

const read = name => JSON.parse(readFileSync(new URL('../data/' + name, import.meta.url), 'utf8'));
const publication = read('publication.json');
const stamps = read('release-stamps-1.3.2.json');
const rows = joinPrimaryStamps(primaryCapabilities(publication), stamps, publication);
const tag = stamps.releaseTag;
const version = tag.replace(/^v/, '');

test('a release selects only its own records; the stamped tag selects the baseline records it stamped', () => {
  assert.equal(filterPrimary(rows, '', 'all').length, rows.length);
  for (const release of new Set(rows.map(row => row.version))) {
    const shown = filterPrimary(rows, '', 'all', release, tag);
    assert.ok(shown.length > 0 && shown.every(row => row.version === release), release);
  }
  const stamped = filterPrimary(rows, '', 'all', version, tag);
  assert.ok(stamped.length > 0 && stamped.every(row => row.releaseStamp || row.sourceContractStamp));
});

test('release verified means a passing scoped release stamp for the selected release, nothing wider', () => {
  const forTag = filterPrimary(rows, '', 'release-stamped', version, tag);
  assert.equal(forTag.length, stamps.releaseStamps.filter(stamp => rows.some(row => row.id === stamp.capability && row.releaseStamp)).length);
  assert.ok(forTag.every(row => row.releaseStamp && !row.sourceContractStamp));
  // A stamp for the tag is not a verdict on the baseline version it was joined to.
  const baseline = publication.releases.find(release => release.id === stamps.baselineReleaseId).version;
  assert.deepEqual(filterPrimary(rows, '', 'release-stamped', baseline, tag), []);
  const own = rows.filter(row => row.status === 'release-stamped');
  assert.equal(filterPrimary(rows, '', 'release-stamped', 'all', tag).length, own.length + forTag.length);
  // A failed or unstamped record never passes the filter.
  assert.ok(filterPrimary(rows, '', 'release-stamped', 'all', tag).every(row => row.status === 'release-stamped' || row.releaseStamp));
});

test('the release overview lists every release with records and agrees with the filters', () => {
  const report = {version: '9.9.9', capabilities: [
    {id: 'synthetic.one', status: 'accepted-scoped-release'},
    {id: 'synthetic.two', status: 'accepted-scoped-release', qualificationTarget: true},
  ]};
  const overview = releaseOverview(rows, [report], tag);
  assert.deepEqual(overview.map(item => item.version), [...overview.map(item => item.version)].sort((a, b) => b.localeCompare(a, undefined, {numeric: true})));
  assert.deepEqual(overview[0], {version: '9.9.9', records: 2, releaseVerified: 1});
  for (const item of overview.slice(1)) {
    assert.equal(item.records, filterPrimary(rows, '', 'all', item.version, tag).length, item.version);
    assert.equal(item.releaseVerified, filterPrimary(rows, '', 'release-stamped', item.version, tag).length, item.version);
  }
  assert.ok(overview.some(item => item.version === version));
});
