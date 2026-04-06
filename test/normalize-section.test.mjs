import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSection } from '../build.mjs';

const OPT = [{ id: 'a', label: 'Option A' }];

test('uses data.id when provided', () => {
  const sec = normalizeSection({ id: 'my-id', options: OPT }, 'file.yaml');
  assert.equal(sec.id, 'my-id');
});

test('derives id from filename when data.id is absent', () => {
  const sec = normalizeSection({ options: OPT }, '03-my-section.yaml');
  assert.equal(sec.id, '03-my-section');
});

test('title falls back to "Section" when absent', () => {
  const sec = normalizeSection({ options: OPT }, 'f.yaml');
  assert.equal(sec.title, 'Section');
});

test('uses data.heading as title fallback before "Section"', () => {
  const sec = normalizeSection({ heading: 'My Heading', options: OPT }, 'f.yaml');
  assert.equal(sec.title, 'My Heading');
});

test('stem comes from sentence_stem when provided', () => {
  const sec = normalizeSection({ sentence_stem: 'The result is', options: OPT }, 'f.yaml');
  assert.equal(sec.stem, 'The result is');
});

test('stem falls back to question when sentence_stem is absent', () => {
  const sec = normalizeSection({ question: 'What applies?', options: OPT }, 'f.yaml');
  assert.equal(sec.stem, 'What applies?');
});

test('explicit empty sentence_stem does not fall back to question', () => {
  const sec = normalizeSection({ sentence_stem: '', question: 'What applies?', options: OPT }, 'f.yaml');
  assert.equal(sec.stem, '');
});

test('trailing period is stripped from stem', () => {
  const sec = normalizeSection({ sentence_stem: 'The result is.', options: OPT }, 'f.yaml');
  assert.equal(sec.stem, 'The result is');
});

test('category defaults to "General" when absent', () => {
  const sec = normalizeSection({ options: OPT }, 'f.yaml');
  assert.equal(sec.category, 'General');
});

test('category is preserved when provided', () => {
  const sec = normalizeSection({ category: 'OHI', options: OPT }, 'f.yaml');
  assert.equal(sec.category, 'OHI');
});

test('order defaults to 0', () => {
  const sec = normalizeSection({ options: OPT }, 'f.yaml');
  assert.equal(sec.order, 0);
});

test('options are normalized with trimmed labels', () => {
  const sec = normalizeSection({ options: [{ id: 'x', label: '  Foo  ' }] }, 'f.yaml');
  assert.deepEqual(sec.options, [{ id: 'x', label: 'Foo' }]);
});

test('throws when option is missing label', () => {
  assert.throws(
    () => normalizeSection({ options: [{ id: 'x' }] }, 'f.yaml'),
    /each option needs id and label/
  );
});

test('throws when option is missing id', () => {
  assert.throws(
    () => normalizeSection({ options: [{ label: 'Foo' }] }, 'f.yaml'),
    /each option needs id and label/
  );
});

test('text_fields are parsed with all properties', () => {
  const sec = normalizeSection({
    options: OPT,
    text_fields: [{ id: 'doctor', label: 'Doctor name', placeholder: 'Dr. Smith' }]
  }, 'f.yaml');
  assert.deepEqual(sec.text_fields, [{ id: 'doctor', label: 'Doctor name', placeholder: 'Dr. Smith' }]);
});

test('text_fields defaults to empty array when absent', () => {
  const sec = normalizeSection({ options: OPT }, 'f.yaml');
  assert.deepEqual(sec.text_fields, []);
});

test('$list$ token in sentence_stem is preserved in stem', () => {
  const sec = normalizeSection({
    sentence_stem: '$name$ has a diagnosis of $list$, by $doctor$',
    options: OPT
  }, 'f.yaml');
  assert.ok(sec.stem.includes('$list$'), 'stem should contain $list$');
  assert.ok(sec.stem.includes('$name$'), 'stem should contain $name$');
});
