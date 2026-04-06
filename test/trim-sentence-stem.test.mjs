import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trimSentenceStem } from '../build.mjs';

test('empty string returns empty string', () => {
  assert.equal(trimSentenceStem(''), '');
});

test('string with no trailing punctuation is unchanged', () => {
  assert.equal(trimSentenceStem('hello world'), 'hello world');
});

test('trailing period is removed', () => {
  assert.equal(trimSentenceStem('hello.'), 'hello');
});

test('multiple trailing periods are all removed', () => {
  assert.equal(trimSentenceStem('hello...'), 'hello');
});

test('trailing ellipsis character is removed', () => {
  assert.equal(trimSentenceStem('hello\u2026'), 'hello');
});

test('period in the middle is preserved', () => {
  assert.equal(trimSentenceStem('e.g. example text'), 'e.g. example text');
});

test('trailing whitespace is trimmed', () => {
  assert.equal(trimSentenceStem('hello  '), 'hello');
});

test('trailing period with trailing whitespace is removed', () => {
  assert.equal(trimSentenceStem('hello.  '), 'hello');
});

test('null-ish value returns empty string', () => {
  assert.equal(trimSentenceStem(null), '');
  assert.equal(trimSentenceStem(undefined), '');
});
