/**
 * Pure text-building utilities shared between the runtime page JS and tests.
 * No DOM dependencies — all inputs are explicit parameters.
 */

export function applyName(s, name) {
  var subst = String(name || '').trim() || '---';
  return String(s || '').split('$name$').join(subst);
}

export function formatList(labels) {
  var n = labels.length;
  if (n === 0) return '';
  if (n === 1) return labels[0];
  if (n === 2) return labels[0] + ' and ' + labels[1];
  var head = labels.slice(0, -1).join(', ');
  return head + ', and ' + labels[n - 1];
}

/**
 * @param {object}   sec          - section object with stem, static_text, options[]
 * @param {string[]} selectedIds  - array of selected option ids
 * @param {object}   fieldValues  - map of text field id → value
 * @param {string}   name         - student name (substituted for $name$)
 */
export function buildText(sec, selectedIds, fieldValues, name) {
  var set = {};
  (selectedIds || []).forEach(function (id) { set[id] = true; });
  var labels = (sec.options || [])
    .filter(function (o) { return set[o.id]; })
    .map(function (o) { return o.label; });

  var list = formatList(labels);
  var stem = String(sec.stem || '').trimEnd();
  var sentence;

  if (stem.indexOf('$list$') >= 0) {
    sentence = stem.split('$list$').join(list) + '.';
  } else if (!stem && !list) {
    sentence = '';
  } else if (!stem && list) {
    sentence = list + '.';
  } else if (stem && !list) {
    sentence = stem + '.';
  } else {
    sentence = stem + ' ' + list + '.';
  }

  if (fieldValues) {
    Object.keys(fieldValues).forEach(function (fid) {
      var val = fieldValues[fid] || ('$' + fid + '$');
      sentence = sentence.split('$' + fid + '$').join(val);
    });
  }

  var prefix = String(sec.static_text || '').trimEnd();
  var out;
  if (prefix && sentence) out = prefix + '\n\n' + sentence;
  else if (prefix) out = prefix;
  else out = sentence;

  return applyName(out, name);
}
