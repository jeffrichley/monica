import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatList, applyName, buildText } from '../src/text-utils.mjs';

// --- formatList ---

test('formatList: empty array returns empty string', () => {
  assert.equal(formatList([]), '');
});

test('formatList: single item has no conjunction', () => {
  assert.equal(formatList(['attention']), 'attention');
});

test('formatList: two items joined with "and"', () => {
  assert.equal(formatList(['attention', 'focus']), 'attention and focus');
});

test('formatList: three items use Oxford comma', () => {
  assert.equal(formatList(['a', 'b', 'c']), 'a, b, and c');
});

test('formatList: four items use Oxford comma', () => {
  assert.equal(formatList(['a', 'b', 'c', 'd']), 'a, b, c, and d');
});

// --- applyName ---

test('applyName: substitutes $name$ with the provided name', () => {
  assert.equal(applyName('Hello $name$', 'Boopsie'), 'Hello Boopsie');
});

test('applyName: uses --- when name is empty string', () => {
  assert.equal(applyName('Hello $name$', ''), 'Hello ---');
});

test('applyName: uses --- when name is whitespace only', () => {
  assert.equal(applyName('Hello $name$', '   '), 'Hello ---');
});

test('applyName: replaces every occurrence of $name$', () => {
  assert.equal(applyName('$name$ and $name$', 'Jo'), 'Jo and Jo');
});

test('applyName: string without $name$ token is unchanged', () => {
  assert.equal(applyName('no token here', 'Boopsie'), 'no token here');
});

// --- buildText ---

const SEC = {
  stem: 'Known risks include',
  static_text: '',
  options: [
    { id: 'a', label: 'option A' },
    { id: 'b', label: 'option B' },
    { id: 'c', label: 'option C' },
  ]
};

test('buildText: empty stem and no selections returns empty string', () => {
  assert.equal(buildText({ ...SEC, stem: '' }, [], {}, ''), '');
});

test('buildText: stem with no selections appends period', () => {
  assert.equal(buildText(SEC, [], {}, ''), 'Known risks include.');
});

test('buildText: no stem with selections returns list + period', () => {
  assert.equal(buildText({ ...SEC, stem: '' }, ['a', 'b'], {}, ''), 'option A and option B.');
});

test('buildText: combines stem and single selection', () => {
  assert.equal(buildText(SEC, ['a'], {}, ''), 'Known risks include option A.');
});

test('buildText: combines stem and multiple selections with Oxford comma', () => {
  assert.equal(buildText(SEC, ['a', 'b', 'c'], {}, ''), 'Known risks include option A, option B, and option C.');
});

test('buildText: $list$ in stem places selections inline', () => {
  const sec = { ...SEC, stem: '$name$ has a diagnosis of $list$, confirmed' };
  assert.equal(buildText(sec, ['a', 'b'], {}, 'Jo'), 'Jo has a diagnosis of option A and option B, confirmed.');
});

test('buildText: $list$ in stem with no selections leaves empty slot', () => {
  const sec = { ...SEC, stem: 'diagnosis of $list$, confirmed' };
  assert.equal(buildText(sec, [], {}, ''), 'diagnosis of , confirmed.');
});

test('buildText: substitutes text field values', () => {
  const sec = { ...SEC, stem: 'by $doctor$ on $date$' };
  assert.equal(buildText(sec, [], { doctor: 'Dr. Smith', date: 'Jan 1' }, ''), 'by Dr. Smith on Jan 1.');
});

test('buildText: empty text field value leaves $fieldid$ as placeholder', () => {
  const sec = { ...SEC, stem: 'by $doctor$' };
  assert.equal(buildText(sec, [], { doctor: '' }, ''), 'by $doctor$.');
});

test('buildText: substitutes $name$ in output', () => {
  const sec = { ...SEC, stem: '$name$ requires instruction in' };
  assert.equal(buildText(sec, ['a'], {}, 'Boopsie'), 'Boopsie requires instruction in option A.');
});

test('buildText: prepends static_text with blank line separator', () => {
  const sec = { ...SEC, static_text: 'Preamble.' };
  assert.equal(buildText(sec, ['a'], {}, ''), 'Preamble.\n\nKnown risks include option A.');
});

test('buildText: static_text alone when no sentence', () => {
  const sec = { ...SEC, stem: '', static_text: 'Preamble.' };
  assert.equal(buildText(sec, [], {}, ''), 'Preamble.');
});

test('buildText: only unchecked options produce stem + period', () => {
  assert.equal(buildText(SEC, ['nonexistent-id'], {}, ''), 'Known risks include.');
});
