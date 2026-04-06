import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SECTIONS_DIR = path.join(ROOT, 'sections');
const DIST_HTML = path.join(ROOT, 'dist', 'index.html');

function getSections(html) {
  const m = html.match(/<script type="application\/json" id="sections-data">([\s\S]*?)<\/script>/);
  assert.ok(m, 'sections-data script tag not found');
  return JSON.parse(m[1]);
}

test('all YAML section files parse without error', async () => {
  const files = await fs.readdir(SECTIONS_DIR);
  const yamlFiles = files.filter(f => f.endsWith('.yaml'));
  assert.ok(yamlFiles.length > 0, 'no YAML files found in sections/');
  for (const f of yamlFiles) {
    const raw = await fs.readFile(path.join(SECTIONS_DIR, f), 'utf8');
    assert.doesNotThrow(() => YAML.parse(raw), `${f} failed to parse`);
  }
});

test('build script runs without error', () => {
  execSync('node build.mjs', { cwd: ROOT, stdio: 'pipe' });
});

test('dist/index.html exists after build', async () => {
  await assert.doesNotReject(fs.access(DIST_HTML));
});

test('built HTML contains 12 sections', async () => {
  const html = await fs.readFile(DIST_HTML, 'utf8');
  const sections = getSections(html);
  assert.equal(sections.length, 12);
});

test('all 9 SLD sections are present', async () => {
  const html = await fs.readFile(DIST_HTML, 'utf8');
  const sections = getSections(html);
  const sld = sections.filter(s => s.category === 'SLD');
  assert.equal(sld.length, 9);
});

test('all 3 OHI sections are present', async () => {
  const html = await fs.readFile(DIST_HTML, 'utf8');
  const sections = getSections(html);
  const ohi = sections.filter(s => s.category === 'OHI');
  assert.equal(ohi.length, 3);
});

test('ohi-impairment has 2 text fields (doctor, date)', async () => {
  const html = await fs.readFile(DIST_HTML, 'utf8');
  const sections = getSections(html);
  const sec = sections.find(s => s.id === 'ohi-impairment');
  assert.ok(sec, 'ohi-impairment not found');
  assert.equal(sec.text_fields.length, 2);
  assert.equal(sec.text_fields[0].id, 'doctor');
  assert.equal(sec.text_fields[1].id, 'date');
});

test('ohi-impairment stem contains $list$ token', async () => {
  const html = await fs.readFile(DIST_HTML, 'utf8');
  const sections = getSections(html);
  const sec = sections.find(s => s.id === 'ohi-impairment');
  assert.ok(sec.stem.includes('$list$'), `stem was: ${sec.stem}`);
});

test('sdi-areas stem contains $name$ token', async () => {
  const html = await fs.readFile(DIST_HTML, 'utf8');
  const sections = getSections(html);
  const sec = sections.find(s => s.id === 'sdi-areas');
  assert.ok(sec, 'sdi-areas not found');
  assert.ok(sec.stem.includes('$name$'), `stem was: ${sec.stem}`);
});

test('SLD intervention sections have empty stem (bare list output)', async () => {
  const html = await fs.readFile(DIST_HTML, 'utf8');
  const sections = getSections(html);
  const interventions = sections.filter(s =>
    s.category === 'SLD' && s.id !== 'sdi-areas'
  );
  for (const sec of interventions) {
    assert.equal(sec.stem, '', `${sec.id} should have empty stem, got: "${sec.stem}"`);
  }
});

test('every section has at least one option', async () => {
  const html = await fs.readFile(DIST_HTML, 'utf8');
  const sections = getSections(html);
  for (const sec of sections) {
    assert.ok(sec.options.length > 0, `${sec.id} has no options`);
  }
});
