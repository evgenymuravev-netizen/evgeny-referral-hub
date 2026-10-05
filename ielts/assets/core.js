/* Core: utilities, answer checking, band conversion, local persistence. */
(function (w) {
  'use strict';

  /* ------------------------------------------------------------------ dom */
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        var v = attrs[k];
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') n.className = v;
        else if (k === 'html') n.innerHTML = v;
        else if (k === 'text') n.textContent = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2), v);
        else if (v === true) n.setAttribute(k, '');
        else n.setAttribute(k, v);
      }
    }
    (kids || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  }
  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* --------------------------------------------------------------- format */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function mmss(sec) {
    sec = Math.max(0, Math.round(sec));
    var m = Math.floor(sec / 60);
    return pad(m) + ':' + pad(sec % 60);
  }
  function longTime(sec) {
    var m = Math.floor(Math.max(0, sec) / 60);
    if (m < 60) return m + ' min';
    return Math.floor(m / 60) + ' h ' + (m % 60) + ' min';
  }
  function countWords(s) {
    var t = String(s || '').replace(/[‘’]/g, "'").trim();
    if (!t) return 0;
    return t.split(/\s+/).filter(function (x) { return /[A-Za-z0-9À-ɏ]/.test(x); }).length;
  }

  /* ------------------------------------------------------- answer checking */
  function norm(s) {
    return String(s === undefined || s === null ? '' : s)
      .toLowerCase()
      .replace(/[‘’ʼ]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—−]/g, '-')
      .replace(/\s*[-/]\s*/g, '-')
      .replace(/[.,;:!?"'`()\[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  /* Generate the accepted surface forms of one key answer. */
  function variants(ans) {
    var base = norm(ans);
    var out = {};
    function push(x) { if (x) { out[x] = 1; out[x.replace(/-/g, ' ')] = 1; out[x.replace(/ /g, '-')] = 1; } }
    push(base);
    push(base.replace(/\band\b/g, '&'));
    push(base.replace(/&/g, 'and'));
    push(base.replace(/^(the|a|an) /, ''));
    return Object.keys(out);
  }
  function lettersOf(v) {
    if (Array.isArray(v)) return v.slice().map(function (x) { return String(x).trim().toUpperCase(); }).sort();
    return String(v || '').toUpperCase().replace(/[^A-Z]/g, '').split('').sort();
  }

  /* Returns {correct:bool, reason:string} */
  function check(group, q, given) {
    var kind = group.kind;
    if (given === undefined || given === null || given === '' ||
        (Array.isArray(given) && !given.length)) return { correct: false, reason: 'blank' };

    if (kind === 'mcq-multi') {
      var want = lettersOf(q.answer), got = lettersOf(given);
      return { correct: want.join('') === got.join(''), reason: '' };
    }
    if (kind === 'mcq' || kind === 'tfng' || kind === 'ynng' || kind === 'matching' ||
        kind === 'headings' || kind === 'label-select' || kind === 'gap-bank') {
      return { correct: norm(given) === norm(q.answer), reason: '' };
    }
    /* free text: gap / short / label-type / summary */
    var limit = q.maxWords || group.maxWords || 0;
    if (limit && countWords(given) > limit) return { correct: false, reason: 'over-limit' };

    var keys = [q.answer].concat(q.accept || []);
    var g = norm(given), gAlt = g.replace(/^(the|a|an) /, '');
    for (var i = 0; i < keys.length; i++) {
      var vs = variants(keys[i]);
      for (var j = 0; j < vs.length; j++) {
        if (vs[j] === g || vs[j] === gAlt) return { correct: true, reason: '' };
      }
    }
    return { correct: false, reason: '' };
  }

  /* ----------------------------------------------------------- band tables */
  /* [minimum raw score, band] — first row whose min is <= raw wins. */
  var BANDS = {
    listening: [[39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6], [18, 5.5],
                [16, 5], [13, 4.5], [11, 4], [8, 3.5], [6, 3], [4, 2.5], [3, 2], [2, 1.5], [1, 1]],
    academic:  [[39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6], [19, 5.5],
                [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [3, 2], [2, 1.5], [1, 1]],
    general:   [[40, 9], [39, 8.5], [37, 8], [36, 7.5], [34, 7], [32, 6.5], [30, 6], [27, 5.5],
                [23, 5], [19, 4.5], [15, 4], [12, 3.5], [9, 3], [6, 2.5], [4, 2], [3, 1.5], [1, 1]]
  };
  function rawToBand(table, raw) {
    var rows = BANDS[table];
    for (var i = 0; i < rows.length; i++) if (raw >= rows[i][0]) return rows[i][1];
    return 0;
  }
  /* Official rounding: nearest half band, exact .25 / .75 round up. */
  function roundBand(x) { return Math.round(x * 2) / 2; }
  function overall(list) {
    var vals = list.filter(function (v) { return typeof v === 'number' && v > 0; });
    if (vals.length < 4) return null;
    var sum = vals.reduce(function (a, b) { return a + b; }, 0);
    return roundBand(sum / vals.length);
  }
  function bandLabel(b) { return b % 1 === 0 ? b.toFixed(1) : String(b); }

  /* ------------------------------------------------------- question walker */
  /* Every listening part / reading section shares the same shape:
     { groups: [ { kind, questions: [ {n, ...} ] } ] } */
  function eachQuestion(section, fn) {
    (section.parts || section.sections || []).forEach(function (part, pi) {
      (part.groups || []).forEach(function (group, gi) {
        (group.questions || []).forEach(function (q, qi) {
          fn(q, group, part, { p: pi, g: gi, q: qi });
        });
      });
    });
  }
  function questionNumbers(section) {
    var ns = [];
    eachQuestion(section, function (q) {
      if (q.ns) ns = ns.concat(q.ns); else ns.push(q.n);
    });
    return ns;
  }
  function countQuestions(section) { return questionNumbers(section).length; }

  /* Score a whole objective section. Returns {raw, total, rows:[…]}. */
  function scoreSection(section, answers) {
    var rows = [], raw = 0;
    eachQuestion(section, function (q, group, part) {
      var key = q.ns ? q.ns.join('-') : String(q.n);
      var given = answers[key];
      if (group.kind === 'mcq-multi') {
        /* each letter in the pair is worth one mark, order-independent */
        var want = lettersOf(q.answer), got = lettersOf(given || []);
        var hits = want.filter(function (L) { return got.indexOf(L) > -1; }).length;
        if (got.length > want.length) hits = 0;   /* over-selection scores nothing */
        raw += hits;
        rows.push({
          key: key, n: q.ns.join(' & '), part: part.number, kind: group.kind,
          given: got.join(', ') || '—', answer: want.join(' & '),
          correct: hits === want.length, partial: hits > 0 && hits < want.length,
          marks: hits, of: want.length, evidence: q.evidence || ''
        });
        return;
      }
      var res = check(group, q, given);
      if (res.correct) raw += 1;
      rows.push({
        key: key, n: q.n, part: part.number, kind: group.kind,
        given: (given === undefined || given === '') ? '—' : String(given),
        answer: [q.answer].concat(q.accept || []).join(' / '),
        correct: res.correct, marks: res.correct ? 1 : 0, of: 1,
        reason: res.reason, evidence: q.evidence || ''
      });
    });
    return { raw: raw, total: rows.reduce(function (a, r) { return a + r.of; }, 0), rows: rows };
  }

  /* ----------------------------------------------------------- persistence */
  var KEY = 'ielts.ukvi.suite.v1';
  var mem = null;
  function load() {
    if (mem) return mem;
    try { mem = JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { mem = {}; }
    if (!mem.results) mem.results = {};
    if (!mem.progress) mem.progress = {};
    if (!mem.prefs) mem.prefs = {};
    return mem;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(load())); }
    catch (e) { /* private mode / quota — run in memory only */ }
  }
  var Store = {
    all: load,
    pref: function (k, v) {
      var s = load();
      if (arguments.length > 1) { s.prefs[k] = v; save(); }
      return s.prefs[k];
    },
    /* in-flight answers so a refresh does not lose the attempt */
    progress: function (key, v) {
      var s = load();
      if (arguments.length > 1) { if (v === null) delete s.progress[key]; else s.progress[key] = v; save(); }
      return s.progress[key];
    },
    result: function (key, v) {
      var s = load();
      if (arguments.length > 1) { s.results[key] = v; save(); }
      return s.results[key];
    },
    results: function () { return load().results; },
    clear: function () { mem = { results: {}, progress: {}, prefs: load().prefs }; save(); }
  };

  w.IELTS = {
    el: el, esc: esc, qs: qs, qsa: qsa,
    mmss: mmss, longTime: longTime, countWords: countWords, pad: pad,
    norm: norm, check: check, lettersOf: lettersOf,
    BANDS: BANDS, rawToBand: rawToBand, roundBand: roundBand, overall: overall, bandLabel: bandLabel,
    eachQuestion: eachQuestion, questionNumbers: questionNumbers, countQuestions: countQuestions,
    scoreSection: scoreSection,
    Store: Store
  };
})(window);
