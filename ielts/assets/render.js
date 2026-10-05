/* Rendering: passages, question groups, note/table completion, charts. */
(function (w) {
  'use strict';
  var I = w.IELTS, el = I.el, esc = I.esc;

  /* Very small inline markup: **bold**, *italic*, _gap line_ */
  function md(s) {
    return esc(s)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[\s(])\*([^*]+)\*/g, '$1<em>$2</em>');
  }

  function keyOf(q) { return q.ns ? q.ns.join('-') : String(q.n); }

  /* ------------------------------------------------------------- controls */
  function gapInput(ctx, q, opts) {
    opts = opts || {};
    var key = keyOf(q);
    var node;
    if (opts.select) {
      node = el('select', { class: 'gapbox' + (opts.mini ? ' mini' : ''), 'data-key': key,
        'aria-label': 'Question ' + q.n });
      node.appendChild(el('option', { value: '', text: '—' }));
      (opts.select || []).forEach(function (o) {
        node.appendChild(el('option', { value: o.k, text: o.k + (o.short ? '  ' + o.short : '') }));
      });
    } else {
      node = el('input', { type: 'text', class: 'gapbox', autocomplete: 'off',
        spellcheck: 'false', 'data-key': key, 'aria-label': 'Question ' + q.n });
    }
    var cur = ctx.get(key);
    if (cur !== undefined && cur !== null) node.value = cur;
    if (ctx.review) {
      node.disabled = true;
      var r = ctx.rowFor(key);
      if (r) node.style.borderColor = r.correct ? 'var(--good)' : 'var(--bad)';
    } else {
      node.addEventListener('input', function () { ctx.set(key, node.value); });
      node.addEventListener('change', function () { ctx.set(key, node.value); });
      node.addEventListener('focus', function () { ctx.focus(q.ns ? q.ns[0] : q.n); });
    }
    /* The number bubble belongs inside a notes/summary block; when the control sits
       under a numbered question row the row already shows it. */
    var span = el('span', { class: 'gapwrap' },
      opts.noNum ? [node] : [el('span', { class: 'gapnum', text: String(q.n) }), node]);
    if (ctx.review) {
      var row = ctx.rowFor(key);
      if (row && !row.correct) {
        span.appendChild(el('span', { class: 'tag', text: '✓ ' + row.answer }));
      }
    }
    return span;
  }

  /* Turn "text with [[7]] gaps" into nodes. */
  function inlineWithGaps(text, ctx, qmap, opts) {
    var frag = document.createDocumentFragment();
    var parts = String(text).split(/\[\[(\d+)\]\]/);
    parts.forEach(function (chunk, i) {
      if (i % 2 === 0) {
        if (chunk) frag.appendChild(el('span', { html: md(chunk) }));
      } else {
        var q = qmap[chunk];
        if (q) frag.appendChild(gapInput(ctx, q, opts));
        else frag.appendChild(document.createTextNode('[[' + chunk + ']]'));
      }
    });
    return frag;
  }

  function renderBlocks(blocks, ctx, qmap, opts) {
    var box = el('div', { class: 'notes' });
    (blocks || []).forEach(function (b) {
      if (b.t === 'h') { box.appendChild(el('h4', { html: md(b.text) })); return; }
      if (b.t === 'lead') { box.appendChild(el('div', { class: 'lead', html: md(b.text) })); return; }
      if (b.t === 'p') {
        var p = el('p'); p.appendChild(inlineWithGaps(b.text, ctx, qmap, opts)); box.appendChild(p); return;
      }
      if (b.t === 'ul' || b.t === 'ol') {
        var list = el(b.t === 'ol' ? 'ol' : 'ul');
        (b.items || []).forEach(function (it) {
          var li = el('li'); li.appendChild(inlineWithGaps(it, ctx, qmap, opts)); list.appendChild(li);
        });
        box.appendChild(list); return;
      }
      if (b.t === 'dl') {
        var dl = el('dl', { class: 'dl' });
        (b.items || []).forEach(function (pair) {
          dl.appendChild(el('dt', { html: md(pair[0]) }));
          var dd = el('dd'); dd.appendChild(inlineWithGaps(pair[1], ctx, qmap, opts)); dl.appendChild(dd);
        });
        box.appendChild(dl); return;
      }
      if (b.t === 'table') {
        var wrapT = el('div', { class: 'tablewrap' });
        var tb = el('table', { class: 'gt' });
        if (b.head) {
          var thead = el('thead'), tr = el('tr');
          b.head.forEach(function (h) { tr.appendChild(el('th', { html: md(h) })); });
          thead.appendChild(tr); tb.appendChild(thead);
        }
        var body = el('tbody');
        (b.rows || []).forEach(function (r) {
          var trr = el('tr');
          r.forEach(function (cell) {
            var td = el('td'); td.appendChild(inlineWithGaps(cell, ctx, qmap, opts)); trr.appendChild(td);
          });
          body.appendChild(trr);
        });
        tb.appendChild(body); wrapT.appendChild(tb); box.appendChild(wrapT); return;
      }
      if (b.t === 'svg') {
        box.appendChild(el('figure', { class: 'figure', html: b.svg }));
      }
    });
    return box;
  }

  /* ------------------------------------------------------------- question */
  function optionRow(ctx, q, opt, kind) {
    var key = keyOf(q);
    var multi = kind === 'mcq-multi';
    var id = 'o_' + key + '_' + opt.k;
    var input = el('input', {
      type: multi ? 'checkbox' : 'radio', name: 'q_' + key, id: id, value: opt.k
    });
    var cur = ctx.get(key);
    if (multi) input.checked = Array.isArray(cur) && cur.indexOf(opt.k) > -1;
    else input.checked = cur === opt.k;

    var label = el('label', { class: 'opt', for: id }, [
      input, el('span', { class: 'ok', text: opt.k }), el('span', { html: md(opt.t) })
    ]);
    if (input.checked) label.classList.add('sel');

    if (ctx.review) {
      input.disabled = true;
      /* answers are single letters, arrays of letters, or whole words
         like NOT GIVEN — compare as whole strings, never character by character */
      var want = (Array.isArray(q.answer) ? q.answer : [q.answer])
        .map(function (x) { return String(x).trim().toUpperCase(); });
      if (want.indexOf(String(opt.k).trim().toUpperCase()) > -1) label.classList.add('correct');
      else if (input.checked) label.classList.add('wrong');
    } else {
      input.addEventListener('change', function () {
        if (multi) {
          var box = label.parentNode;
          var chosen = I.qsa('input:checked', box).map(function (x) { return x.value; });
          var max = I.lettersOf(q.answer).length;
          if (chosen.length > max) { input.checked = false; return; }
          ctx.set(key, chosen);
        } else {
          ctx.set(key, opt.k);
        }
        I.qsa('.opt', label.parentNode).forEach(function (l) {
          l.classList.toggle('sel', I.qs('input', l).checked);
        });
        ctx.focus(q.ns ? q.ns[0] : q.n);
      });
    }
    return label;
  }

  var TFNG = [{ k: 'TRUE', t: 'the statement agrees with the information' },
              { k: 'FALSE', t: 'the statement contradicts the information' },
              { k: 'NOT GIVEN', t: 'there is no information on this' }];
  var YNNG = [{ k: 'YES', t: '' }, { k: 'NO', t: '' }, { k: 'NOT GIVEN', t: '' }];

  function renderQuestion(group, q, ctx) {
    var key = keyOf(q);
    var num = q.ns ? q.ns.join(' & ') : String(q.n);
    var answered = (function () {
      var v = ctx.get(key);
      return !(v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length));
    })();

    var body = el('div', { class: 'qbody' });
    if (q.text) body.appendChild(el('p', { class: 'qtext', html: md(q.text) }));

    var kind = group.kind;
    if (kind === 'mcq' || kind === 'mcq-multi') {
      var opts = el('div', { class: 'opts' });
      (q.options || group.options || []).forEach(function (o) {
        opts.appendChild(optionRow(ctx, q, o, kind));
      });
      body.appendChild(opts);
    } else if (kind === 'tfng' || kind === 'ynng') {
      var bank = (kind === 'tfng' ? TFNG : YNNG);
      var row = el('div', { class: 'row' });
      bank.forEach(function (o) {
        row.appendChild(optionRow(ctx, q, { k: o.k, t: '' }, 'mcq'));
      });
      body.appendChild(row);
      if (ctx.review) {
        var rr = ctx.rowFor(key);
        if (rr && !rr.correct) body.appendChild(el('p', { class: 'muted', html: '<small>Correct answer: <strong>' + esc(rr.answer) + '</strong>' + (rr.evidence ? ' — ' + esc(rr.evidence) : '') + '</small>' }));
      }
    } else if (kind === 'matching' || kind === 'headings' || kind === 'label-select') {
      body.appendChild(gapInput(ctx, q, { select: group.options, mini: kind !== 'matching', noNum: true }));
    } else if (kind === 'short') {
      body.appendChild(gapInput(ctx, q, { noNum: true }));
    }

    if (ctx.review && (kind === 'mcq' || kind === 'mcq-multi' || kind === 'matching' ||
                       kind === 'headings' || kind === 'short' || kind === 'label-select')) {
      var r2 = ctx.rowFor(key);
      if (r2 && r2.evidence) body.appendChild(el('p', { class: 'muted', html: '<small>' + esc(r2.evidence) + '</small>' }));
    }

    var qEl = el('div', { class: 'q' + (answered ? ' answered' : ''), id: 'q-' + (q.ns ? q.ns[0] : q.n) }, [
      el('div', { class: 'qn', text: num }), body
    ]);
    if (!ctx.review) {
      var fb = el('button', {
        class: 'flagbtn', type: 'button', 'aria-pressed': ctx.flagged(q.ns ? q.ns[0] : q.n) ? 'true' : 'false',
        text: 'flag',
        onclick: function () {
          var on = ctx.toggleFlag(q.ns ? q.ns[0] : q.n);
          fb.setAttribute('aria-pressed', on ? 'true' : 'false');
        }
      });
      body.appendChild(el('div', { class: 'row', style: 'margin-top:.35rem' }, [fb]));
    }
    return qEl;
  }

  /* ---------------------------------------------------------------- group */
  function renderGroup(group, ctx) {
    var wrap = el('div', { class: 'qgroup' });
    if (group.title) wrap.appendChild(el('h3', { text: group.title }));
    if (group.instructions) {
      var ins = el('div', { class: 'instr', html: md(group.instructions) });
      if (group.limitText) ins.appendChild(el('div', { class: 'limit', text: group.limitText }));
      wrap.appendChild(ins);
    }
    var hasBankText = group.options && group.options.some(function (o) { return o.t || o.short; });
    if (hasBankText && (group.kind === 'matching' || group.kind === 'headings' ||
                        group.kind === 'label-select' || group.kind === 'gap-bank' || group.bankVisible)) {
      var bank = el('div', { class: 'optbank' }, [el('h4', { text: group.optionsTitle || 'List of options' })]);
      var ul = el('ul');
      group.options.forEach(function (o) {
        ul.appendChild(el('li', {}, [el('b', { text: o.k }), el('span', { html: md(o.t || o.short || '') })]));
      });
      bank.appendChild(ul); wrap.appendChild(bank);
    }
    if (group.svg) {
      wrap.appendChild(el('figure', { class: 'figure', html: group.svg +
        (group.svgCaption ? '<figcaption>' + esc(group.svgCaption) + '</figcaption>' : '') }));
    }
    if (group.figure) wrap.appendChild(chart(group.figure));

    var qmap = {};
    (group.questions || []).forEach(function (q) { qmap[String(q.n)] = q; });

    if (group.blocks && group.blocks.length) {
      wrap.appendChild(renderBlocks(group.blocks, ctx, qmap,
        (group.kind === 'label-select' || group.kind === 'gap-bank')
          ? { select: group.options, mini: true } : {}));
    }
    if (group.kind !== 'gap' && group.kind !== 'gap-bank' && group.kind !== 'label') {
      (group.questions || []).forEach(function (q) { wrap.appendChild(renderQuestion(group, q, ctx)); });
    }
    if (group.after) wrap.appendChild(el('p', { class: 'muted', html: md(group.after) }));
    return wrap;
  }

  /* -------------------------------------------------------------- passage */
  function renderPassage(sec) {
    var box = el('div', { class: 'passage' });
    if (sec.overTitle) box.appendChild(el('p', { class: 'psub', text: sec.overTitle }));
    if (sec.title) box.appendChild(el('h2', { class: 'ptitle', html: md(sec.title) }));
    if (sec.subtitle) box.appendChild(el('p', { class: 'psub', html: md(sec.subtitle) }));
    (sec.paras || []).forEach(function (p) {
      if (p.t === 'h') { box.appendChild(el('h3', { html: md(p.text) })); return; }
      if (p.t === 'svg') { box.appendChild(el('figure', { class: 'figure', html: p.svg })); return; }
      if (p.t === 'table') {
        var wrapT = el('div', { class: 'tablewrap' }), tb = el('table', { class: 'gt' });
        if (p.head) {
          var tr = el('tr');
          p.head.forEach(function (h) { tr.appendChild(el('th', { html: md(h) })); });
          tb.appendChild(el('thead', {}, [tr]));
        }
        var tbody = el('tbody');
        (p.rows || []).forEach(function (r) {
          var trr = el('tr');
          r.forEach(function (c) { trr.appendChild(el('td', { html: md(c) })); });
          tbody.appendChild(trr);
        });
        tb.appendChild(tbody); wrapT.appendChild(tb); box.appendChild(wrapT); return;
      }
      if (p.t === 'ul') {
        var ul = el('ul');
        (p.items || []).forEach(function (i2) { ul.appendChild(el('li', { html: md(i2) })); });
        box.appendChild(ul); return;
      }
      var para = el('p');
      if (p.label) para.appendChild(el('span', { class: 'plabel', text: p.label }));
      para.appendChild(el('span', { html: md(p.text) }));
      box.appendChild(para);
    });
    return box;
  }

  /* ----------------------------------------------------------- svg charts */
  var PAL = ['#4a7dfc', '#f0913c', '#2fa87a', '#c264c8', '#3fb6cf', '#ef6b6b'];

  function niceMax(v) {
    if (v <= 0) return 10;
    var mag = Math.pow(10, Math.floor(Math.log10(v)));
    var n = v / mag;
    var step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return step * mag;
  }

  function chart(fig) {
    if (fig.kind === 'svg') {
      return el('figure', { class: 'figure', html: fig.svg +
        (fig.caption ? '<figcaption>' + esc(fig.caption) + '</figcaption>' : '') });
    }
    if (fig.kind === 'table') {
      var wrapT = el('div', { class: 'tablewrap' }), tb = el('table', { class: 'gt' });
      var tr = el('tr');
      (fig.head || []).forEach(function (h) { tr.appendChild(el('th', { html: md(h) })); });
      tb.appendChild(el('thead', {}, [tr]));
      var tbody = el('tbody');
      (fig.rows || []).forEach(function (r) {
        var trr = el('tr');
        r.forEach(function (c) { trr.appendChild(el('td', { html: md(c) })); });
        tbody.appendChild(trr);
      });
      tb.appendChild(tbody); wrapT.appendChild(tb);
      var f0 = el('figure', { class: 'figure' });
      if (fig.title) f0.appendChild(el('h4', { class: 'center', text: fig.title }));
      f0.appendChild(wrapT);
      if (fig.caption) f0.appendChild(el('figcaption', { text: fig.caption }));
      return f0;
    }
    if (fig.kind === 'pie') return pies(fig);
    return axes(fig);
  }

  function svgOpen(w2, h2) {
    return '<svg viewBox="0 0 ' + w2 + ' ' + h2 + '" width="' + w2 + '" role="img" ' +
      'style="color:var(--ink-2);font-size:12px" xmlns="http://www.w3.org/2000/svg">';
  }

  function axes(fig) {
    var W = 660, H = 400, L = 62, R = 18, T = fig.title ? 46 : 22, B = 78;
    var cats = fig.categories || [], series = fig.series || [];
    var maxV = 0;
    series.forEach(function (s) { s.values.forEach(function (v) { if (v > maxV) maxV = v; }); });
    var top = fig.max || niceMax(maxV * 1.08);
    var pw = W - L - R, ph = H - T - B;
    var s = svgOpen(W, H);
    if (fig.title) s += '<text x="' + (W / 2) + '" y="24" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">' + esc(fig.title) + '</text>';

    /* y gridlines */
    var steps = 5;
    for (var i = 0; i <= steps; i++) {
      var val = top * i / steps, y = T + ph - ph * i / steps;
      s += '<line x1="' + L + '" y1="' + y.toFixed(1) + '" x2="' + (L + pw) + '" y2="' + y.toFixed(1) +
           '" stroke="currentColor" stroke-opacity=".18"/>';
      s += '<text x="' + (L - 8) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end" fill="currentColor" fill-opacity=".75">' +
           (Math.round(val * 100) / 100) + '</text>';
    }
    s += '<line x1="' + L + '" y1="' + T + '" x2="' + L + '" y2="' + (T + ph) + '" stroke="currentColor" stroke-opacity=".55"/>';
    s += '<line x1="' + L + '" y1="' + (T + ph) + '" x2="' + (L + pw) + '" y2="' + (T + ph) + '" stroke="currentColor" stroke-opacity=".55"/>';
    if (fig.yTitle) s += '<text transform="translate(14,' + (T + ph / 2) + ') rotate(-90)" text-anchor="middle" fill="currentColor" font-size="12">' + esc(fig.yTitle) + '</text>';
    if (fig.xTitle) s += '<text x="' + (L + pw / 2) + '" y="' + (H - 26) + '" text-anchor="middle" fill="currentColor" font-size="12">' + esc(fig.xTitle) + '</text>';

    var n = cats.length, slot = pw / Math.max(1, n);
    /* x labels */
    cats.forEach(function (c, i2) {
      var x = fig.kind === 'line' ? L + (n === 1 ? pw / 2 : pw * i2 / (n - 1)) : L + slot * (i2 + 0.5);
      s += '<text x="' + x.toFixed(1) + '" y="' + (T + ph + 18) + '" text-anchor="middle" fill="currentColor" fill-opacity=".85">' + esc(c) + '</text>';
    });

    if (fig.kind === 'bar' || fig.kind === 'group-bar') {
      var bw = slot * 0.68 / series.length;
      series.forEach(function (ser, si) {
        var col = ser.color || PAL[si % PAL.length];
        ser.values.forEach(function (v, i3) {
          var h3 = ph * (v / top);
          var x = L + slot * i3 + slot * 0.16 + bw * si;
          s += '<rect x="' + x.toFixed(1) + '" y="' + (T + ph - h3).toFixed(1) + '" width="' + bw.toFixed(1) +
               '" height="' + Math.max(0, h3).toFixed(1) + '" fill="' + col + '" rx="2"/>';
        });
      });
    } else {
      series.forEach(function (ser, si) {
        var col = ser.color || PAL[si % PAL.length];
        var pts = ser.values.map(function (v, i4) {
          var x = L + (n === 1 ? pw / 2 : pw * i4 / (n - 1));
          return [x, T + ph - ph * (v / top)];
        });
        s += '<polyline fill="none" stroke="' + col + '" stroke-width="2.4" stroke-linejoin="round" points="' +
             pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '"/>';
        pts.forEach(function (p) {
          s += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.4" fill="' + col + '"/>';
        });
      });
    }

    /* legend */
    if (series.length > 1 || series[0] && series[0].name) {
      var lx = L, ly = H - 8;
      series.forEach(function (ser, si) {
        var col = ser.color || PAL[si % PAL.length];
        s += '<rect x="' + lx + '" y="' + (ly - 9) + '" width="11" height="11" rx="2" fill="' + col + '"/>';
        s += '<text x="' + (lx + 16) + '" y="' + ly + '" fill="currentColor" fill-opacity=".85">' + esc(ser.name || '') + '</text>';
        lx += 26 + (ser.name || '').length * 6.6;
      });
    }
    s += '</svg>';
    var f = el('figure', { class: 'figure', html: s });
    if (fig.caption) f.appendChild(el('figcaption', { text: fig.caption }));
    return f;
  }

  function pies(fig) {
    var sets = fig.pies || [];
    var per = 250, W = Math.max(520, per * sets.length), H = 300;
    var s = svgOpen(W, H + (fig.title ? 20 : 0));
    var offY = fig.title ? 20 : 0;
    if (fig.title) s += '<text x="' + (W / 2) + '" y="16" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">' + esc(fig.title) + '</text>';
    sets.forEach(function (p, pi) {
      var cx = per * pi + per / 2, cy = 118 + offY, r = 74;
      var total = p.slices.reduce(function (a, b) { return a + b.value; }, 0) || 1;
      var a0 = -Math.PI / 2;
      p.slices.forEach(function (sl, si) {
        var frac = sl.value / total, a1 = a0 + frac * Math.PI * 2;
        var col = sl.color || PAL[si % PAL.length];
        var x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
        var x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
        var large = frac > 0.5 ? 1 : 0;
        if (frac >= 0.999) {
          s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + col + '"/>';
        } else {
          s += '<path d="M' + cx + ' ' + cy + ' L' + x0.toFixed(1) + ' ' + y0.toFixed(1) +
               ' A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' Z" fill="' + col +
               '" stroke="var(--panel)" stroke-width="1.5"/>';
        }
        var am = (a0 + a1) / 2, lr = r * 0.66;
        if (frac > 0.055) {
          s += '<text x="' + (cx + lr * Math.cos(am)).toFixed(1) + '" y="' + (cy + lr * Math.sin(am) + 4).toFixed(1) +
               '" text-anchor="middle" font-size="11.5" font-weight="700" fill="#fff">' + Math.round(frac * 100) + '%</text>';
        }
        a0 = a1;
      });
      s += '<text x="' + cx + '" y="' + (cy + r + 26) + '" text-anchor="middle" font-weight="700" fill="currentColor">' + esc(p.title || '') + '</text>';
    });
    /* shared legend */
    var labels = (sets[0] ? sets[0].slices : []).map(function (sl, i) { return { t: sl.label, c: sl.color || PAL[i % PAL.length] }; });
    var lx = 14, ly = H + offY - 14;
    labels.forEach(function (l) {
      s += '<rect x="' + lx + '" y="' + (ly - 9) + '" width="11" height="11" rx="2" fill="' + l.c + '"/>';
      s += '<text x="' + (lx + 16) + '" y="' + ly + '" fill="currentColor" fill-opacity=".85">' + esc(l.t) + '</text>';
      lx += 26 + l.t.length * 6.6;
    });
    s += '</svg>';
    var f = el('figure', { class: 'figure', html: s });
    if (fig.caption) f.appendChild(el('figcaption', { text: fig.caption }));
    return f;
  }

  w.Render = {
    md: md, keyOf: keyOf, group: renderGroup, passage: renderPassage,
    blocks: renderBlocks, chart: chart
  };
})(window);
