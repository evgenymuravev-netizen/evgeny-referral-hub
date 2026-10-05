/* Writing checker — deterministic, offline, no model behind it.
   It does NOT predict a band. It finds the mechanical faults that cost marks
   before an examiner gets as far as considering your ideas: length, copied
   wording, a missing overview, no position, no examples, register slips and
   the handful of grammar errors that appear in almost every script. */
(function (w) {
  'use strict';

  /* ------------------------------------------------------------- lexicons */
  var OVERVIEW = ['overall', 'in general', 'generally', 'broadly', 'it is clear', 'it can be seen',
    'the most striking', 'the most noticeable', 'the overall trend', 'on the whole',
    'taken as a whole', 'in summary', 'the general pattern'];

  var POSITION = ['i agree', 'i disagree', 'i largely agree', 'i partly agree', 'i strongly believe',
    'in my view', 'in my opinion', 'i believe', 'i would argue', 'my own view', 'to my mind',
    'i am convinced', 'i do not think', 'i think that', 'i would suggest', 'it seems to me'];

  var EXAMPLES = ['for example', 'for instance', 'such as', 'a case in point', 'to illustrate',
    'to give an example', 'in my own experience', 'my own', 'my cousin', 'my friend', 'my colleague',
    'my brother', 'my sister', 'my father', 'my mother', 'my nephew', 'a friend of mine',
    'i once', 'take the case', 'consider the case'];

  var COUNTER = ['however', 'on the other hand', 'critics', 'some argue', 'some people argue',
    'it could be argued', 'admittedly', 'opponents', 'the obvious objection', 'those who disagree',
    'nevertheless', 'that said', 'while it is true', 'although it is true', 'granted',
    'the counter-argument', 'sceptics'];

  var CONCLUSION = ['in conclusion', 'to conclude', 'to sum up', 'in summary', 'on balance',
    'to summarise', 'to summarize', 'all things considered'];

  var CONNECTORS = ['firstly', 'first of all', 'secondly', 'thirdly', 'finally', 'moreover',
    'furthermore', 'in addition', 'additionally', 'besides', 'however', 'nevertheless',
    'nonetheless', 'therefore', 'thus', 'consequently', 'as a result', 'for example',
    'for instance', 'in conclusion', 'to sum up', 'on the other hand', 'last but not least',
    'what is more', 'in contrast', 'similarly', 'likewise', 'hence', 'to begin with'];

  var COMPARISON = ['than', 'whereas', 'while', 'compared', 'in contrast', 'twice', 'half',
    'the most', 'the least', 'higher', 'lower', 'greater', 'smaller', 'more than', 'less than',
    'respectively', 'similarly', 'by contrast', 'as many', 'as much'];

  /* Task 1 must describe, not react */
  var OPINION_WORDS = ['surprisingly', 'surprising', 'interesting', 'interestingly', 'unfortunately',
    'fortunately', 'luckily', 'sadly', 'shockingly', 'amazing', 'amazingly', 'impressive',
    'impressively', 'worrying', 'alarming', 'disappointing', 'remarkably strange'];

  var FIRST_PERSON = ['i think', 'i believe', 'in my opinion', 'in my view', 'i feel',
    'to my mind', 'personally', 'i would say'];

  /* sports / journalism metaphor — wrong register for academic description */
  var FIGURATIVE = ['underdog', 'the race', 'a race', 'opponent', 'rival', 'champion', 'winner',
    'loser', 'beat the', 'defeat', 'king of', 'crown', 'battle', 'war between', 'story of',
    'journey of', 'made it to the top', 'left behind in the dust'];

  /* Only unambiguous informality. "kind of" and "a bit of" were removed: they are
     perfectly good English in "some kind of" and flagged honest sentences. */
  var INFORMAL = ['a lot of', 'lots of', 'loads of', 'tons of', 'kids', 'stuff', 'guys', 'gonna',
    'wanna', 'awesome', 'cool', 'okay', 'big time', 'a big deal', 'you know',
    'i will guide you', 'here are they'];

  var MISSPELLINGS = {
    'beyound': 'beyond', 'alot': 'a lot', 'recieve': 'receive', 'seperate': 'separate',
    'becuase': 'because', 'definately': 'definitely', 'occured': 'occurred',
    'goverment': 'government', 'enviroment': 'environment', 'oppurtunity': 'opportunity',
    'sucessful': 'successful', 'thier': 'their', 'wich': 'which', 'allmost': 'almost',
    'adress': 'address', 'arguement': 'argument', 'buisness': 'business',
    'comitted': 'committed', 'developement': 'development', 'existance': 'existence',
    'independant': 'independent', 'knowlege': 'knowledge', 'neccessary': 'necessary',
    'necesary': 'necessary', 'ocassion': 'occasion', 'priviledge': 'privilege',
    'publically': 'publicly', 'reccomend': 'recommend', 'refered': 'referred',
    'rythm': 'rhythm', 'sucess': 'success', 'tommorrow': 'tomorrow', 'untill': 'until',
    'wierd': 'weird', 'suprisingly': 'surprisingly', 'suprising': 'surprising',
    'oponnent': 'opponent', 'opponnent': 'opponent', 'accomodation': 'accommodation',
    'begining': 'beginning', 'benifit': 'benefit', 'catagory': 'category',
    'concious': 'conscious', 'critisism': 'criticism', 'embarass': 'embarrass',
    'foriegn': 'foreign', 'grammer': 'grammar', 'happend': 'happened',
    'immediatly': 'immediately', 'intrest': 'interest', 'liesure': 'leisure',
    'maintainance': 'maintenance', 'occassion': 'occasion', 'perfomance': 'performance',
    'persue': 'pursue', 'posession': 'possession', 'prefered': 'preferred',
    'reccommend': 'recommend', 'responsability': 'responsibility', 'succesful': 'successful',
    'trully': 'truly', 'unfortunatly': 'unfortunately', 'usualy': 'usually',
    'writting': 'writing', 'goverments': 'governments', 'peaple': 'people',
    'lenght': 'length', 'strenght': 'strength', 'wheather': 'whether', 'wether': 'whether'
  };

  /* --------------------------------------------------------------- helpers */
  function words(t) {
    return String(t || '').toLowerCase().replace(/[’']/g, "'")
      .match(/[a-z0-9'’-]+/g) || [];
  }
  function countWords(t) {
    return (String(t || '').trim().split(/\s+/).filter(function (x) {
      return /[A-Za-z0-9À-ɏ]/.test(x);
    })).length;
  }
  function sentences(t) {
    return (String(t || '').match(/[^.!?…]+[.!?…]*/g) || [])
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return countWords(s) > 1; });
  }
  function paragraphs(t) {
    return String(t || '').split(/\n\s*\n|\n/).map(function (p) { return p.trim(); })
      .filter(function (p) { return countWords(p) > 2; });
  }
  function lower(t) { return ' ' + String(t || '').toLowerCase().replace(/\s+/g, ' ') + ' '; }

  /* Phrases must match on word boundaries: without this, "king of" matches
     inside "ranking of" and "a race" inside "embrace". */
  var reCache = {};
  function phraseRe(p, flags) {
    var key = p + '\u0000' + (flags || 'i');
    if (!reCache[key]) {
      var esc = String(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
      reCache[key] = new RegExp('\\b' + esc + '\\b', flags || 'i');
    }
    return reCache[key];
  }
  function findPhrases(text, list) {
    return list.filter(function (p) { return phraseRe(p).test(text); });
  }
  /* earliest character position of any phrase in the list, or -1 */
  function firstIndexOf(text, list) {
    var best = -1;
    list.forEach(function (p) {
      var m = phraseRe(p).exec(text);
      if (m && (best < 0 || m.index < best)) best = m.index;
    });
    return best;
  }
  function countPhrases(text, list) {
    var n = 0;
    list.forEach(function (p) {
      var m = String(text).match(phraseRe(p, 'gi'));
      if (m) n += m.length;
    });
    return n;
  }
  /* a short quote around the first occurrence, for the report */
  function quoteAround(text, phrase) {
    var i = String(text).toLowerCase().indexOf(String(phrase).toLowerCase());
    if (i < 0) return '';
    var from = Math.max(0, i - 30), to = Math.min(text.length, i + phrase.length + 30);
    return (from ? '…' : '') + text.slice(from, to).replace(/\s+/g, ' ').trim() + (to < text.length ? '…' : '');
  }

  /* ------------------------------------------------------- copied wording */
  function promptText(task) {
    return [task.instructions, task.prompt, (task.bullets || []).join(' '), task.closing]
      .filter(Boolean).join(' ').replace(/\*\*/g, '');
  }
  /* Words the candidate cannot avoid: the prompt plus every label on the figure.
     Repeating "broadband" eight times is unavoidable, not poor lexical range. */
  function topicVocab(task) {
    var extra = [], f = task.figure;
    if (f) {
      if (f.title) extra.push(f.title);
      (f.categories || []).forEach(function (c) { extra.push(c); });
      (f.series || []).forEach(function (x) { extra.push(x.name || ''); });
      (f.pies || []).forEach(function (pie) {
        extra.push(pie.title || '');
        (pie.slices || []).forEach(function (sl) { extra.push(sl.label || ''); });
      });
      (f.head || []).forEach(function (h) { extra.push(h); });
      (f.rows || []).forEach(function (r) { extra.push(r.join(' ')); });
    }
    return promptText(task) + ' ' + extra.join(' ');
  }
  /* Any run of N+ consecutive words shared with the prompt is treated as copied.
     Examiners discount copied language when counting words. */
  function copiedRuns(answer, task, n) {
    n = n || 5;
    var src = words(promptText(task)), ans = words(answer);
    if (ans.length < n) return { count: 0, runs: [] };
    var grams = {};
    for (var i = 0; i + n <= src.length; i++) grams[src.slice(i, i + n).join(' ')] = 1;
    var flagged = new Array(ans.length);
    for (var j = 0; j + n <= ans.length; j++) {
      if (grams[ans.slice(j, j + n).join(' ')]) {
        for (var k = j; k < j + n; k++) flagged[k] = 1;
      }
    }
    var count = 0, runs = [], cur = [];
    for (var m = 0; m < ans.length; m++) {
      if (flagged[m]) { count++; cur.push(ans[m]); }
      else if (cur.length) { runs.push(cur.join(' ')); cur = []; }
    }
    if (cur.length) runs.push(cur.join(' '));
    return { count: count, runs: runs };
  }

  /* ------------------------------------------------------------- the check */
  function run(opts) {
    var text = String(opts.text || '');
    var task = opts.task || {};
    var no = opts.taskNumber || 1;
    var findings = [], good = [];

    function flag(sev, title, detail, quote) {
      findings.push({ severity: sev, title: title, detail: detail, quote: quote || '' });
    }
    function ok(t) { good.push(t); }

    var wc = countWords(text);
    var sents = sentences(text);
    var paras = paragraphs(text);
    var minW = task.minWords || (no === 1 ? 150 : 250);

    if (!wc) {
      return { empty: true, stats: { words: 0 }, findings: [], good: [] };
    }

    /* ---- 1. copied wording and effective length -------------------------- */
    var copied = copiedRuns(text, task, 5);
    var effective = wc - copied.count;

    if (copied.count >= 10) {
      flag(effective < minW ? 'high' : 'medium',
        'About ' + copied.count + ' words are copied straight from the task',
        'Examiners discount wording lifted from the question when they count your words, so your ' +
        'effective length is nearer <strong>' + effective + '</strong> than ' + wc + '. Paraphrase the ' +
        'prompt in your own words instead — especially the first sentence.',
        copied.runs.sort(function (a, b) { return b.length - a.length; })[0]);
    }
    if (effective < minW) {
      flag('high', 'Under the word limit (' + effective + ' effective words, minimum ' + minW + ')',
        'Under-length is penalised directly under Task Achievement/Response before anything else is ' +
        'considered. Aim for ' + (no === 1 ? '180–200' : '270–290') + ' words.');
    } else if (effective < minW * 1.08) {
      flag('medium', 'Only just over the minimum (' + effective + ' words)',
        'Miscounting by a few words is common and costly. Give yourself a margin: aim for ' +
        (no === 1 ? '180–200' : '270–290') + '.');
    } else {
      ok(effective + ' words — comfortably over the ' + minW + '-word minimum');
    }

    /* ---- 2. paragraphing -------------------------------------------------- */
    var thin = paras.filter(function (p) { return sentences(p).length === 1; }).length;
    if (paras.length < 3) {
      flag('high', 'Only ' + paras.length + ' paragraph' + (paras.length === 1 ? '' : 's'),
        no === 1
          ? 'Task 1 wants four: introduction, overview, and one paragraph for each group of data.'
          : 'Task 2 wants four or five: introduction, two or three body paragraphs, conclusion.');
    } else if (no === 1 && paras.length > 5) {
      flag('medium', paras.length + ' paragraphs is too many for Task 1',
        'Fragmenting the data into one-sentence paragraphs reads as a list rather than a summary. ' +
        'Group the figures: things that rose in one paragraph, things that fell in another.');
    } else if (no === 2 && paras.length > 6) {
      flag('medium', paras.length + ' paragraphs is a lot for a 250-word essay',
        'Two well-developed body paragraphs beat four thin ones.');
    } else {
      ok(paras.length + ' paragraphs — a sensible shape');
    }
    if (thin >= 3) {
      flag('medium', thin + ' paragraphs are a single sentence long',
        'A paragraph should carry one idea and develop it. Single-sentence paragraphs cost marks ' +
        'under Coherence and Cohesion.');
    }

    /* ---- 3. task-type specific ------------------------------------------- */
    if (no === 1) {
      var ovHits = findPhrases(text, OVERVIEW);
      if (!ovHits.length) {
        flag('high', 'No overview',
          'This is the single most expensive omission in Task 1 — without a sentence that states the ' +
          'overall pattern, Task Achievement is capped around Band 5. Add a paragraph starting ' +
          '<em>“Overall, …”</em> as your <strong>second</strong> paragraph, and put no figures in it.');
      } else {
        var half = firstIndexOf(text, OVERVIEW) / text.length;
        if (half > 0.6) {
          flag('medium', 'Your overview is at the very end',
            'It is safer as the second paragraph, straight after the introduction. Examiners look for ' +
            'it early, and a script that buries it sometimes reads as having none.');
        } else {
          ok('Has an overview sentence');
        }
      }

      var figures = (text.match(/\d+(\.\d+)?\s*(%|per cent|percent)?/g) || []).length;
      if (figures < 4) {
        flag('medium', 'Very few figures (' + figures + ')',
          'Task 1 asks you to report the data. Support each statement with a number — start points, ' +
          'end points, the peak and any crossover are usually enough.');
      } else if (figures > 22) {
        flag('medium', 'A lot of figures (' + figures + ')',
          'Reporting every value is listing, not summarising. Select the ones that carry the pattern.');
      } else {
        ok('Uses figures to support the description');
      }

      if (!findPhrases(text, COMPARISON).length) {
        flag('medium', 'No explicit comparison',
          'The rubric says “make comparisons where relevant”. Use <em>than, whereas, compared with, ' +
          'twice as many, by contrast</em> at least twice.');
      } else {
        ok('Makes comparisons between the series');
      }

      var op = findPhrases(text, OPINION_WORDS);
      if (op.length) {
        flag('medium', 'Reaction words in a description task: ' + op.slice(0, 4).join(', '),
          'Academic Task 1 is description only — no opinions, no reasons, no reactions. Delete these.',
          quoteAround(text, op[0]));
      }
      var fp = findPhrases(text, FIRST_PERSON);
      if (fp.length) {
        flag('high', 'First-person opinion in Task 1: “' + fp[0] + '”',
          'Never state a view in Academic Task 1. The data is the subject of your sentences, not you.',
          quoteAround(text, fp[0]));
      }
      var fig = findPhrases(text, FIGURATIVE);
      if (fig.length) {
        flag('medium', 'Sports/journalism metaphor: ' + fig.slice(0, 4).join(', '),
          'Task 1 wants neutral, factual register. Swap for plain description — <em>“the most widely ' +
          'held service”</em> rather than <em>“the absolute winner of the race”</em>.',
          quoteAround(text, fig[0]));
      }
      if (/\bwe (can )?see\b|\bwe (can )?observe\b|\blooking at the (graph|chart)\b/i.test(text)) {
        flag('medium', '“We can see…” / “Looking at the graph…”',
          'Spoken framing. Make the data the subject: <em>“Fixed broadband rose…”, “The figure fell to…”</em>');
      }
      if (/\bwill\b/i.test(text)) {
        flag('low', 'Future tense in Task 1',
          'If the period on the chart has ended, describe it in the past simple throughout. Only ' +
          'use <em>will</em> if the chart itself shows a projection.');
      }
    } else {
      var pos = findPhrases(text, POSITION);
      if (!pos.length) {
        flag('high', 'No clear position',
          'Every Task 2 prompt requires your own view, stated plainly. Put it in the introduction ' +
          'and repeat it in the conclusion.');
      } else {
        var where = firstIndexOf(text, POSITION) / text.length;
        if (where > 0.5) {
          flag('medium', 'Your position appears only in the second half',
            'State it in the introduction. An examiner should know your answer after 40 words.');
        } else {
          ok('States a clear position early');
        }
      }

      if (!findPhrases(text, EXAMPLES).length) {
        flag('medium', 'No example markers found',
          'Band 7 requires ideas to be <em>extended and supported</em>. Nothing here signals an ' +
          'illustration (<em>for example, for instance, such as, in my own experience</em>). You may ' +
          'well have illustrated a point without one — but a marker makes the support visible to the ' +
          'examiner, and abstract assertion repeated three times reads as one idea, not three.');
      } else {
        ok('Supports at least one idea with an example');
      }

      if (!findPhrases(text, COUNTER).length) {
        flag('medium', 'No counter-argument',
          'Acknowledging the strongest objection and answering it is the clearest single upgrade from ' +
          'Band 6.5 to 7.5 — even in an “agree or disagree” essay.');
      } else {
        ok('Engages with an opposing view');
      }

      var lastPara = paras[paras.length - 1] || '';
      if (paras.length > 2 && !findPhrases(lastPara, CONCLUSION).length) {
        flag('medium', 'No signposted conclusion',
          'End with <em>In conclusion</em> or <em>On balance</em> and restate the position in different ' +
          'words — not the same words as the introduction.');
      }

      /* prompt-type awareness, driven by the task label */
      var label = String(task.label || '').toLowerCase();
      if (label.indexOf('both view') > -1 || label.indexOf('discussion') > -1) {
        var sideMarkers = countPhrases(text, ['on the one hand', 'on the other hand', 'those who',
          'supporters', 'opponents', 'the opposing', 'the first view', 'the second view',
          'proponents', 'critics', 'some people', 'others']);
        if (sideMarkers < 2) {
          flag('high', 'This prompt says “discuss both views” — only one side is visible',
            'Both views must be presented fairly, each with its strongest reason, before you give ' +
            'your own. An essay that argues one side is marked down however good it is.');
        }
      }
      if (label.indexOf('outweigh') > -1 || /outweigh/i.test(task.prompt || '')) {
        if (!/outweigh|on balance|the advantages are|greater than|more significant/i.test(text)) {
          flag('high', 'This prompt asks whether the advantages outweigh the disadvantages',
            'It needs a verdict, not a balanced list. Say which side is heavier, in the introduction ' +
            'and again at the end.');
        }
      }
      if (label.indexOf('two-part') > -1 || /\?\s*$/.test((task.prompt || '').trim())) {
        /* two-part questions: crude check that both halves get airtime */
        if (paras.length < 4) {
          flag('low', 'Two-part question with few paragraphs',
            'Give each half of the question its own body paragraph so neither is short-changed.');
        }
      }
      if (/\?/.test(text)) {
        flag('low', 'Rhetorical question in the essay',
          'Common in speech, weak in academic writing. Turn it into a statement.');
      }
    }

    /* ---- 4. cohesion ------------------------------------------------------ */
    var conn = countPhrases(text, CONNECTORS);
    var perSentence = sents.length ? conn / sents.length : 0;
    if (no === 2 && conn === 0) {
      flag('medium', 'No linking words at all',
        'The reader cannot see the shape of the argument. Add one set of markers — ' +
        '<em>The first reason… A second argument… In conclusion…</em>');
    } else if (perSentence > 0.55 && conn >= 5) {
      flag('medium', 'Linking words in most sentences (' + conn + ' in ' + sents.length + ')',
        'Band 6 explicitly describes <em>over-use</em> of cohesive devices. At Band 8 the transitions ' +
        'are barely visible — connect through meaning (<em>“This matters because…”</em>) rather than ' +
        'by stacking Moreover / Furthermore / In addition.');
    } else if (conn >= 3) {
      ok('Signposting is present without being mechanical');
    }

    /* ---- 5. register and accuracy ---------------------------------------- */
    var contr = (text.match(/\b\w+'(t|s|re|ve|ll|d|m)\b/gi) || []);
    if (contr.length >= 2) {
      flag('medium', contr.length + ' contractions (' + contr.slice(0, 3).join(', ') + ')',
        'Write them out in full — <em>do not, it is, they are</em>. Contractions are fine in a ' +
        'General Training personal letter and nowhere else.');
    }
    var inf = findPhrases(text, INFORMAL);
    if (inf.length) {
      flag('medium', 'Informal phrasing: ' + inf.slice(0, 4).join(', '),
        'Replace with neutral equivalents — <em>a great deal of, children, a number of</em>.',
        quoteAround(text, inf[0]));
    }

    var misspelt = [];
    var seen = {};
    words(text).forEach(function (t) {
      if (MISSPELLINGS[t] && !seen[t]) { seen[t] = 1; misspelt.push(t + ' → ' + MISSPELLINGS[t]); }
    });
    if (misspelt.length) {
      flag('high', 'Spelling: ' + misspelt.slice(0, 5).join(', ') + (misspelt.length > 5 ? '…' : ''),
        'Spelling counts in every criterion that mentions it. Both British and American forms are ' +
        'accepted, but these are simply wrong.');
    }

    var thenThan = text.match(/\b(more|less|better|worse|higher|lower|greater|smaller|sharper|rather|other|larger)\s+then\b/gi);
    if (thenThan) {
      flag('high', '“' + thenThan[0] + '” should be “than”',
        '<em>Then</em> is time; <em>than</em> is comparison. A frequent and very visible error.',
        quoteAround(text, thenThan[0]));
    }

    /* possible comma splices — reported as "check", never as certain */
    var splices = text.match(/,\s+(we|they|it|this|he|she|you|i)\s+(is|are|was|were|will|would|should|can|could|have|has|had|do|does|did|must|may|might)\b/gi) || [];
    if (splices.length) {
      flag('medium', 'Possible comma splice' + (splices.length > 1 ? 's (' + splices.length + ')' : ''),
        'Two complete sentences joined by a comma. Use a full stop, a semicolon, or add ' +
        '<em>and / but / because</em>.', quoteAround(text, splices[0].trim()));
    }

    /* generic "he/his" and person drift */
    if (/\b(a person|one|a student|someone|an individual)\b[\s\S]{0,80}?\bhis\b/i.test(text) ||
        /\bhe or she\b/i.test(text) || /\bhim or her\b/i.test(text)) {
      flag('medium', 'Generic “he / his / he or she”',
        'Reads as dated, and it is where person-agreement errors creep in. Write in the plural: ' +
        '<em>students… their own understanding</em>.');
    }
    var persons = ['we ', 'you ', 'one ', 'they '].filter(function (p) {
      return lower(text).indexOf(' ' + p) > -1;
    });
    if (persons.length >= 3) {
      flag('medium', 'Mixing generic subjects (' + persons.map(function (p) { return p.trim(); }).join(', ') + ')',
        'Pick one and stay with it. Drifting between <em>we / you / one / they</em> costs marks under ' +
        'Coherence.');
    }

    /* ---- 6. sentence variety --------------------------------------------- */
    if (sents.length) {
      var lens = sents.map(countWords);
      var avg = lens.reduce(function (a, b) { return a + b; }, 0) / lens.length;
      var longest = Math.max.apply(null, lens);
      if (longest > 45) {
        flag('medium', 'One sentence is ' + longest + ' words long',
          'Long sentences are where grammar breaks down. Split anything over about 35 words.');
      }
      if (avg > 28) {
        flag('low', 'Average sentence length is ' + Math.round(avg) + ' words',
          'Vary it. A short sentence after two long ones makes an argument land.');
      } else if (avg < 12 && sents.length > 5) {
        flag('low', 'Average sentence length is only ' + Math.round(avg) + ' words',
          'Grammatical Range rewards complex sentences. Combine some of these with ' +
          '<em>which, although, because, so that</em>.');
      } else {
        ok('Sentence length is well varied');
      }
    }

    /* ---- 7. repetition ---------------------------------------------------- */
    var stop = ' the a an and or but of to in on for with is are was were be been being that this ' +
      'these those it its as at by from has have had not no so if then than which who whom whose ' +
      'will would can could should may might do does did more most less least very much many ' +
      'their there they them he she his her you your we our i my one two three also such about ' +
      'over under between into out up down after before while when where what how why all any ' +
      'some each other another both same own new used using use ';
    var freq = {}, promptWords = {};
    words(topicVocab(task)).forEach(function (t) { promptWords[t] = 1; });
    words(text).forEach(function (t) {
      if (t.length < 5 || stop.indexOf(' ' + t + ' ') > -1 || promptWords[t]) return;
      freq[t] = (freq[t] || 0) + 1;
    });
    var repeated = Object.keys(freq).filter(function (k) { return freq[k] >= 5; })
      .sort(function (a, b) { return freq[b] - freq[a]; });
    if (repeated.length) {
      flag('medium', 'Repeated words: ' + repeated.slice(0, 4).map(function (r) {
        return r + ' ×' + freq[r];
      }).join(', '),
        'Lexical Resource rewards range. Find a synonym or restructure the sentence — but never ' +
        'swap in a word you are not sure of, which costs more than the repetition.');
    }

    /* ---------------------------------------------------------------- sort */
    var rank = { high: 0, medium: 1, low: 2 };
    findings.sort(function (a, b) { return rank[a.severity] - rank[b.severity]; });

    return {
      empty: false,
      stats: {
        words: wc, effective: effective, copied: copied.count,
        sentences: sents.length, paragraphs: paras.length, minWords: minW,
        connectors: conn
      },
      findings: findings,
      good: good
    };
  }

  /* ------------------------------------------------------------- rendering */
  function panel(res, title) {
    var I = w.IELTS, el = I.el;
    var box = el('div', { class: 'wcheck' });
    if (!res || res.empty) {
      box.appendChild(el('p', { class: 'muted', text: 'Nothing written yet.' }));
      return box;
    }
    var high = res.findings.filter(function (f) { return f.severity === 'high'; }).length;

    box.appendChild(el('div', { class: 'wcheck-head' }, [
      el('h4', { text: title || 'Automatic check' }),
      el('span', { class: 'wcheck-score' + (high ? ' bad' : res.findings.length ? ' warn' : ' good'),
        text: res.findings.length
          ? res.findings.length + ' to fix' + (high ? ' · ' + high + ' costly' : '')
          : 'nothing flagged' })
    ]));

    var s = res.stats;
    var stat = el('div', { class: 'wcheck-stats' });
    [['words', s.words], ['effective', s.effective], ['minimum', s.minWords],
     ['paragraphs', s.paragraphs], ['sentences', s.sentences]].forEach(function (p) {
      stat.appendChild(el('span', {}, [
        el('b', { text: String(p[1]) }), el('i', { text: p[0] })
      ]));
    });
    box.appendChild(stat);

    if (res.findings.length) {
      var list = el('ul', { class: 'wcheck-list' });
      res.findings.forEach(function (f) {
        var li = el('li', { class: 'sev-' + f.severity }, [
          el('div', { class: 'wc-title' }, [
            el('span', { class: 'wc-dot' }),
            el('strong', { text: f.title })
          ]),
          el('div', { class: 'wc-detail', html: f.detail })
        ]);
        if (f.quote) li.appendChild(el('div', { class: 'wc-quote', text: '“' + f.quote + '”' }));
        list.appendChild(li);
      });
      box.appendChild(list);
    }

    if (res.good.length) {
      var d = el('details', { class: 'acc' }, [
        el('summary', { text: 'What you already did right (' + res.good.length + ')' })
      ]);
      var ul = el('ul', {});
      res.good.forEach(function (g) { ul.appendChild(el('li', { text: g })); });
      d.appendChild(ul);
      box.appendChild(d);
    }

    box.appendChild(el('p', { class: 'muted', style: 'margin:.7rem 0 0', html:
      '<small>This is a mechanical check, not a band score — it looks at length, structure, register ' +
      'and the errors that appear in almost every script. It cannot judge whether your ideas are any ' +
      'good, which is most of Task Response. Clearing every flag here is worth roughly half a band; ' +
      'the rest comes from what you actually say.</small>' }));
    return box;
  }

  w.WritingCheck = { run: run, panel: panel, countWords: countWords, sentences: sentences };
})(window);
