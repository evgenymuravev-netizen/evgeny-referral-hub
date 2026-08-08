# IELTS for UKVI — practice suite

A self-contained web app with **three complete practice tests**, each covering all four parts of
IELTS for UKVI in both modules:

| | Academic | General Training |
|---|---|---|
| Listening | 4 parts, 40 questions | same paper |
| Reading | 3 passages, 40 questions | 3 sections, 40 questions |
| Writing | graph/chart/process + essay | letter + essay |
| Speaking | 3 parts | same interview |

That is **360 automatically marked questions** (3 tests × 40 Listening + 40 Academic Reading +
40 General Training Reading), 12 writing tasks with Band 8+ model answers, and 3 full speaking
interviews.

## Running it

No build step and no dependencies. Open `index.html` in a browser, or visit the GitHub Pages URL.
Everything is plain HTML/CSS/ES5 JavaScript loaded with `<script>` tags, so it also works from
`file://`.

## What it does

- **Exam-accurate question types** — TRUE/FALSE/NOT GIVEN, YES/NO/NOT GIVEN, matching headings,
  matching information, matching features, multiple choice (single and "choose TWO"), note / form /
  table / flow-chart / summary completion, summary completion from a word list, sentence completion,
  short answer, and map, plan and diagram labelling.
- **Real timings** — 30 + 5 min Listening, 60 min Reading, 60 min Writing, and a stage-by-stage
  11–14 min Speaking interview, with a question palette, flagging and auto-submit at zero.
- **Listening audio with no downloads** — transcripts are spoken by the browser's speech engine,
  with different voices per speaker, the official narration, and the real inter-part pauses.
  Exam mode plays once straight through; practice mode allows replay and shortens the silences.
  If the browser has no voices installed, the section still runs to time and each line is displayed.
- **Automatic band scoring** using the published raw-score conversion tables — and note that the
  General Training Reading curve is deliberately harsher than the Academic one, as in the real test.
- **Strict marking** — word limits are enforced (three words scores zero where the rubric says two),
  while case, hyphenation, `&`/`and` and optional leading articles are accepted.
- **Answer review** — every question shows the line of the passage or transcript the answer came
  from, plus the full audio script and the passages re-rendered with your answers marked.
- **Writing and Speaking** — model answers, marker's checklists, planning hints, and self-assessment
  against the four official criteria (Task 2 weighted double, as in the real test). Speaking records
  you through the microphone, if you allow it, so you can listen back.
- Progress and scores are kept in `localStorage`. Nothing is sent anywhere.

## Layout

```
index.html            app shell + script tags
assets/app.css        styles (light and dark)
assets/core.js        answer checking, band tables, scoring, storage
assets/render.js      question renderers, note blocks, SVG chart engine
assets/app.js         routing, timers, listening player, writing pad, speaking coach, results
data/registry.js      test registry
data/testN/listening.js   4 parts: questions + full transcript + inline SVG map/plan
data/testN/reading.js     Academic and General Training passages + questions
data/testN/productive.js  Writing tasks (with figures + models) and the Speaking interview
```

### Adding a test

Copy a `data/testN/` directory, change the id passed to `IELTSData.test(...)`, and add the three
script tags to `index.html`. Every question carries an `evidence` string that is shown in the
review table — keep filling it in, it is the most useful part of the app for a learner.

## A note on the content

All passages, transcripts, questions and model answers were written for this app. It follows the
official IELTS for UKVI format, timings and marking, but it is not produced by, endorsed by or
affiliated with the IELTS partners (British Council, IDP: IELTS Australia, Cambridge University
Press & Assessment). "IELTS for UKVI" differs from standard IELTS only in administration — approved
test centres, video recording and a verifiable Test Report Form — so ordinary IELTS material is the
correct preparation, provided you book the UKVI version on the day.
