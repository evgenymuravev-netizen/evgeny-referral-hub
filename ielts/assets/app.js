/* App shell: routing, timers, listening player, writing pad, speaking coach, results. */
(function (w) {
  'use strict';
  var I = w.IELTS, R = w.Render, el = I.el, esc = I.esc, qs = I.qs, qsa = I.qsa;
  var view = qs('#view');

  var SKILLS = [
    { id: 'listening', name: 'Listening', mins: 35, qs: 40,
      note: '4 parts · 40 questions · audio plays once' },
    { id: 'reading', name: 'Reading', mins: 60, qs: 40,
      note: '3 sections · 40 questions · no extra transfer time' },
    { id: 'writing', name: 'Writing', mins: 60, qs: 2,
      note: 'Task 1 (150 words, 20 min) + Task 2 (250 words, 40 min)' },
    { id: 'speaking', name: 'Speaking', mins: 14, qs: 3,
      note: '3 parts · 11–14 min · face to face with an examiner' }
  ];

  /* Edition: the free build ships Test 1 only. Set by the bundler. */
  var EDITION = w.IELTS_EDITION === 'free' ? 'free' : 'full';
  var BUY_URL = w.IELTS_BUY_URL || '../buy.html';

  /* Per-skill minimums for the common UKVI routes. These change — the app says so. */
  var ALL4 = function (b) { return { listening: b, reading: b, writing: b, speaking: b }; };
  var ROUTES = [
    { id: '', name: 'Not sure yet — just practising', min: null },
    { id: 'student-degree', name: 'Student visa — degree level or above',
      min: ALL4(5.5), note: 'CEFR B2. Universities very often ask for 6.0–7.0, so check your offer.' },
    { id: 'student-below', name: 'Student visa — below degree level',
      min: ALL4(4), note: 'CEFR B1.' },
    { id: 'skilled-worker', name: 'Skilled Worker / Health and Care Worker',
      min: ALL4(4), note: 'CEFR B1. Some professional registers (NMC, GMC) demand far more.' },
    { id: 'talent', name: 'Global Talent / Innovator Founder',
      min: ALL4(5.5), note: 'CEFR B2.' },
    { id: 'spouse', name: 'Spouse / partner visa (A1)',
      min: { listening: 4, speaking: 4 },
      note: 'CEFR A1, Speaking and Listening only. IELTS Life Skills A1 is the cheaper, shorter route.' },
    { id: 'settlement', name: 'Settlement / citizenship (B1)',
      min: { listening: 4, speaking: 4 },
      note: 'CEFR B1, Speaking and Listening only. IELTS Life Skills B1 also satisfies this.' }
  ];
  function visaRoute() {
    var id = I.Store.pref('route');
    for (var i = 0; i < ROUTES.length; i++) if (ROUTES[i].id === id) return ROUTES[i];
    return ROUTES[0];
  }

  function mod() { return I.Store.pref('module') === 'general' ? 'general' : 'academic'; }
  function modName(m) { return (m || mod()) === 'general' ? 'General Training' : 'Academic'; }

  function sectionData(test, skill, m) {
    m = m || mod();
    if (skill === 'listening') return test.listening;
    if (skill === 'reading') return m === 'general' ? test.readingGeneral : test.readingAcademic;
    if (skill === 'writing') return m === 'general' ? test.writingGeneral : test.writingAcademic;
    if (skill === 'speaking') return test.speaking;
    return null;
  }
  /* Listening & Speaking are identical for both modules, so their keys are module-free. */
  function slot(testId, skill, m) {
    return testId + ':' + skill + (skill === 'listening' || skill === 'speaking' ? '' : ':' + (m || mod()));
  }

  /* =============================================================== router */
  function go(hash) { location.hash = hash; }
  function route() {
    stopAudio();
    clearTimer();
    var h = location.hash.replace(/^#\/?/, '');
    var seg = h.split('/').filter(Boolean);
    qs('#palette').hidden = true;
    qs('#exam-bar').hidden = true;
    qs('#topbar-mid').textContent = '';
    window.scrollTo(0, 0);
    if (!seg.length) return home();
    if (seg[0] === 'guide') return guide();
    if (seg[0] === 't' && seg[1]) {
      var test = w.IELTSData.get(seg[1]);
      if (!test) return home();
      var skill = seg[2] || 'overview';
      if (skill === 'results') return results(test);
      if (skill === 'listening' || skill === 'reading') return objectiveSection(test, skill);
      if (skill === 'writing') return writing(test);
      if (skill === 'speaking') return speaking(test);
      return testOverview(test);
    }
    return home();
  }

  function badge(txt) {
    var b = qs('#mod-badge');
    if (!txt) { b.hidden = true; return; }
    b.hidden = false; b.textContent = txt;
  }

  /* ================================================================= home */
  function bestFor(testId, skill, m) {
    var r = I.Store.result(slot(testId, skill, m));
    return r || null;
  }

  function home() {
    badge(modName());
    var m = mod();
    var v = el('div');

    v.appendChild(el('section', { class: 'hero' }, [
      el('h1', { text: 'IELTS for UKVI — full practice tests' }),
      el('p', { html: 'Three complete tests, each with <strong>Listening</strong>, <strong>Reading</strong>, ' +
        '<strong>Writing</strong> and <strong>Speaking</strong> — built to the same format, timings and ' +
        'question types as the real IELTS for UKVI (Academic and General Training). ' +
        'Listening and Reading are marked automatically and converted to a band score; ' +
        'Writing and Speaking come with model answers and examiner-style criteria.' }),
      el('div', { class: 'pillrow' }, [
        el('span', { class: 'pill', text: '3 tests × 80 marked questions' }),
        el('span', { class: 'pill', text: 'Academic + General Training reading & writing' }),
        el('span', { class: 'pill', text: 'Spoken audio (no downloads)' }),
        el('span', { class: 'pill', text: 'Works offline once loaded' })
      ])
    ]));

    var sw = el('div', { class: 'mode-switch' });
    [['academic', 'Academic'], ['general', 'General Training']].forEach(function (p) {
      sw.appendChild(el('button', {
        type: 'button', text: p[1], 'aria-pressed': m === p[0] ? 'true' : 'false',
        onclick: function () { I.Store.pref('module', p[0]); route(); }
      }));
    });
    v.appendChild(el('div', { class: 'card spread' }, [
      el('div', {}, [
        el('h3', { text: 'Which test are you taking?' }),
        el('p', { class: 'muted', style: 'margin:0', html: m === 'general'
          ? 'General Training is the usual route for a <strong>spouse/partner, family or settlement visa</strong> and for many work routes.'
          : 'Academic is required for <strong>degree-level study</strong> and for some professional registration routes.' })
      ]),
      sw
    ]));

    /* ---- target band ---- */
    var r = visaRoute();
    var sel = el('select', { class: 'gapbox', style: 'min-width:16rem', onchange: function () {
      I.Store.pref('route', sel.value); home();
    } });
    ROUTES.forEach(function (x) {
      sel.appendChild(el('option', { value: x.id, text: x.name, selected: x.id === r.id }));
    });
    var targetCard = el('div', { class: 'card', style: 'margin-top:1rem' }, [
      el('div', { class: 'spread' }, [
        el('div', {}, [
          el('h3', { style: 'margin:0 0 .2rem', text: 'What do you actually need?' }),
          el('p', { class: 'muted', style: 'margin:0;font-size:.9rem',
            text: r.min
              ? 'Your score report will show the gap to this target, skill by skill.'
              : 'Pick your visa route and every score is measured against the band it requires.' })
        ]),
        el('div', { class: 'target-row' }, [sel])
      ])
    ]);
    if (r.min) {
      var need = el('div', { class: 'row', style: 'margin-top:.7rem' });
      SKILLS.forEach(function (s) {
        var m2 = r.min[s.id];
        need.appendChild(el('span', { class: 'pill',
          text: s.name + ': ' + (m2 ? 'Band ' + I.bandLabel(m2) : 'not tested') }));
      });
      targetCard.appendChild(need);
      targetCard.appendChild(el('p', { class: 'muted', style: 'margin:.6rem 0 0',
        html: '<small>' + esc(r.note || '') + ' Every one of these is a <strong>minimum in that ' +
        'individual skill</strong>, not an overall average — one weak skill fails the whole ' +
        'application. Requirements change: check the current Home Office guidance before you book.</small>' }));
    }
    v.appendChild(targetCard);

    var grid = el('div', { class: 'grid grid-3', style: 'margin-top:1rem' });
    w.IELTSData.list().forEach(function (t) {
      var card = el('article', { class: 'card test-card' });
      card.appendChild(el('div', {}, [
        el('h3', { text: t.name }),
        el('p', { class: 'muted', style: 'margin:.2rem 0 0;font-size:.9rem', text: t.blurb || '' })
      ]));
      var list = el('ul', { class: 'skill-list' });
      SKILLS.forEach(function (s) {
        var res = bestFor(t.id, s.id, m);
        var chip;
        if (res && typeof res.band === 'number') {
          chip = el('span', { class: 'score-chip', text: 'Band ' + I.bandLabel(res.band) });
        } else if (res && res.done) {
          chip = el('span', { class: 'score-chip', text: 'done' });
        } else {
          chip = el('span', { class: 'score-chip none', text: '—' });
        }
        list.appendChild(el('li', { class: 'skill-row' }, [
          el('span', { class: 'sk-name', text: s.name }),
          el('span', { class: 'sk-meta', text: s.mins + ' min' }),
          chip
        ]));
      });
      card.appendChild(list);
      card.appendChild(el('div', { class: 'row' }, [
        el('a', { class: 'btn', href: '#/t/' + t.id, text: 'Open test' }),
        el('a', { class: 'btn btn-ghost btn-sm', href: '#/t/' + t.id + '/results', text: 'Scores' })
      ]));
      grid.appendChild(card);
    });
    /* the free build ships Test 1 only — show what is behind the rest, honestly */
    if (EDITION === 'free') {
      [2, 3].forEach(function (n) {
        if (w.IELTSData.get('test' + n)) return;
        grid.appendChild(el('article', { class: 'card test-card', style: 'opacity:.75' }, [
          el('div', {}, [
            el('h3', { text: 'Practice Test ' + n }),
            el('p', { class: 'muted', style: 'margin:.2rem 0 0;font-size:.9rem',
              text: n === 2
                ? 'Removal quote · community farm · sleep and memory study · vertical farming.'
                : 'Holiday cottage booking · watermill museum · design project review · bird navigation.' })
          ]),
          el('ul', { class: 'skill-list' }, SKILLS.map(function (s) {
            return el('li', { class: 'skill-row' }, [
              el('span', { class: 'sk-name', text: s.name }),
              el('span', { class: 'sk-meta', text: s.mins + ' min' }),
              el('span', { class: 'score-chip none', text: 'full version' })
            ]);
          })),
          el('a', { class: 'btn btn-ghost', href: BUY_URL, text: 'Get all three tests' })
        ]));
      });
    }
    v.appendChild(grid);

    v.appendChild(el('div', { class: 'grid grid-2', style: 'margin-top:1rem' }, [
      el('div', { class: 'card' }, [
        el('h3', { text: 'What "for UKVI" actually changes' }),
        el('p', { html: 'Nothing in the paper. IELTS for UKVI has <strong>identical content, format, ' +
          'timing, marking and band scores</strong> to standard IELTS. The differences are administrative: ' +
          'it is a Home Office approved Secure English Language Test (SELT), it can only be taken at an ' +
          'approved UKVI test centre, the session is video-recorded, and the Test Report Form carries a ' +
          'UKVI number the Home Office can verify.' }),
        el('p', { class: 'muted', style: 'margin:0', html: 'Practising on ordinary IELTS material is therefore ' +
          'exactly the right preparation — as long as you book the <em>UKVI</em> version on test day.' })
      ]),
      el('div', { class: 'card' }, [
        el('h3', { text: 'Suggested way to use this' }),
        el('ol', { style: 'margin:0;padding-left:1.15rem' }, [
          el('li', { html: 'Take <strong>Test 1</strong> cold, one skill per day, to find your baseline.' }),
          el('li', { html: 'Study the review screen — every answer has the line of text or transcript it came from.' }),
          el('li', { html: 'Take <strong>Test 2</strong> under full exam timing, Listening → Reading → Writing back to back.' }),
          el('li', { html: 'Save <strong>Test 3</strong> for the week before your real test as a full dress rehearsal.' })
        ]),
        el('p', { class: 'muted', style: 'margin:.7rem 0 0', text: 'Your answers and band scores are stored in this browser only.' })
      ])
    ]));

    v.appendChild(el('div', { class: 'card', style: 'margin-top:1rem' }, [
      el('div', { class: 'spread' }, [
        el('h3', { style: 'margin:0', text: 'Band requirements for common UK visa routes' }),
        el('a', { class: 'btn btn-ghost btn-sm', href: '#/guide', text: 'Full guide' })
      ]),
      reqTable()
    ]));

    /* The single-file build is itself an offline copy, so it does not offer one. */
    if (location.protocol !== 'file:') {
      v.appendChild(el('div', { class: 'card spread', style: 'margin-top:1rem' }, [
        el('div', {}, [
          el('h3', { style: 'margin:0 0 .2rem', text: 'Take it offline' }),
          el('p', { class: 'muted', style: 'margin:0;font-size:.9rem',
            html: 'One HTML file containing all three tests. Save it to a laptop, tablet or phone ' +
              'and open it with no connection — useful on the train, and it still works if this ' +
              'site ever disappears.' })
        ]),
        EDITION === 'free'
          ? el('a', { class: 'btn', href: BUY_URL, text: 'Get the offline file' })
          : el('a', { class: 'btn', href: './ielts-ukvi-practice-suite.html',
              download: 'ielts-ukvi-practice-suite.html', text: '↓ Download (single file)' })
      ]));
    } else {
      v.appendChild(el('div', { class: 'callout', style: 'margin-top:1rem' }, [
        el('h4', { text: 'Offline copy' }),
        el('p', { style: 'margin:0', html: 'Everything runs from this single file with no ' +
          'connection. Scores are saved in this browser as usual, though a few browsers — and any ' +
          'private window — will not keep them, so note your band down if it matters. ' +
          'For the Listening audio you need a browser with speech voices: Chrome or Edge on ' +
          'Windows, Safari on Mac or iPhone, Chrome on Android.' })
      ]));
    }

    var anyResults = Object.keys(I.Store.results()).length;
    if (anyResults) {
      v.appendChild(el('div', { class: 'card', style: 'margin-top:1rem' }, [
        el('div', { class: 'spread' }, [
          el('span', { class: 'muted', text: 'Stored attempts: ' + anyResults }),
          el('button', {
            class: 'btn btn-quiet btn-sm', type: 'button', text: 'Reset all progress',
            onclick: function () {
              confirmModal('Reset everything?', 'This deletes every saved answer and band score in this browser.', function () {
                I.Store.clear(); route();
              });
            }
          })
        ])
      ]));
    }
    view.innerHTML = ''; view.appendChild(v);
  }

  function reqTable() {
    var rows = [
      ['Student visa — degree level and above', 'Academic or General Training*', 'CEFR B2 — <strong>5.5</strong> in every skill (institutions often ask for more)'],
      ['Student visa — below degree level', 'Academic or General Training*', 'CEFR B1 — <strong>4.0</strong> in every skill'],
      ['Skilled Worker / Health & Care Worker', 'Academic or General Training', 'CEFR B1 — <strong>4.0</strong> in every skill'],
      ['Spouse / partner (initial + extension)', 'IELTS Life Skills A1 / General Training', 'CEFR A1 — <strong>4.0</strong> in Speaking & Listening'],
      ['Indefinite leave to remain / citizenship', 'IELTS Life Skills B1 / General Training', 'CEFR B1 — <strong>4.0</strong> in Speaking & Listening'],
      ['Global Talent, Innovator Founder', 'Academic or General Training', 'CEFR B2 — <strong>5.5</strong> in every skill']
    ];
    var t = el('table', { class: 'gt' });
    t.appendChild(el('thead', {}, [el('tr', {}, [
      el('th', { text: 'Route' }), el('th', { text: 'Test usually taken' }), el('th', { text: 'Minimum level' })
    ])]));
    var tb = el('tbody');
    rows.forEach(function (r) {
      tb.appendChild(el('tr', {}, [el('td', { html: r[0] }), el('td', { html: r[1] }), el('td', { html: r[2] })]));
    });
    t.appendChild(tb);
    var wrapT = el('div', { class: 'tablewrap' }, [t]);
    var box = el('div', {}, [wrapT, el('p', {
      class: 'muted', style: 'margin:.6rem 0 0',
      html: '<small>* Degree-level students at a Higher Education Provider with a track record of compliance are often ' +
        'assessed by the university itself. Requirements change — always check the current Home Office guidance and your ' +
        'sponsor\'s own rules before you book.</small>'
    })]);
    return box;
  }

  function guide() {
    badge(null);
    var v = el('div', { class: 'wrap-narrow' });
    v.appendChild(el('p', {}, [el('a', { href: '#/', text: '← All tests' })]));
    v.appendChild(el('h1', { text: 'IELTS for UKVI — the test in detail' }));

    function sec(title, kids) { return el('div', { class: 'card' }, [el('h2', { text: title })].concat(kids)); }

    v.appendChild(sec('Format on the day', [
      el('p', { html: 'Listening, Reading and Writing are taken in one sitting with <strong>no breaks</strong> — ' +
        '2 hours 40 minutes in total. Speaking is a face-to-face interview with a certified examiner, usually on the ' +
        'same day, sometimes up to seven days either side.' }),
      (function () {
        var t = el('table', { class: 'gt' });
        t.appendChild(el('thead', {}, [el('tr', {}, [
          el('th', { text: 'Part' }), el('th', { text: 'Time' }), el('th', { text: 'What you do' })])]));
        var tb = el('tbody');
        [['Listening', '30 min + transfer', '4 recordings, 40 questions. Paper: 10 extra minutes to copy answers onto the answer sheet. Computer: 2 minutes to check.'],
         ['Reading', '60 min', '3 sections, 40 questions. No extra time — write answers as you go.'],
         ['Writing', '60 min', 'Task 1 (min. 150 words) then Task 2 (min. 250 words). Task 2 is worth twice as much.'],
         ['Speaking', '11–14 min', 'Part 1 interview (4–5 min), Part 2 long turn (3–4 min), Part 3 discussion (4–5 min).']
        ].forEach(function (r) {
          tb.appendChild(el('tr', {}, r.map(function (c) { return el('td', { html: c }); })));
        });
        t.appendChild(tb); return el('div', { class: 'tablewrap' }, [t]);
      })()
    ]));

    v.appendChild(sec('Academic vs General Training', [
      el('p', { html: '<strong>Listening and Speaking are exactly the same.</strong> Only Reading and Writing differ.' }),
      el('ul', {}, [
        el('li', { html: '<strong>Academic Reading</strong> — three long passages from journals, books and newspapers, ' +
          'increasing in difficulty, written for a non-specialist reader.' }),
        el('li', { html: '<strong>General Training Reading</strong> — Section 1: two or more short everyday texts ' +
          '(notices, timetables, adverts). Section 2: two work-related texts (contracts, staff handbooks, training). ' +
          'Section 3: one longer text of general interest.' }),
        el('li', { html: '<strong>Academic Writing Task 1</strong> — describe a graph, table, chart, map or process ' +
          'in your own words. No opinions, no reasons — just what the data shows.' }),
        el('li', { html: '<strong>General Training Writing Task 1</strong> — a letter (formal, semi-formal or ' +
          'personal). Cover all three bullet points and match the tone to the reader.' }),
        el('li', { html: '<strong>Task 2 is an essay in both modules</strong> — the General Training prompt is ' +
          'usually a little more concrete, and it is marked to the same band descriptors.' })
      ]),
      el('p', { class: 'muted', html: 'Note the different marking curves: General Training Reading needs more correct ' +
        'answers for the same band. 30/40 is Band 7 in Academic Reading but only Band 6 in General Training.' })
    ]));

    v.appendChild(sec('How the bands are worked out', [
      el('p', { html: 'Listening and Reading are marked out of 40 and converted with a fixed table. ' +
        'Writing and Speaking are marked by an examiner against four equally-weighted criteria.' }),
      el('div', { class: 'grid grid-2' }, [
        el('div', {}, [el('h4', { text: 'Writing criteria' }), el('ul', {}, [
          el('li', { html: 'Task Achievement (T1) / Task Response (T2)' }),
          el('li', { html: 'Coherence and Cohesion' }),
          el('li', { html: 'Lexical Resource' }),
          el('li', { html: 'Grammatical Range and Accuracy' })])]),
        el('div', {}, [el('h4', { text: 'Speaking criteria' }), el('ul', {}, [
          el('li', { html: 'Fluency and Coherence' }),
          el('li', { html: 'Lexical Resource' }),
          el('li', { html: 'Grammatical Range and Accuracy' }),
          el('li', { html: 'Pronunciation' })])])
      ]),
      el('p', { html: 'The overall band is the mean of the four skills, rounded to the nearest half band ' +
        '(a .25 average rounds up to the next half, a .75 average rounds up to the next whole band).' }),
      bandTableEl()
    ]));

    v.appendChild(sec('Rules that cost people marks', [
      el('ul', {}, [
        el('li', { html: '<strong>Word limits are absolute.</strong> "NO MORE THAN TWO WORDS" means three words scores ' +
          'zero even if the meaning is right. Hyphenated words count as one; a number counts as one word.' }),
        el('li', { html: '<strong>Spelling counts</strong> in Listening and Reading. British and American spellings ' +
          'are both accepted.' }),
        el('li', { html: '<strong>Copy exactly</strong> from the text for completion tasks — do not change the form of the word.' }),
        el('li', { html: '<strong>NOT GIVEN ≠ FALSE.</strong> FALSE means the text says the opposite; NOT GIVEN means ' +
          'the text is silent on it.' }),
        el('li', { html: '<strong>Never leave a blank.</strong> There is no penalty for a wrong answer.' }),
        el('li', { html: '<strong>Under-length writing is penalised</strong> — under 150 / 250 words costs you marks ' +
          'under Task Achievement/Response before anything else is even considered.' })
      ])
    ]));

    v.appendChild(sec('IELTS Life Skills — a different test', [
      el('p', { html: 'For a <strong>spouse/partner visa (A1)</strong> or <strong>settlement/citizenship (B1)</strong>, ' +
        'the Home Office also accepts IELTS Life Skills, which tests only Speaking and Listening, takes 16–22 minutes ' +
        'and is graded pass/fail. It is cheaper and much shorter. This app trains the full four-skill test; the ' +
        'Speaking and Listening practice here is still directly useful for Life Skills, but the Reading and Writing ' +
        'sections go well beyond what that test requires.' })
    ]));
    view.innerHTML = ''; view.appendChild(v);
  }

  function bandTableEl() {
    var t = el('table', { class: 'gt' });
    t.appendChild(el('thead', {}, [el('tr', {}, [
      el('th', { text: 'Band' }), el('th', { text: 'Listening /40' }),
      el('th', { text: 'Academic Reading /40' }), el('th', { text: 'GT Reading /40' })])]));
    var tb = el('tbody');
    [9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5, 4.5, 4].forEach(function (b) {
      function rng(tab) {
        var rows = I.BANDS[tab];
        for (var i = 0; i < rows.length; i++) {
          if (rows[i][1] === b) {
            var hi = i === 0 ? 40 : rows[i - 1][0] - 1;
            return rows[i][0] === hi ? String(hi) : rows[i][0] + '–' + hi;
          }
        }
        return '—';
      }
      tb.appendChild(el('tr', {}, [
        el('td', { html: '<strong>' + I.bandLabel(b) + '</strong>' }),
        el('td', { text: rng('listening') }), el('td', { text: rng('academic') }), el('td', { text: rng('general') })
      ]));
    });
    t.appendChild(tb);
    return el('div', { class: 'tablewrap' }, [t]);
  }

  /* ====================================================== test overview */
  function testOverview(test) {
    badge(modName());
    var m = mod();
    var v = el('div', { class: 'wrap-narrow' });
    v.appendChild(el('p', {}, [el('a', { href: '#/', text: '← All tests' })]));
    v.appendChild(el('h1', { text: test.name }));
    v.appendChild(el('p', { class: 'dim', text: test.blurb || '' }));

    v.appendChild(el('div', { class: 'callout' }, [
      el('h4', { text: 'Full-test order' }),
      el('p', { style: 'margin:0', html: 'On the day it runs <strong>Listening → Reading → Writing</strong> with no ' +
        'break, then Speaking. Doing all three in one 2 h 40 sitting is the single most useful thing you can ' +
        'practise — stamina is what slips first.' })
    ]));

    var list = el('div', { class: 'stack', style: 'margin-top:1rem' });
    SKILLS.forEach(function (s) {
      var res = I.Store.result(slot(test.id, s.id, m));
      var prog = I.Store.progress(slot(test.id, s.id, m));
      var right = el('div', { class: 'row' });
      if (res && typeof res.band === 'number') {
        right.appendChild(el('span', { class: 'score-chip', text: 'Band ' + I.bandLabel(res.band) +
          (res.raw !== undefined ? '  ·  ' + res.raw + '/' + res.total : '') }));
      } else if (res && res.done) {
        right.appendChild(el('span', { class: 'score-chip', text: 'submitted' }));
      }
      if (prog && !res) right.appendChild(el('span', { class: 'pill', text: 'in progress' }));
      right.appendChild(el('a', {
        class: 'btn btn-sm' + (res ? ' btn-ghost' : ''), href: '#/t/' + test.id + '/' + s.id,
        text: res ? 'Retake' : 'Start'
      }));
      if (res && (s.id === 'listening' || s.id === 'reading')) {
        right.appendChild(el('a', { class: 'btn btn-sm btn-quiet', href: '#/t/' + test.id + '/results', text: 'Review' }));
      }
      list.appendChild(el('div', { class: 'card spread' }, [
        el('div', {}, [
          el('h3', { style: 'margin:0 0 .2rem', text: s.name +
            (s.id === 'reading' || s.id === 'writing' ? ' — ' + modName(m) : '') }),
          el('p', { class: 'muted', style: 'margin:0;font-size:.88rem', text: s.note })
        ]),
        right
      ]));
    });
    v.appendChild(list);
    v.appendChild(el('div', { class: 'row row-end', style: 'margin-top:1rem' }, [
      el('a', { class: 'btn btn-ghost', href: '#/t/' + test.id + '/results', text: 'Score report for this test' })
    ]));
    view.innerHTML = ''; view.appendChild(v);
  }

  /* ============================================================== timer */
  var timer = null;
  function clearTimer() { if (timer) { clearInterval(timer.h); timer = null; } qs('#exam-bar').hidden = true; }
  function startTimer(seconds, label, onEnd) {
    var bar = qs('#exam-bar');
    bar.hidden = false;
    qs('#exam-where').textContent = label;
    timer = { left: seconds, paused: false, onEnd: onEnd, h: null };
    var clock = qs('#clock-time'), box = qs('#exam-clock');
    function paint() {
      clock.textContent = I.mmss(timer.left);
      box.classList.toggle('warn', timer.left <= 600 && timer.left > 120);
      box.classList.toggle('crit', timer.left <= 120);
    }
    paint();
    timer.h = setInterval(function () {
      if (timer.paused) return;
      timer.left -= 1; paint();
      if (timer.left <= 0) { clearInterval(timer.h); var f = timer.onEnd; timer = null; if (f) f(); }
    }, 1000);
    var pb = qs('#btn-pause');
    pb.textContent = 'Pause'; pb.hidden = false;
    pb.onclick = function () {
      if (!timer) return;
      timer.paused = !timer.paused;
      pb.textContent = timer.paused ? 'Resume' : 'Pause';
      if (timer.paused) pauseAudio();
    };
    return timer;
  }

  /* ====================================================== audio (TTS) */
  var audio = { queue: [], idx: 0, playing: false, done: false, timeoutId: null, onLine: null, rate: 1 };
  function synth() { return w.speechSynthesis || null; }
  function stopAudio() {
    audio.playing = false;
    if (audio.timeoutId) { clearTimeout(audio.timeoutId); audio.timeoutId = null; }
    var s = synth(); if (s) { try { s.cancel(); } catch (e) {} }
  }
  function pauseAudio() { var s = synth(); if (s && audio.playing) { try { s.pause(); } catch (e) {} } }

  var voiceCache = null;
  function pickVoices() {
    if (voiceCache) return voiceCache;
    var s = synth(); if (!s) return (voiceCache = {});
    var all = s.getVoices() || [];
    var en = all.filter(function (v) { return /^en(-|_)/i.test(v.lang || ''); });
    var gb = en.filter(function (v) { return /GB|UK/i.test(v.lang) || /British|Daniel|Serena|Kate|Oliver|Libby|Sonia|Ryan/i.test(v.name); });
    var pool = (gb.length >= 2 ? gb : en);
    if (!pool.length) return (voiceCache = {});
    voiceCache = { pool: pool, byName: {} };
    return voiceCache;
  }
  function voiceFor(who, i) {
    var vc = pickVoices();
    if (!vc.pool) return null;
    if (vc.byName[who]) return vc.byName[who];
    var used = Object.keys(vc.byName).length;
    vc.byName[who] = vc.pool[used % vc.pool.length];
    return vc.byName[who];
  }
  /* Speech engines truncate very long utterances (a long-standing Chrome bug),
     so break the text into pieces of at most ~220 characters: on sentence
     boundaries first, then on commas, then on spaces if a sentence is still
     too long. No lookbehind — Safari had none before 16.4 and a parse error
     here would take the whole app down. */
  function chunkText(t) {
    var LIMIT = 220;
    var pieces = String(t).match(/[^.!?\u2026]+[.!?\u2026]*\s*/g) || [String(t)];
    var parts = [];
    pieces.forEach(function (s) {
      s = s.trim();
      if (!s) return;
      if (s.length <= LIMIT) { parts.push(s); return; }
      var bits = s.split(/,\s*/), buf = '';
      bits.forEach(function (bit, i) {
        var piece = bit + (i < bits.length - 1 ? ',' : '');
        if ((buf + ' ' + piece).trim().length > LIMIT && buf) { parts.push(buf.trim()); buf = piece; }
        else buf += ' ' + piece;
      });
      if (buf.trim()) parts.push(buf.trim());
    });
    /* anything still over the limit has no punctuation at all — break on spaces */
    var safe = [];
    parts.forEach(function (s) {
      while (s.length > LIMIT) {
        var cut = s.lastIndexOf(' ', LIMIT);
        if (cut < 40) cut = LIMIT;
        safe.push(s.slice(0, cut).trim());
        s = s.slice(cut).trim();
      }
      if (s) safe.push(s);
    });
    /* re-join very short neighbours so the delivery does not sound chopped */
    var out = [];
    safe.forEach(function (s) {
      if (out.length && (out[out.length - 1] + ' ' + s).length <= LIMIT) out[out.length - 1] += ' ' + s;
      else out.push(s);
    });
    return out.length ? out : [String(t)];
  }
  /* queue item: {who, text, part} or {pause: seconds, label} */
  function playQueue(items, opts) {
    opts = opts || {};
    stopAudio();
    audio.queue = items; audio.idx = 0; audio.playing = true; audio.done = false;
    audio.rate = opts.rate || 1;
    audio.onLine = opts.onLine || null;
    step(opts);
  }
  function step(opts) {
    if (!audio.playing) return;
    if (audio.idx >= audio.queue.length) {
      audio.playing = false; audio.done = true;
      if (opts.onEnd) opts.onEnd();
      return;
    }
    var it = audio.queue[audio.idx];
    if (audio.onLine) audio.onLine(it, audio.idx, audio.queue.length);
    if (it.pause) {
      audio.timeoutId = setTimeout(function () { audio.idx++; step(opts); }, it.pause * 1000 / (opts.fastPauses ? 4 : 1));
      return;
    }
    var s = synth();
    if (!s || !pickVoices().pool) {
      /* No speech engine, or no installed voices (common on bare Linux builds):
         keep the section moving at a natural reading pace of ~155 wpm. */
      var words = I.countWords(it.text);
      audio.timeoutId = setTimeout(function () { audio.idx++; step(opts); },
        Math.max(1200, words / 155 * 60000 / audio.rate));
      return;
    }
    var chunks = chunkText(it.text), ci = 0;
    function speakNext() {
      if (!audio.playing) return;
      if (ci >= chunks.length) { audio.idx++; audio.timeoutId = setTimeout(function () { step(opts); }, 350); return; }
      var u = new SpeechSynthesisUtterance(chunks[ci++]);
      var v = voiceFor(it.who || 'NARRATOR');
      if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = 'en-GB'; }
      u.rate = audio.rate * (it.who === 'NARRATOR' ? 0.98 : 1);
      u.pitch = it.pitch || 1;
      u.onend = speakNext;
      u.onerror = speakNext;
      try { s.speak(u); } catch (e) { speakNext(); }
    }
    speakNext();
  }

  /* Build the full listening queue from the test data. */
  function buildQueue(listening) {
    var q = [];
    q.push({ who: 'NARRATOR', text: 'IELTS Listening. You will hear a number of different recordings and you will ' +
      'have to answer questions on what you hear. There will be time for you to read the instructions and questions, ' +
      'and you will have a chance to check your work. All the recordings will be played once only.' });
    q.push({ pause: 4 });
    listening.parts.forEach(function (p, i) {
      q.push({ who: 'NARRATOR', text: 'Part ' + p.number + '. ' + (p.context || ''), part: p.number });
      q.push({ who: 'NARRATOR', text: 'You now have some time to look at questions ' + p.range + '.', part: p.number });
      q.push({ pause: p.readTime || 25, part: p.number });
      q.push({ who: 'NARRATOR', text: 'Now listen carefully and answer questions ' + p.range + '.', part: p.number });
      (p.transcript || []).forEach(function (line) {
        if (line.pause) q.push({ pause: line.pause, part: p.number });
        else q.push({ who: line.who, text: line.text, part: p.number });
      });
      if (i < listening.parts.length - 1) {
        q.push({ who: 'NARRATOR', text: 'That is the end of Part ' + p.number +
          '. You now have half a minute to check your answers.', part: p.number });
        q.push({ pause: 30, part: p.number });
      }
    });
    q.push({ who: 'NARRATOR', text: 'That is the end of the Listening test. You now have some time to check your answers.' });
    return q;
  }

  /* ============================================ objective section runner */
  var S = null;   /* live section state */

  function objectiveSection(test, skill) {
    var m = mod();
    var data = sectionData(test, skill, m);
    if (!data) { go('#/t/' + test.id); return; }
    var key = slot(test.id, skill, m);
    var saved = I.Store.progress(key);

    S = {
      test: test, skill: skill, module: m, data: data, key: key,
      answers: (saved && saved.answers) || {}, flags: (saved && saved.flags) || {},
      current: null, submitted: false, review: false, rowMap: {}
    };

    badge(skill === 'reading' ? modName(m) : null);
    qs('#topbar-mid').textContent = test.name + ' · ' + (skill === 'listening' ? 'Listening' : 'Reading — ' + modName(m));

    if (skill === 'listening') return listeningIntro();
    return renderReading();
  }

  function persist() {
    if (!S || S.submitted) return;
    I.Store.progress(S.key, { answers: S.answers, flags: S.flags, at: Date.now() });
  }

  function makeCtx() {
    return {
      review: S.review,
      get: function (k) { return S.answers[k]; },
      set: function (k, v) { S.answers[k] = v; persist(); paintPalette(); markAnswered(); },
      focus: function (n) { S.current = n; paintPalette(); },
      flagged: function (n) { return !!S.flags[n]; },
      toggleFlag: function (n) { S.flags[n] = !S.flags[n]; persist(); paintPalette(); return S.flags[n]; },
      rowFor: function (k) { return S.rowMap[k]; }
    };
  }

  function numToKey(data) {
    var map = {};
    I.eachQuestion(data, function (q) {
      var k = R.keyOf(q);
      (q.ns || [q.n]).forEach(function (n) { map[n] = k; });
    });
    return map;
  }

  function paintPalette() {
    if (!S) return;
    var box = qs('#palette-parts');
    if (!box.dataset.built) return;
    var map = numToKey(S.data);
    qsa('.pnum', box).forEach(function (b) {
      var n = +b.dataset.n, k = map[n];
      var v = S.answers[k];
      var has = !(v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length));
      b.classList.toggle('done', has);
      b.classList.toggle('flag', !!S.flags[n]);
      b.classList.toggle('cur', S.current === n);
    });
  }
  function markAnswered() {
    qsa('.q').forEach(function (node) {
      var n = +node.id.replace('q-', '');
      var map = numToKey(S.data), k = map[n];
      var v = S.answers[k];
      var has = !(v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length));
      node.classList.toggle('answered', has);
    });
  }

  function buildPalette(data) {
    var box = qs('#palette-parts');
    box.innerHTML = '';
    (data.parts || data.sections || []).forEach(function (part) {
      var g = el('div', { class: 'pgroup' }, [
        el('span', { text: part.paletteLabel || ((data.parts ? 'Part ' : 'Sec ') + part.number) })
      ]);
      var ns = [];
      (part.groups || []).forEach(function (grp) {
        (grp.questions || []).forEach(function (q) { ns = ns.concat(q.ns || [q.n]); });
      });
      ns.forEach(function (n) {
        g.appendChild(el('button', {
          class: 'pnum', type: 'button', 'data-n': n, text: String(n),
          onclick: function () {
            var t = qs('#q-' + n) || qs('[data-key="' + n + '"]');
            if (!t) {
              /* gap-fill inputs live inside notes blocks */
              t = qsa('.gapnum').filter(function (x) { return x.textContent === String(n); })[0];
            }
            if (t) {
              t.scrollIntoView({ behavior: 'smooth', block: 'center' });
              var input = /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName) ? t
                : (t.classList && t.classList.contains('gapnum') ? t.nextSibling : qs('input,select,textarea', t));
              if (input && input.focus) setTimeout(function () { input.focus(); }, 320);
              qsa('.q.target').forEach(function (x) { x.classList.remove('target'); });
              if (t.classList && t.classList.contains('q')) t.classList.add('target');
            }
            S.current = n; paintPalette();
          }
        }));
      });
      box.appendChild(g);
    });
    box.dataset.built = '1';
    qs('#palette').hidden = false;
    paintPalette();
  }

  /* ------------------------------------------------------------ reading */
  function renderReading() {
    var ctx = makeCtx();
    var v = el('div');
    var head = el('div', { class: 'card spread', style: 'margin-bottom:1rem' }, [
      el('div', {}, [
        el('h2', { style: 'margin:0 0 .2rem', text: 'Reading — ' + modName(S.module) }),
        el('p', { class: 'muted', style: 'margin:0;font-size:.9rem',
          text: '3 sections · 40 questions · 60 minutes. There is no extra time to transfer answers.' })
      ]),
      el('button', { class: 'btn', type: 'button', text: 'Start the 60-minute clock', onclick: function () {
        startTimer(60 * 60, S.test.name + ' · Reading (' + modName(S.module) + ')', function () { submitObjective(true); });
        this.disabled = true; this.textContent = 'Clock running';
      } })
    ]);
    v.appendChild(head);

    var tabs = el('div', { class: 'row', id: 'sec-tabs', style: 'margin-bottom:.8rem' });
    var panes = el('div');
    (S.data.sections || []).forEach(function (sec, i) {
      var pane = el('div', { class: 'exam-grid split', id: 'sec-' + i, hidden: i !== 0 });
      pane.appendChild(el('div', { class: 'pane' }, [R.passage(sec)]));
      var right = el('div', { class: 'pane' });
      right.appendChild(el('h2', { text: sec.heading || ('Questions — Section ' + sec.number) }));
      (sec.groups || []).forEach(function (g) { right.appendChild(R.group(g, ctx)); });
      pane.appendChild(right);
      panes.appendChild(pane);

      tabs.appendChild(el('button', {
        class: 'btn btn-sm' + (i === 0 ? '' : ' btn-ghost'), type: 'button',
        text: sec.tabLabel || ((S.module === 'general' ? 'Section ' : 'Passage ') + sec.number),
        onclick: function () {
          qsa('[id^="sec-"]', panes).forEach(function (p, j) { p.hidden = j !== i; });
          qsa('button', tabs).forEach(function (b, j) {
            b.className = 'btn btn-sm' + (j === i ? '' : ' btn-ghost');
          });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }));
    });
    v.appendChild(tabs); v.appendChild(panes);
    v.appendChild(el('div', { class: 'row row-end', style: 'margin-top:1.2rem' }, [
      el('button', { class: 'btn btn-lg', type: 'button', text: 'Submit reading answers',
        onclick: function () { submitObjective(false); } })
    ]));
    view.innerHTML = ''; view.appendChild(v);
    buildPalette(S.data);
    qs('#btn-finish').onclick = function () { submitObjective(false); };
  }

  /* ---------------------------------------------------------- listening */
  function listeningIntro() {
    var v = el('div', { class: 'wrap-narrow' });
    v.appendChild(el('p', {}, [el('a', { href: '#/t/' + S.test.id, text: '← ' + S.test.name })]));
    v.appendChild(el('h1', { text: 'Listening' }));
    v.appendChild(el('div', { class: 'card' }, [
      el('p', { html: 'Four recordings, 40 questions, about 30 minutes. In the real test the audio plays ' +
        '<strong>once only</strong> and you answer as you listen.' }),
      el('p', { html: 'The audio here is generated by your browser\'s speech engine, so no files have to be ' +
        'downloaded. <strong>Use headphones</strong> and check the volume before you start. ' +
        'If you hear nothing at all, your browser may have no speech voices installed — the section will still run ' +
        'to time and you can read the script afterwards.' }),
      el('div', { class: 'callout warn' }, [
        el('h4', { text: 'Choose how strict to be' }),
        el('p', { style: 'margin:0', html: '<strong>Exam mode</strong> plays straight through, once, with the real ' +
          'pauses, and you cannot see the script until you submit. <strong>Practice mode</strong> lets you pause, ' +
          'replay, and shortens the built-in silences.' })
      ]),
      el('div', { class: 'row', style: 'margin-top:1rem' }, [
        el('button', { class: 'btn btn-lg', type: 'button', text: 'Start in exam mode',
          onclick: function () { renderListening(false); } }),
        el('button', { class: 'btn btn-lg btn-ghost', type: 'button', text: 'Practice mode',
          onclick: function () { renderListening(true); } })
      ])
    ]));
    view.innerHTML = ''; view.appendChild(v);
  }

  function renderListening(practice) {
    S.practice = !!practice;
    var ctx = makeCtx();
    var v = el('div');

    var stateTxt = el('div', { class: 'pl-state', text: 'Ready' });
    var bar = el('i');
    var live = el('div', { class: 'pl-live' }, [el('b', { text: 'now playing' }), el('span', { text: '—' })]);
    var playBtn = el('button', { class: 'btn', type: 'button', text: '▶ Play the recording' });
    var pauseBtn = el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'Pause', disabled: true });
    var rateSel = el('select', { class: 'gapbox', style: 'min-width:6rem' });
    [['0.85', 'Slower'], ['1', 'Normal'], ['1.15', 'Faster']].forEach(function (o) {
      rateSel.appendChild(el('option', { value: o[0], text: o[1], selected: o[0] === '1' }));
    });

    var player = el('div', { class: 'player' }, [
      el('div', { class: 'pl-top' }, [playBtn, pauseBtn, stateTxt,
        practice ? el('label', { class: 'row', style: 'gap:.35rem;font-size:.82rem' }, [
          el('span', { class: 'muted', text: 'Speed' }), rateSel]) : null]),
      el('div', { class: 'pl-bar' }, [bar]),
      live,
      el('div', { class: 'pl-note', text: practice
        ? 'Practice mode — pauses are shortened and you can replay. The script unlocks after you submit.'
        : 'Exam mode — the recording plays once, straight through, with real pauses.' }),
      (!synth() || !pickVoices().pool)
        ? el('div', { class: 'pl-note', style: 'color:var(--warn)',
            text: 'No speech voices are installed in this browser, so there will be no sound. ' +
                  'The recording will still run to time and each line appears above as it plays — ' +
                  'usable as reading practice, but for real listening practice try Chrome or Edge on ' +
                  'Windows, or Safari on a Mac or iPhone.' })
        : null
    ]);
    v.appendChild(el('div', { class: 'card' }, [player]));

    var queue = buildQueue(S.data);
    var started = false;
    function startPlay() {
      if (started && !practice) return;
      started = true;
      playBtn.disabled = !practice;
      playBtn.textContent = practice ? '▶ Restart' : 'Playing…';
      pauseBtn.disabled = false;
      if (!timer) {
        startTimer(practice ? 60 * 60 : 35 * 60, S.test.name + ' · Listening', function () { submitObjective(true); });
      }
      playQueue(queue, {
        rate: parseFloat(rateSel.value) || 1,
        fastPauses: practice,
        onLine: function (it, i, n) {
          bar.style.width = Math.round((i / n) * 100) + '%';
          if (it.pause) {
            stateTxt.textContent = 'Pause — check your answers';
            qs('span', live).textContent = '…';
          } else {
            stateTxt.textContent = (it.part ? 'Part ' + it.part : 'Introduction');
            qs('span', live).textContent = (it.who && it.who !== 'NARRATOR' ? it.who + ': ' : '') + it.text;
          }
          if (it.part && it.part !== S.curPart) {
            S.curPart = it.part;
            var tabBtn = qs('#lpart-' + it.part);
            if (tabBtn) tabBtn.click();
          }
        },
        onEnd: function () {
          stateTxt.textContent = 'Recording finished';
          bar.style.width = '100%';
          qs('span', live).textContent = 'End of the Listening test.';
          pauseBtn.disabled = true;
          if (practice) { playBtn.disabled = false; playBtn.textContent = '▶ Play again'; }
        }
      });
    }
    playBtn.onclick = startPlay;
    pauseBtn.onclick = function () {
      var s = synth(); if (!s) return;
      if (s.paused) { s.resume(); pauseBtn.textContent = 'Pause'; }
      else { s.pause(); pauseBtn.textContent = 'Resume'; }
    };

    var tabs = el('div', { class: 'row', style: 'margin:1rem 0 .8rem' });
    var panes = el('div');
    (S.data.parts || []).forEach(function (part, i) {
      var pane = el('div', { class: 'pane', id: 'lp-' + part.number, hidden: i !== 0 });
      pane.appendChild(el('h2', { text: 'Part ' + part.number + ' — Questions ' + part.range }));
      if (part.blurb) pane.appendChild(el('p', { class: 'muted', html: R.md(part.blurb) }));
      (part.groups || []).forEach(function (g) { pane.appendChild(R.group(g, ctx)); });
      panes.appendChild(pane);
      tabs.appendChild(el('button', {
        class: 'btn btn-sm' + (i === 0 ? '' : ' btn-ghost'), type: 'button', id: 'lpart-' + part.number,
        text: 'Part ' + part.number,
        onclick: function () {
          qsa('.pane[id^="lp-"]', panes).forEach(function (p, j) { p.hidden = j !== i; });
          qsa('button', tabs).forEach(function (b, j) { b.className = 'btn btn-sm' + (j === i ? '' : ' btn-ghost'); });
        }
      }));
    });
    v.appendChild(tabs); v.appendChild(panes);
    v.appendChild(el('div', { class: 'row row-end', style: 'margin-top:1.2rem' }, [
      el('button', { class: 'btn btn-lg', type: 'button', text: 'Submit listening answers',
        onclick: function () { submitObjective(false); } })
    ]));
    view.innerHTML = ''; view.appendChild(v);
    buildPalette(S.data);
    qs('#btn-finish').onclick = function () { submitObjective(false); };
  }

  /* -------------------------------------------------------- submission */
  function submitObjective(auto) {
    if (!S || S.submitted) return;
    var total = I.countQuestions(S.data);
    var answered = Object.keys(S.answers).filter(function (k) {
      var v = S.answers[k];
      return !(v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length));
    }).length;
    var missing = total - answered;
    function finish() {
      stopAudio(); clearTimer();
      S.submitted = true;
      var res = I.scoreSection(S.data, S.answers);
      var table = S.skill === 'listening' ? 'listening' : (S.module === 'general' ? 'general' : 'academic');
      var band = I.rawToBand(table, res.raw);
      I.Store.result(S.key, {
        skill: S.skill, module: S.module, raw: res.raw, total: res.total, band: band,
        answers: S.answers, at: Date.now(), done: true
      });
      I.Store.progress(S.key, null);
      go('#/t/' + S.test.id + '/results');
    }
    if (auto) return finish();
    if (missing > 0) {
      confirmModal('Submit with ' + missing + ' unanswered?',
        'There is no penalty for a wrong answer in IELTS, so it is always worth guessing. ' +
        'Flagged and blank questions are highlighted in the bar at the bottom.', finish, 'Submit anyway');
    } else {
      confirmModal('Submit your answers?', 'You will see your raw score, band and a full answer review.', finish, 'Submit');
    }
  }

  /* ============================================================ writing */
  function writing(test) {
    var m = mod();
    var data = sectionData(test, 'writing', m);
    if (!data) { go('#/t/' + test.id); return; }
    badge(modName(m));
    qs('#topbar-mid').textContent = test.name + ' · Writing — ' + modName(m);
    var key = slot(test.id, 'writing', m);
    var saved = I.Store.progress(key) || {};
    var st = { texts: saved.texts || ['', ''], cur: 0, submitted: false };

    var v = el('div');
    v.appendChild(el('div', { class: 'card spread' }, [
      el('div', {}, [
        el('h2', { style: 'margin:0 0 .2rem', text: 'Writing — ' + modName(m) }),
        el('p', { class: 'muted', style: 'margin:0;font-size:.9rem',
          text: '60 minutes for both tasks. Spend about 20 minutes on Task 1 and 40 on Task 2 — Task 2 carries twice the marks.' })
      ]),
      el('button', { class: 'btn', type: 'button', text: 'Start the 60-minute clock', onclick: function () {
        var self = this;
        startTimer(60 * 60, test.name + ' · Writing (' + modName(m) + ')', function () {
          alertModal('Time is up', 'In the real test your script would be collected now. Submit for the model answer and self-assessment.');
        });
        self.disabled = true; self.textContent = 'Clock running';
      } })
    ]));

    var tabs = el('div', { class: 'row', style: 'margin:1rem 0 .8rem' });
    var host = el('div');
    function draw() {
      qsa('button', tabs).forEach(function (b, j) { b.className = 'btn btn-sm' + (j === st.cur ? '' : ' btn-ghost'); });
      host.innerHTML = '';
      host.appendChild(taskPane(data.tasks[st.cur], st, st.cur, key, m));
    }
    data.tasks.forEach(function (t, i) {
      tabs.appendChild(el('button', { class: 'btn btn-sm', type: 'button', text: 'Task ' + (i + 1),
        onclick: function () { st.cur = i; draw(); } }));
    });
    v.appendChild(tabs); v.appendChild(host);

    v.appendChild(el('div', { class: 'row row-end', style: 'margin-top:1.2rem' }, [
      el('button', { class: 'btn btn-lg', type: 'button', text: 'Finish & self-assess', onclick: function () {
        clearTimer();
        writingAssess(test, data, st, key, m);
      } })
    ]));
    view.innerHTML = ''; view.appendChild(v);
    draw();
    qs('#btn-finish').onclick = function () { clearTimer(); writingAssess(test, data, st, key, m); };
  }

  function taskPane(task, st, idx, key, m) {
    var wrapT = el('div', { class: 'writer' });
    var left = el('div', { class: 'pane wtask' });
    left.appendChild(el('h3', { text: 'Task ' + (idx + 1) + ' — ' + task.label }));
    left.appendChild(el('div', { class: 'instr', html: R.md(task.instructions) }));
    if (task.prompt) left.appendChild(el('div', { class: 'passage', html: '<p>' + R.md(task.prompt) + '</p>' }));
    if (task.figure) left.appendChild(R.chart(task.figure));
    if (task.bullets) {
      left.appendChild(el('div', { class: 'notes' }, [
        el('div', { class: 'lead', text: task.bulletsLead || 'In your letter:' }),
        el('ul', {}, task.bullets.map(function (b) { return el('li', { html: R.md(b) }); }))
      ]));
    }
    if (task.closing) left.appendChild(el('p', { html: R.md(task.closing) }));
    left.appendChild(el('p', { class: 'muted', html: '<small>Write at least <strong>' + task.minWords +
      '</strong> words. You should spend about <strong>' + task.minutes + ' minutes</strong> on this task.</small>' }));
    if (task.tips) {
      var d = el('details', { class: 'acc' }, [el('summary', { text: 'Planning hints (open before you start, or not at all)' })]);
      var ul = el('ul', {});
      task.tips.forEach(function (t) { ul.appendChild(el('li', { html: R.md(t) })); });
      d.appendChild(ul); left.appendChild(d);
    }

    var ta = el('textarea', { placeholder: 'Type your answer here…', spellcheck: 'false' });
    ta.value = st.texts[idx] || '';
    var count = el('div', { class: 'wcount' });
    function paint() {
      var n = I.countWords(ta.value);
      count.innerHTML = '';
      count.appendChild(el('span', { class: n >= task.minWords ? 'okc' : 'under',
        text: n + ' words (minimum ' + task.minWords + ')' }));
      count.appendChild(el('span', { class: 'muted', text: 'Sentences: ' +
        (ta.value.split(/[.!?]+\s/).filter(function (x) { return x.trim().length > 3; }).length) }));
      count.appendChild(el('span', { class: 'muted', text: 'Paragraphs: ' +
        (ta.value.split(/\n\s*\n/).filter(function (x) { return x.trim(); }).length) }));
    }
    ta.addEventListener('input', function () {
      st.texts[idx] = ta.value; paint();
      I.Store.progress(key, { texts: st.texts, at: Date.now() });
    });
    paint();

    var checkBox = el('div');
    var checkBtn = el('button', {
      class: 'btn btn-ghost btn-sm', type: 'button', text: 'Check this answer',
      onclick: function () {
        if (!w.WritingCheck) return;
        var res = w.WritingCheck.run({ text: ta.value, task: task, taskNumber: idx + 1, module: m });
        checkBox.innerHTML = '';
        checkBox.appendChild(w.WritingCheck.panel(res, 'Task ' + (idx + 1) + ' — automatic check'));
        checkBox.firstChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });

    var right = el('div', { class: 'wpad' }, [ta, count,
      el('div', { class: 'row' }, [
        checkBtn,
        el('span', { class: 'muted', style: 'font-size:.82rem',
          text: 'Length, structure, register and the usual slips — before you self-assess.' })
      ]),
      checkBox,
      el('p', { class: 'muted', style: 'margin:0', html: '<small>The word counter is a guide — in the real test you ' +
        'must count by hand on paper, or the computer counts for you. Never pad: an over-long, repetitive answer ' +
        'loses more than it gains.</small>' })]);
    wrapT.appendChild(left); wrapT.appendChild(right);
    return wrapT;
  }

  var W_CRITERIA = [
    { id: 'ta', name: 'Task Achievement / Response', hint: 'Did you cover every part of the prompt, with a clear position and developed, relevant ideas — and hit the word count?' },
    { id: 'cc', name: 'Coherence and Cohesion', hint: 'Logical paragraphs, one central idea each, linking that guides the reader without sounding mechanical.' },
    { id: 'lr', name: 'Lexical Resource', hint: 'Range and precision of vocabulary, natural collocation, few spelling or word-form slips.' },
    { id: 'gra', name: 'Grammatical Range and Accuracy', hint: 'A mix of simple and complex structures; the majority of sentences error-free.' }
  ];
  var S_CRITERIA = [
    { id: 'fc', name: 'Fluency and Coherence', hint: 'Speaking at length without long hesitation, connected ideas, self-correction that does not derail you.' },
    { id: 'lr', name: 'Lexical Resource', hint: 'Enough vocabulary to discuss unfamiliar topics, some idiomatic and less common language, effective paraphrase.' },
    { id: 'gra', name: 'Grammatical Range and Accuracy', hint: 'Complex structures used flexibly; errors rare and not blocking meaning.' },
    { id: 'pr', name: 'Pronunciation', hint: 'Easy to understand throughout; word and sentence stress, chunking and intonation used well.' }
  ];

  function criteriaPanel(criteria, initial, onChange) {
    var box = el('div', { class: 'stack' });
    var vals = {};
    criteria.forEach(function (c) {
      vals[c.id] = (initial && initial[c.id]) || 6;
      var out = el('strong', { text: I.bandLabel(vals[c.id]) });
      var range = el('input', { type: 'range', min: '4', max: '9', step: '0.5', value: String(vals[c.id]),
        style: 'width:100%' });
      range.addEventListener('input', function () {
        vals[c.id] = parseFloat(range.value); out.textContent = I.bandLabel(vals[c.id]); onChange(vals);
      });
      box.appendChild(el('div', { class: 'card', style: 'padding:.8rem' }, [
        el('div', { class: 'spread' }, [el('span', { style: 'font-weight:650', text: c.name }), out]),
        el('p', { class: 'muted', style: 'margin:.2rem 0 .5rem;font-size:.85rem', text: c.hint }),
        range
      ]));
    });
    onChange(vals);
    return { node: box, vals: vals };
  }

  function writingAssess(test, data, st, key, m) {
    stopAudio(); clearTimer();
    var v = el('div', { class: 'wrap-narrow' });
    v.appendChild(el('h1', { text: 'Writing — model answers and self-assessment' }));
    v.appendChild(el('div', { class: 'callout' }, [
      el('p', { style: 'margin:0', html: 'Compare your script with the model, then score yourself honestly against ' +
        'the four criteria. Self-marking is uncomfortable and that is the point — most candidates over-rate ' +
        'Task Response and under-rate Grammatical Accuracy.' })
    ]));

    var perTask = [];
    var totalBox = el('div', { class: 'card center' });   /* filled by paintTotal below */
    data.tasks.forEach(function (task, i) {
      var mine = st.texts[i] || '';
      var n = I.countWords(mine);
      var card = el('div', { class: 'card' });
      card.appendChild(el('h2', { text: 'Task ' + (i + 1) + ' — ' + task.label }));
      card.appendChild(el('p', { class: 'muted', html: 'You wrote <strong>' + n + '</strong> words' +
        (n < task.minWords ? ' — <span style="color:var(--bad)">under the ' + task.minWords +
          '-word minimum, which is penalised directly</span>.' : ' (minimum ' + task.minWords + ' ✓).') }));
      if (mine.trim() && w.WritingCheck) {
        card.appendChild(w.WritingCheck.panel(
          w.WritingCheck.run({ text: mine, task: task, taskNumber: i + 1, module: m }),
          'Automatic check — fix these before you score yourself'));
      }
      if (mine.trim()) {
        var d0 = el('details', { class: 'acc' }, [el('summary', { text: 'Your answer' })]);
        d0.appendChild(el('div', { class: 'model', html: mine.split(/\n+/).map(function (p) {
          return '<p>' + esc(p) + '</p>'; }).join('') }));
        card.appendChild(d0);
      }
      var d1 = el('details', { class: 'acc', open: true }, [el('summary', { text: 'Band 8+ model answer' })]);
      d1.appendChild(el('div', { class: 'model', html: task.model.map(function (p) {
        return '<p>' + R.md(p) + '</p>'; }).join('') }));
      if (task.modelNote) d1.appendChild(el('p', { class: 'muted', html: '<small>' + R.md(task.modelNote) + '</small>' }));
      card.appendChild(d1);
      if (task.checklist) {
        var d2 = el('details', { class: 'acc' }, [el('summary', { text: 'Marker\'s checklist for this task' })]);
        var ul = el('ul', { class: 'checklist' });
        task.checklist.forEach(function (c) {
          var cb = el('input', { type: 'checkbox' });
          ul.appendChild(el('li', {}, [cb, el('span', { html: R.md(c) })]));
        });
        d2.appendChild(ul); card.appendChild(d2);
      }
      var out = el('div');
      var panel = criteriaPanel(W_CRITERIA, null, function (vals) {
        var avg = W_CRITERIA.reduce(function (a, c) { return a + vals[c.id]; }, 0) / 4;
        perTask[i] = I.roundBand(avg);
        out.innerHTML = '<strong>Task ' + (i + 1) + ' estimate: Band ' + I.bandLabel(perTask[i]) + '</strong>';
        if (n && n < task.minWords) out.innerHTML += ' <span class="muted">(cap this at 5.0 or below if you are well short of the word count)</span>';
        paintTotal();
      });
      var d3 = el('details', { class: 'acc', open: true }, [el('summary', { text: 'Score this task' })]);
      d3.appendChild(panel.node); d3.appendChild(out);
      card.appendChild(d3);
      v.appendChild(card);
    });

    function paintTotal() {
      if (perTask.length < 2 || perTask[0] === undefined || perTask[1] === undefined) return;
      var band = I.roundBand((perTask[0] + perTask[1] * 2) / 3);
      totalBox.innerHTML = '';
      totalBox.appendChild(el('div', { class: 'band' }, [
        el('div', { class: 'lbl', text: 'Estimated writing band' }),
        el('div', { class: 'val', text: I.bandLabel(band) }),
        el('div', { class: 'sub', text: 'Task 1 counts once, Task 2 counts twice' })
      ]));
      totalBox.appendChild(el('button', { class: 'btn', style: 'margin-top:.8rem', type: 'button',
        text: 'Save this band to my score report', onclick: function () {
          I.Store.result(key, { skill: 'writing', module: m, band: band, selfMarked: true,
            texts: st.texts, at: Date.now(), done: true });
          I.Store.progress(key, null);
          go('#/t/' + test.id + '/results');
        } }));
    }
    v.appendChild(totalBox);
    paintTotal();
    view.innerHTML = ''; view.appendChild(v);
  }

  /* =========================================================== speaking */
  function speaking(test) {
    var data = test.speaking;
    if (!data) { go('#/t/' + test.id); return; }
    badge(null);
    qs('#topbar-mid').textContent = test.name + ' · Speaking';
    var key = slot(test.id, 'speaking');

    var v = el('div', { class: 'wrap-narrow' });
    v.appendChild(el('p', {}, [el('a', { href: '#/t/' + test.id, text: '← ' + test.name })]));
    v.appendChild(el('h1', { text: 'Speaking' }));
    v.appendChild(el('div', { class: 'card' }, [
      el('p', { html: 'An 11–14 minute conversation with a real examiner, recorded. Three parts, run without a break:' }),
      el('ul', {}, [
        el('li', { html: '<strong>Part 1 (4–5 min)</strong> — identity check, then familiar topics: where you live, ' +
          'work or study, and two or three everyday subjects.' }),
        el('li', { html: '<strong>Part 2 (3–4 min)</strong> — a task card. One minute to make notes, then speak for ' +
          '<strong>one to two minutes</strong>. The examiner stops you at two minutes and asks one short follow-up.' }),
        el('li', { html: '<strong>Part 3 (4–5 min)</strong> — abstract discussion linked to the Part 2 topic. ' +
          'This is where higher bands are won or lost.' })
      ]),
      el('div', { class: 'callout warn' }, [
        el('p', { style: 'margin:0', html: 'This app will time each stage and, if you allow microphone access, ' +
          'record you so you can listen back. Recordings stay in this page and are gone when you leave it.' })
      ]),
      el('div', { class: 'row', style: 'margin-top:1rem' }, [
        el('button', { class: 'btn btn-lg', type: 'button', text: 'Start the full interview',
          onclick: function () { runSpeaking(test, data, key); } }),
        el('button', { class: 'btn btn-lg btn-ghost', type: 'button', text: 'Just show me the questions',
          onclick: function () { speakingSheet(test, data, key); } })
      ])
    ]));
    view.innerHTML = ''; view.appendChild(v);
  }

  var rec = { mediaRecorder: null, chunks: [], url: null, stream: null };
  function startRec() {
    if (!navigator.mediaDevices || !w.MediaRecorder) return Promise.resolve(false);
    return navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      rec.stream = stream; rec.chunks = [];
      rec.mediaRecorder = new MediaRecorder(stream);
      rec.mediaRecorder.ondataavailable = function (e) { if (e.data.size) rec.chunks.push(e.data); };
      rec.mediaRecorder.start();
      return true;
    }).catch(function () { return false; });
  }
  function stopRec() {
    return new Promise(function (res) {
      if (!rec.mediaRecorder || rec.mediaRecorder.state === 'inactive') return res(null);
      rec.mediaRecorder.onstop = function () {
        var blob = new Blob(rec.chunks, { type: 'audio/webm' });
        if (rec.stream) rec.stream.getTracks().forEach(function (t) { t.stop(); });
        res(URL.createObjectURL(blob));
      };
      rec.mediaRecorder.stop();
    });
  }

  function runSpeaking(test, data, key) {
    /* Flatten the interview into a list of timed stages. */
    var stages = [];
    stages.push({ kind: 'say', text: 'Good morning. My name is Alex Carter. Can you tell me your full name, please? … ' +
      'And what shall I call you? … Can I see your identification, please? Thank you.', secs: 20, label: 'Introduction' });
    (data.part1 || []).forEach(function (topic) {
      stages.push({ kind: 'say', text: 'Let\'s talk about ' + topic.topic + '.', secs: 5, label: 'Part 1' });
      topic.questions.forEach(function (q) {
        stages.push({ kind: 'ask', text: q, secs: 30, label: 'Part 1 — ' + topic.topic, part: 1 });
      });
    });
    stages.push({ kind: 'say', text: 'Now I\'m going to give you a topic and I\'d like you to talk about it for one ' +
      'to two minutes. Before you talk you have one minute to think about what you are going to say. You can make ' +
      'some notes if you wish. Here is your topic.', secs: 14, label: 'Part 2' });
    stages.push({ kind: 'cue-prep', cue: data.part2, secs: 60, label: 'Part 2 — one minute to prepare', part: 2 });
    stages.push({ kind: 'cue-talk', cue: data.part2, secs: 120, label: 'Part 2 — speak for 1–2 minutes', part: 2 });
    if (data.part2.followUp) {
      stages.push({ kind: 'ask', text: data.part2.followUp, secs: 20, label: 'Part 2 — rounding off', part: 2 });
    }
    stages.push({ kind: 'say', text: 'We\'ve been talking about ' + (data.part3.link || 'that topic') +
      '. I\'d like to discuss with you one or two more general questions related to this.', secs: 10, label: 'Part 3' });
    (data.part3.groups || []).forEach(function (g) {
      g.questions.forEach(function (q) {
        stages.push({ kind: 'ask', text: q, secs: 45, label: 'Part 3 — ' + g.theme, part: 3 });
      });
    });
    stages.push({ kind: 'say', text: 'Thank you. That is the end of the speaking test.', secs: 6, label: 'End' });

    var i = 0, tick = null, left = 0, paused = false, recording = false;
    var host = el('div', { class: 'wrap-narrow' });
    view.innerHTML = ''; view.appendChild(host);

    startRec().then(function (ok) { recording = ok; drawStage(); });

    function clearTick() { if (tick) { clearInterval(tick); tick = null; } }

    function drawStage() {
      clearTick(); stopAudio();
      if (i >= stages.length) return finishSpeaking(test, data, key, host);
      var s = stages[i];
      left = s.secs;
      host.innerHTML = '';

      var top = el('div', { class: 'spread' }, [
        el('span', { class: 'pill', text: s.label }),
        el('span', { class: 'muted', text: 'Stage ' + (i + 1) + ' of ' + stages.length +
          (recording ? '' : ' · not recording') })
      ]);
      var timerEl = el('div', { class: 'spk-timer run', text: I.mmss(left) });
      var stage = el('div', { class: 'spk-stage' });

      if (s.kind === 'cue-prep' || s.kind === 'cue-talk') {
        var c = s.cue;
        var cue = el('div', { class: 'cue' }, [
          el('h3', { html: R.md(c.title) }),
          el('p', { style: 'margin:.2rem 0 .3rem', text: 'You should say:' }),
          el('ul', {}, c.bullets.map(function (b) { return el('li', { html: R.md(b) }); })),
          el('p', { class: 'last', html: R.md(c.last) })
        ]);
        stage.appendChild(cue);
        if (s.kind === 'cue-prep') {
          var pad = el('textarea', { placeholder: 'Notes (the examiner gives you paper and a pencil)…',
            style: 'width:100%;max-width:600px;min-height:120px;border:1px solid var(--line-2);border-radius:10px;padding:.7rem;font:1rem/1.6 var(--sans);background:var(--panel);color:var(--ink)' });
          stage.appendChild(pad);
        } else {
          stage.appendChild(el('p', { class: 'muted', html: recording
            ? '<span class="rec-dot"></span>Speak now. Keep going until the timer stops you.'
            : 'Speak now — out loud, not in your head. Keep going until the timer stops you.' }));
        }
      } else {
        stage.appendChild(el('p', { class: 'qbig', html: R.md(s.text) }));
        if (s.kind === 'ask') {
          stage.appendChild(el('p', { class: 'muted', html: recording
            ? '<span class="rec-dot"></span>Answer out loud.' : 'Answer out loud.' }));
        }
      }

      var controls = el('div', { class: 'row', style: 'justify-content:center' }, [
        el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'Pause', onclick: function () {
          paused = !paused; this.textContent = paused ? 'Resume' : 'Pause';
          timerEl.classList.toggle('run', !paused);
        } }),
        el('button', { class: 'btn btn-sm', type: 'button', text: s.kind === 'cue-talk' ? 'I have finished' : 'Next',
          onclick: function () { i++; drawStage(); } }),
        el('button', { class: 'btn btn-quiet btn-sm', type: 'button', text: 'End interview',
          onclick: function () { i = stages.length; drawStage(); } })
      ]);

      host.appendChild(el('div', { class: 'card' }, [top, timerEl, stage, controls]));

      /* the examiner's voice */
      if (s.kind === 'ask' || s.kind === 'say' ||
          (s.kind === 'cue-prep')) {
        var line = s.kind === 'cue-prep'
          ? ('Your topic is: ' + s.cue.title.replace(/\*\*/g, '') + '.')
          : s.text;
        playQueue([{ who: 'EXAMINER', text: line }], { rate: 1 });
      }

      tick = setInterval(function () {
        if (paused) return;
        left -= 1;
        timerEl.textContent = I.mmss(Math.abs(left));
        if (left <= 0) {
          timerEl.classList.remove('run'); timerEl.classList.add('over');
          if (s.kind === 'cue-talk' || s.kind === 'cue-prep' || s.kind === 'say') { i++; drawStage(); }
        }
      }, 1000);
    }
  }

  function finishSpeaking(test, data, key, host) {
    stopAudio();
    host.innerHTML = '';
    host.appendChild(el('h1', { text: 'Speaking — review' }));

    var audioBox = el('div', { class: 'card' }, [el('h3', { text: 'Your recording' }),
      el('p', { class: 'muted', style: 'margin:0', text: 'Preparing…' })]);
    host.appendChild(audioBox);
    stopRec().then(function (url) {
      audioBox.innerHTML = '';
      audioBox.appendChild(el('h3', { text: 'Your recording' }));
      if (url) {
        var a = document.createElement('audio');
        a.controls = true; a.src = url; a.style.width = '100%';
        audioBox.appendChild(a);
        audioBox.appendChild(el('p', { class: 'muted', style: 'margin:.5rem 0 0', html:
          '<small>Listen for three things: how long your pauses are, how often you repeat the same word, ' +
          'and whether you actually answered the question that was asked. This recording disappears when you leave the page.</small>' }));
      } else {
        audioBox.appendChild(el('p', { class: 'muted', style: 'margin:0',
          text: 'No recording was made — microphone access was unavailable or declined.' }));
      }
    });

    host.appendChild(el('div', { class: 'card' }, [
      el('h3', { text: 'Strong-answer notes' }),
      el('p', { class: 'muted', html: 'Not scripts to memorise — examiners spot those instantly. These show the ' +
        '<em>shape</em> of a Band 7–8 answer: a direct response, a reason, then a concrete example or contrast.' }),
      (function () {
        var box = el('div');
        (data.samples || []).forEach(function (s) {
          var d = el('details', { class: 'acc' }, [el('summary', { text: s.q })]);
          d.appendChild(el('div', { class: 'model', html: s.a.split('\n').map(function (p) {
            return '<p>' + R.md(p) + '</p>'; }).join('') }));
          if (s.why) d.appendChild(el('p', { class: 'muted', html: '<small>' + R.md(s.why) + '</small>' }));
          box.appendChild(d);
        });
        return box;
      })(),
      data.language ? el('details', { class: 'acc' }, [
        el('summary', { text: 'Useful language for this topic' }),
        el('ul', {}, data.language.map(function (l) { return el('li', { html: R.md(l) }); }))
      ]) : null
    ]));

    var out = el('div', { class: 'center' });
    var panel = criteriaPanel(S_CRITERIA, null, function (vals) {
      var band = I.roundBand(S_CRITERIA.reduce(function (a, c) { return a + vals[c.id]; }, 0) / 4);
      out.innerHTML = '';
      out.appendChild(el('div', { class: 'band' }, [
        el('div', { class: 'lbl', text: 'Estimated speaking band' }),
        el('div', { class: 'val', text: I.bandLabel(band) })
      ]));
      out.appendChild(el('button', { class: 'btn', style: 'margin-top:.8rem', type: 'button',
        text: 'Save to my score report', onclick: function () {
          I.Store.result(key, { skill: 'speaking', band: band, selfMarked: true, at: Date.now(), done: true });
          go('#/t/' + test.id + '/results');
        } }));
    });
    host.appendChild(el('div', { class: 'card' }, [
      el('h3', { text: 'Score yourself' }),
      el('p', { class: 'muted', html: 'Play the recording back before you move the sliders. If you cannot ' +
        'bear listening to it, that is normal and it is still the fastest way to improve.' }),
      panel.node, out
    ]));
  }

  function speakingSheet(test, data, key) {
    var v = el('div', { class: 'wrap-narrow' });
    v.appendChild(el('p', {}, [el('a', { href: '#/t/' + test.id + '/speaking', text: '← Back' })]));
    v.appendChild(el('h1', { text: 'Speaking — question sheet' }));
    var c1 = el('div', { class: 'card' }, [el('h2', { text: 'Part 1 — Interview' })]);
    (data.part1 || []).forEach(function (t) {
      c1.appendChild(el('h4', { text: t.topic }));
      c1.appendChild(el('ul', {}, t.questions.map(function (q) { return el('li', { html: R.md(q) }); })));
    });
    v.appendChild(c1);
    v.appendChild(el('div', { class: 'card' }, [
      el('h2', { text: 'Part 2 — Long turn' }),
      el('div', { class: 'cue' }, [
        el('h3', { html: R.md(data.part2.title) }),
        el('p', { style: 'margin:.2rem 0 .3rem', text: 'You should say:' }),
        el('ul', {}, data.part2.bullets.map(function (b) { return el('li', { html: R.md(b) }); })),
        el('p', { class: 'last', html: R.md(data.part2.last) })
      ]),
      data.part2.followUp ? el('p', { class: 'muted', html: '<strong>Follow-up:</strong> ' + R.md(data.part2.followUp) }) : null
    ]));
    var c3 = el('div', { class: 'card' }, [el('h2', { text: 'Part 3 — Discussion' })]);
    (data.part3.groups || []).forEach(function (g) {
      c3.appendChild(el('h4', { text: g.theme }));
      c3.appendChild(el('ul', {}, g.questions.map(function (q) { return el('li', { html: R.md(q) }); })));
    });
    v.appendChild(c3);
    v.appendChild(el('div', { class: 'row row-end' }, [
      el('button', { class: 'btn', type: 'button', text: 'Run it as a timed interview',
        onclick: function () { runSpeaking(test, data, key); } })
    ]));
    view.innerHTML = ''; view.appendChild(v);
  }

  /* ============================================================ results */
  function results(test) {
    var m = mod();
    badge(modName(m));
    var v = el('div');
    v.appendChild(el('p', {}, [el('a', { href: '#/t/' + test.id, text: '← ' + test.name })]));
    v.appendChild(el('h1', { text: test.name + ' — score report' }));
    v.appendChild(el('p', { class: 'muted', text: 'Reading and Writing shown for the ' + modName(m) +
      ' module. Switch module on the home screen to see the other set.' }));

    var got = {};
    SKILLS.forEach(function (s) { got[s.id] = I.Store.result(slot(test.id, s.id, m)); });

    var rt = visaRoute();
    var wrapB = el('div', { class: 'bandwrap' });
    SKILLS.forEach(function (s) {
      var r = got[s.id];
      var need = rt.min && rt.min[s.id];
      var card = el('div', { class: 'band' }, [
        el('div', { class: 'lbl', text: s.name }),
        el('div', { class: 'val', text: r && typeof r.band === 'number' ? I.bandLabel(r.band) : '–' }),
        el('div', { class: 'sub', text: r
          ? (r.raw !== undefined ? r.raw + ' / ' + r.total + ' correct' : 'self-assessed')
          : 'not taken' })
      ]);
      if (need && r && typeof r.band === 'number') {
        var diff = r.band - need;
        card.appendChild(el('div', { class: 'gapchip ' + (diff >= 0 ? 'hit' : 'miss'),
          style: 'display:inline-block;margin-top:.45rem',
          text: diff >= 0 ? '✓ needs ' + I.bandLabel(need)
            : Math.abs(diff).toFixed(1) + ' below ' + I.bandLabel(need) }));
      } else if (need) {
        card.appendChild(el('div', { class: 'gapchip', style: 'display:inline-block;margin-top:.45rem;background:var(--panel-2);color:var(--ink-3)',
          text: 'target ' + I.bandLabel(need) }));
      }
      wrapB.appendChild(card);
    });
    var ov = I.overall(SKILLS.map(function (s) { return got[s.id] && got[s.id].band; }));
    wrapB.appendChild(el('div', { class: 'band overall' }, [
      el('div', { class: 'lbl', text: 'Overall' }),
      el('div', { class: 'val', text: ov ? I.bandLabel(ov) : '–' }),
      el('div', { class: 'sub', text: ov ? 'mean of four skills' : 'complete all four skills' })
    ]));
    v.appendChild(wrapB);

    if (rt.min) {
      var short = SKILLS.filter(function (s) {
        return rt.min[s.id] && got[s.id] && got[s.id].band < rt.min[s.id];
      });
      var untested = SKILLS.filter(function (s) { return rt.min[s.id] && !got[s.id]; });
      v.appendChild(el('div', { class: 'callout' + (short.length ? ' warn' : ''), style: 'margin-top:1rem' }, [
        el('h4', { text: rt.name }),
        el('p', { style: 'margin:0', html: short.length
          ? 'Currently <strong>below the requirement in ' + short.length + ' skill' +
            (short.length > 1 ? 's' : '') + '</strong>: ' +
            short.map(function (s) {
              return s.name + ' (' + I.bandLabel(got[s.id].band) + ' vs ' + I.bandLabel(rt.min[s.id]) + ')';
            }).join(', ') + '.' +
            (untested.length ? ' Still untested: ' + untested.map(function (s) { return s.name; }).join(', ') + '.' : '')
          : (untested.length
            ? 'Meeting the requirement in everything taken so far. Still untested: ' +
              untested.map(function (s) { return s.name; }).join(', ') + '.'
            : '<strong>Every skill is at or above the band this route requires.</strong>') })
      ]));
    }

    if (ov) {
      var lowest = SKILLS.filter(function (s) { return got[s.id]; })
        .sort(function (a, b) { return got[a.id].band - got[b.id].band; })[0];
      v.appendChild(el('div', { class: 'callout', style: 'margin-top:1rem' }, [
        el('h4', { text: 'Where to put your hours' }),
        el('p', { style: 'margin:0', html: 'Your weakest skill is <strong>' + lowest.name + '</strong> at Band ' +
          I.bandLabel(got[lowest.id].band) + '. Because the overall band is a mean, lifting your lowest skill by ' +
          'one band moves the overall score more than polishing your best one. Note that most UKVI routes set a ' +
          '<strong>minimum in every skill</strong>, not just an overall score — one weak skill can fail the whole application.' })
      ]));
    }

    ['listening', 'reading'].forEach(function (skill) {
      var r = got[skill];
      if (!r || !r.answers) return;
      var data = sectionData(test, skill, m);
      var res = I.scoreSection(data, r.answers);
      var card = el('div', { class: 'card', style: 'margin-top:1rem' });
      card.appendChild(el('div', { class: 'spread' }, [
        el('h2', { style: 'margin:0', text: (skill === 'listening' ? 'Listening' : 'Reading') +
          ' — answer review (' + res.raw + '/' + res.total + ')' }),
        el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'Retake',
          onclick: function () { go('#/t/' + test.id + '/' + skill); } })
      ]));

      var perPart = {};
      res.rows.forEach(function (row) {
        perPart[row.part] = perPart[row.part] || { ok: 0, n: 0 };
        perPart[row.part].n += row.of; perPart[row.part].ok += row.marks;
      });
      var pr = el('div', { class: 'row', style: 'margin:.6rem 0' });
      Object.keys(perPart).forEach(function (p) {
        pr.appendChild(el('span', { class: 'pill', text: (skill === 'listening' ? 'Part ' : 'Section ') + p +
          ': ' + perPart[p].ok + '/' + perPart[p].n }));
      });
      card.appendChild(pr);

      var t = el('table', { class: 'reviewtable' });
      t.appendChild(el('thead', {}, [el('tr', {}, [
        el('th', { text: '#' }), el('th', { text: 'Your answer' }), el('th', { text: 'Accepted' }),
        el('th', { text: 'Where it came from' })])]));
      var tb = el('tbody');
      res.rows.forEach(function (row) {
        var tr = el('tr', { class: row.correct ? 'ok' : 'no' });
        tr.appendChild(el('td', { class: 'n', text: String(row.n) }));
        var you = el('td', { class: 'you', text: row.given });
        if (row.reason === 'over-limit') you.appendChild(el('span', { class: 'tag', text: 'over the word limit' }));
        if (row.partial) you.appendChild(el('span', { class: 'tag', text: 'half credit' }));
        tr.appendChild(you);
        tr.appendChild(el('td', { class: 'ans', text: row.answer }));
        tr.appendChild(el('td', { class: 'ev', text: row.evidence || '' }));
        tb.appendChild(tr);
      });
      t.appendChild(tb);
      card.appendChild(el('div', { class: 'tablewrap' }, [t]));

      if (skill === 'listening') {
        var d = el('details', { class: 'acc' }, [el('summary', { text: 'Full audio script' })]);
        var sc = el('div', { class: 'script' });
        (data.parts || []).forEach(function (p) {
          sc.appendChild(el('p', {}, [el('strong', { text: 'PART ' + p.number })]));
          sc.appendChild(el('p', { class: 'muted', text: p.context || '' }));
          (p.transcript || []).forEach(function (line) {
            if (line.pause) return;
            sc.appendChild(el('p', {}, [el('span', { class: 'who', text: line.who }),
              el('span', { html: R.md(line.text) })]));
          });
        });
        d.appendChild(sc); card.appendChild(d);
      } else {
        var d2 = el('details', { class: 'acc' }, [el('summary', { text: 'Re-read the passages with your answers marked' })]);
        var box = el('div');
        var rowMap = {}; res.rows.forEach(function (row) { rowMap[row.key] = row; });
        var ctx = { review: true, get: function (k) { return r.answers[k]; }, set: function () {},
          focus: function () {}, flagged: function () { return false; }, toggleFlag: function () {},
          rowFor: function (k) { return rowMap[k]; } };
        (data.sections || []).forEach(function (sec) {
          box.appendChild(el('div', { class: 'pane', style: 'margin-bottom:1rem' }, [R.passage(sec)]));
          var qbox = el('div', { class: 'pane', style: 'margin-bottom:1rem' });
          (sec.groups || []).forEach(function (g) { qbox.appendChild(R.group(g, ctx)); });
          box.appendChild(qbox);
        });
        d2.appendChild(box); card.appendChild(d2);
      }
      v.appendChild(card);
    });

    ['writing', 'speaking'].forEach(function (skill) {
      var r = got[skill];
      if (!r) return;
      v.appendChild(el('div', { class: 'card', style: 'margin-top:1rem' }, [
        el('div', { class: 'spread' }, [
          el('h2', { style: 'margin:0', text: (skill === 'writing' ? 'Writing' : 'Speaking') +
            ' — self-assessed Band ' + I.bandLabel(r.band) }),
          el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'Redo',
            onclick: function () { go('#/t/' + test.id + '/' + skill); } })
        ]),
        el('p', { class: 'muted', style: 'margin:.4rem 0 0', text: 'Self-marking drifts high. If you can, get one ' +
          'script or recording marked by a teacher and use that to recalibrate your own scoring.' })
      ]));
    });

    var none = !SKILLS.some(function (s) { return got[s.id]; });
    if (none) {
      v.appendChild(el('div', { class: 'card center', style: 'margin-top:1rem' }, [
        el('p', { class: 'muted', text: 'Nothing taken yet for this test.' }),
        el('a', { class: 'btn', href: '#/t/' + test.id, text: 'Start with Listening' })
      ]));
    }
    view.innerHTML = ''; view.appendChild(v);
  }

  /* ============================================================== modal */
  function openModal(title, bodyNode, footNodes) {
    qs('#modal-title').textContent = title;
    var b = qs('#modal-body'); b.innerHTML = '';
    b.appendChild(typeof bodyNode === 'string' ? el('p', { html: bodyNode }) : bodyNode);
    var f = qs('#modal-foot'); f.innerHTML = '';
    (footNodes || []).forEach(function (n) { f.appendChild(n); });
    qs('#modal-back').hidden = false;
  }
  function closeModal() { qs('#modal-back').hidden = true; }
  function confirmModal(title, body, onYes, yesText) {
    openModal(title, body, [
      el('button', { class: 'btn btn-quiet', type: 'button', text: 'Go back', onclick: closeModal }),
      el('button', { class: 'btn', type: 'button', text: yesText || 'Continue',
        onclick: function () { closeModal(); onYes(); } })
    ]);
  }
  function alertModal(title, body) {
    openModal(title, body, [el('button', { class: 'btn', type: 'button', text: 'OK', onclick: closeModal })]);
  }
  qs('#modal-close').onclick = closeModal;
  qs('#modal-back').addEventListener('click', function (e) { if (e.target.id === 'modal-back') closeModal(); });
  qs('#btn-help').onclick = function () { go('#/guide'); };

  window.addEventListener('beforeunload', function (e) {
    if (S && !S.submitted && Object.keys(S.answers || {}).length) { e.preventDefault(); e.returnValue = ''; }
  });
  if (synth()) {
    synth().onvoiceschanged = function () { voiceCache = null; pickVoices(); };
    pickVoices();
  }
  window.addEventListener('hashchange', route);
  route();
})(window);
