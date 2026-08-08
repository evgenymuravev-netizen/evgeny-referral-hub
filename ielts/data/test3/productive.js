/* Practice Test 3 — Writing (Academic + General Training) and Speaking */
(function () {

  function stage(n, x, y, lines) {
    var t = lines.map(function (l, i) {
      return '<tspan x="' + (x + 95) + '" dy="' + (i === 0 ? 0 : 15) + '">' + l + '</tspan>';
    }).join('');
    return '<g>' +
      '<rect x="' + x + '" y="' + y + '" width="190" height="92" rx="8" fill="var(--panel)" ' +
      'stroke="currentColor" stroke-width="1.6"/>' +
      '<circle cx="' + (x + 16) + '" cy="' + (y + 16) + '" r="11" fill="#4a7dfc"/>' +
      '<text x="' + (x + 16) + '" y="' + (y + 20) + '" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">' + n + '</text>' +
      '<text x="' + (x + 95) + '" y="' + (y + 42) + '" text-anchor="middle" font-size="12.5" fill="currentColor">' + t + '</text>' +
      '</g>';
  }
  function arrowRight(x1, x2, y) {
    return '<path d="M' + x1 + ' ' + y + ' H' + (x2 - 9) + '" stroke="currentColor" stroke-width="2" fill="none"/>' +
      '<path d="M' + (x2 - 12) + ' ' + (y - 6) + ' l9 6 -9 6" fill="currentColor"/>';
  }
  function arrowLeft(x1, x2, y) {
    return '<path d="M' + x1 + ' ' + y + ' H' + (x2 + 9) + '" stroke="currentColor" stroke-width="2" fill="none"/>' +
      '<path d="M' + (x2 + 12) + ' ' + (y - 6) + ' l-9 6 9 6" fill="currentColor"/>';
  }

  var PROCESS = [
    '<svg viewBox="0 0 740 400" width="740" role="img" aria-label="Flow chart of the glass bottle recycling process"',
    ' style="color:var(--ink-2)" xmlns="http://www.w3.org/2000/svg">',
    stage(1, 30, 40, ['Used bottles collected', 'from homes and', 'bottle banks']),
    stage(2, 275, 40, ['Sorted by colour:', 'clear, green, brown']),
    stage(3, 520, 40, ['Magnets remove metal;', 'lids and paper labels', 'blown off by air']),
    stage(4, 520, 240, ['Glass crushed into', 'small pieces known as', '"cullet"']),
    stage(5, 275, 240, ['Cullet mixed with sand,', 'soda ash and limestone,', 'melted at 1,500°C']),
    stage(6, 30, 240, ['Moulded into new', 'bottles, cooled slowly,', 'then filled and sold']),
    arrowRight(220, 275, 86), arrowRight(465, 520, 86),
    /* down the right hand side */
    '<path d="M615 132 V240" stroke="currentColor" stroke-width="2" fill="none"/>',
    '<path d="M609 228 l6 12 6 -12" fill="currentColor"/>',
    arrowLeft(520, 465, 286), arrowLeft(275, 220, 286),
    /* return loop */
    '<path d="M125 332 V366 H660 V150" stroke="currentColor" stroke-width="1.6" fill="none" stroke-dasharray="6 4"/>',
    '<path d="M654 162 l6 -12 6 12" fill="currentColor"/>',
    '<text x="390" y="384" text-anchor="middle" font-size="12" fill="currentColor" fill-opacity=".8">' +
      'empty bottles returned for recycling</text>',
    '</svg>'
  ].join('');

  /* ------------------------------------------------ ACADEMIC WRITING */
  IELTSData.add('test3', 'writingAcademic', {
    tasks: [
      {
        label: 'Describing a process',
        minWords: 150, minutes: 20,
        instructions: 'You should spend about 20 minutes on this task.\n\n' +
          'The diagram below shows how glass bottles are recycled.\n\n' +
          'Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
        figure: { kind: 'svg', svg: PROCESS, caption: 'The recycling of glass bottles' },
        tips: [
          'A process needs a different overview from a chart: say how many stages there are, where it begins and ends, and whether it is linear or a cycle. This one is a cycle — say so.',
          'The present simple passive is the natural tense throughout: *the glass **is crushed**, the cullet **is mixed** with…*',
          'Sequencing language should vary but stay simple: "Once… has been…", "At this point", "The next stage involves", "Finally".',
          'Do not invent detail the diagram does not show, and do not speculate about why anything is done.'
        ],
        checklist: [
          'The overview states the number of stages and that the process is cyclical.',
          'Every stage in the diagram is mentioned.',
          'The passive voice is used correctly and consistently.',
          'Sequencers are varied rather than "firstly, secondly, thirdly, fourthly".',
          'Technical terms from the diagram ("cullet") are used and, where possible, explained.'
        ],
        model: [
          'The diagram illustrates the way in which used glass bottles are processed and turned into new ones.',
          'Overall, the process consists of six main stages, beginning with the collection of waste bottles and ending with the sale of newly made ones. It is a closed cycle rather than a linear sequence, since the bottles produced at the final stage eventually re-enter the process at the beginning.',
          'At the first stage, used bottles are gathered from households and from public bottle banks. They are then taken to a processing plant, where they are separated according to colour into clear, green and brown glass. Once this has been done, the glass passes through a cleaning stage in which metal items are extracted by magnets while lids and paper labels are removed using jets of air.',
          'The cleaned glass is subsequently crushed into small fragments known as cullet. This material is combined with three raw ingredients — sand, soda ash and limestone — and the mixture is heated in a furnace to a temperature of 1,500°C, at which point it becomes molten. In the final stage, the liquid glass is shaped in moulds to form new bottles, which are cooled gradually before being filled and sold. After use, these bottles are returned for collection and the cycle begins again.'
        ],
        modelNote: '221 words. Note how few sequencers are actually needed once the grammar is doing the work: "Once this has been done", "subsequently", "at which point", "In the final stage".'
      },
      {
        label: 'Essay (advantages and disadvantages)',
        minWords: 250, minutes: 40,
        instructions: 'You should spend about 40 minutes on this task.\n\nWrite about the following topic:',
        prompt: 'An increasing number of people buy the things they need online rather than in shops.\n\n' +
          '**Do the advantages of this development outweigh the disadvantages?**',
        closing: 'Give reasons for your answer and include any relevant examples from your own knowledge or experience.',
        tips: [
          '"Do the advantages outweigh the disadvantages?" demands a verdict, not a list. Answer the question in your introduction and again at the end.',
          'The essay is weighing, so use comparative language: "the gain here is larger than the loss because…", "this matters less than it appears".',
          'Two strong advantages and one serious disadvantage, properly weighed, beats three of each listed flatly.',
          'Common trap: writing an "advantages and disadvantages" essay and forgetting to give a verdict. That alone caps Task Response at 6.'
        ],
        checklist: [
          'A verdict is given in the introduction, not only at the end.',
          'Both sides appear, but the essay clearly weighs them rather than balancing them.',
          'At least one point is developed with a concrete consequence or example.',
          'The conclusion follows from the argument rather than repeating the introduction word for word.',
          'Over 250 words.'
        ],
        model: [
          'In most high-income countries, somewhere between a fifth and a third of retail spending has moved online in the space of two decades. In my view the advantages of this shift are substantial for individual consumers, but they do not outweigh the disadvantages, because the costs fall on things that individuals do not pay for directly and cannot easily replace.',
          'The benefits are real and should not be minimised. Price transparency has transferred a great deal of power to the buyer: a shopper can compare twenty sellers in a minute, which was impossible when the effective choice was whichever two shops were within reach. Access has improved even more dramatically for people who are not well served by physical retail — those in rural areas, people with limited mobility, and anyone looking for something specialised. A person needing a particular medical aid or a spare part for a fifteen-year-old appliance can now obtain it in two days rather than not at all.',
          'The disadvantages are less visible because they are collective. When enough spending leaves a town centre, the shops that close take with them the reason for anyone to walk down that street, and what follows is not a slightly quieter high street but a derelict one, since retail decline is self-reinforcing. There are also consequences for work: warehouse and delivery employment is generally more closely monitored, more physically demanding and less secure than the shop work it has replaced, and the environmental effect of individual parcel deliveries and high return rates is worse than that of one person visiting several shops in a single trip.',
          'Weighing these, I would argue that the convenience gained is genuine but marginal — most of us are saving minutes — whereas what is lost is the viability of shared public places and the quality of a large number of jobs. Those are harder to rebuild than they are to lose.',
          'In conclusion, although online shopping has brought clear benefits in choice and accessibility, its social and environmental costs are greater, and I do not think the advantages outweigh them.'
        ],
        modelNote: '341 words. The phrase "the costs fall on things that individuals do not pay for directly" in the introduction sets up the whole argument — a single sentence that tells the examiner the essay has a thesis rather than a list.'
      }
    ]
  });

  /* ---------------------------------------- GENERAL TRAINING WRITING */
  IELTSData.add('test3', 'writingGeneral', {
    tasks: [
      {
        label: 'Letter (formal complaint)',
        minWords: 150, minutes: 20,
        instructions: 'You should spend about 20 minutes on this task.',
        prompt: 'You recently paid to attend a two-day training course. The course was not what had been described ' +
          'in the advertisement.\n\nWrite a letter to the training company.',
        bulletsLead: 'In your letter:',
        bullets: [
          'give details of the course you attended',
          'explain how it differed from what was advertised',
          'say what you would like the company to do'
        ],
        closing: 'Write at least 150 words. You do NOT need to write any addresses.\n\n' +
          'Begin your letter: *Dear Sir or Madam,*',
        tips: [
          '"Dear Sir or Madam" must be closed with "Yours faithfully". Getting this wrong is a small error that examiners always notice.',
          'Formal register: no contractions, no exclamation marks, no rhetorical questions. Use "I am writing to…", "I would be grateful if…", "I trust that…".',
          'Facts before feelings. Dates, the course title, the price and a booking reference make the complaint credible; adjectives do not.',
          'Ask for one specific remedy and say what you will do if it is not offered — politely.'
        ],
        checklist: [
          'The purpose of the letter is stated in the first sentence.',
          'All three bullets are covered with concrete detail.',
          'The register is formal throughout, with no lapses into informality.',
          'A specific remedy is requested.',
          'It opens "Dear Sir or Madam" and closes "Yours faithfully".'
        ],
        model: [
          'Dear Sir or Madam,',
          'I am writing to express my dissatisfaction with the two-day course "Practical Data Analysis for Managers", which I attended at your Manchester centre on 3 and 4 March. My booking reference is TP-40912 and the fee paid was £595.',
          'Your advertisement stated that the course was aimed at experienced managers, that group sizes were limited to twelve, and that participants would spend the majority of the time working on their own datasets with individual support from the tutor. In practice, none of these applied. There were twenty-nine people in the room, roughly half of whom had no prior experience of the software, and as a result the first day was given over almost entirely to basic instruction. The promised practical sessions were reduced to a single ninety-minute exercise using a sample dataset supplied by the tutor, and there was no opportunity to work on our own material at all.',
          'I raised this with the course administrator at lunchtime on the first day and was told that the format had been changed some weeks earlier. No one had informed those of us who had already booked.',
          'In these circumstances I do not believe the course delivered what was advertised, and I would be grateful if you would refund the fee in full. I would also suggest that the description on your website is amended so that future participants are not misled in the same way.',
          'I look forward to your response within fourteen days.',
          'Yours faithfully,',
          'Anna Petrova'
        ],
        modelNote: '250 words. The structure is complaint letter orthodoxy: what was promised, what actually happened, what I already did about it, what I want. The final deadline is firm without being aggressive.'
      },
      {
        label: 'Opinion essay (agree / disagree)',
        minWords: 250, minutes: 40,
        instructions: 'You should spend about 40 minutes on this task.\n\nWrite about the following topic:',
        prompt: 'In many countries people are living much longer after they stop working. Some people believe that ' +
          'the official retirement age should therefore be raised.\n\n**To what extent do you agree or disagree?**',
        closing: 'Give reasons for your answer and include any relevant examples from your own knowledge or experience.',
        tips: [
          'This topic has an obvious counter-argument that weaker essays miss: life expectancy has not risen equally for everyone, and manual workers are affected very differently from office workers. Using it will lift your Task Response noticeably.',
          '"To what extent" allows a partial agreement, and a partial position is easier to argue well than an absolute one.',
          'Be careful with statistics you half-remember. "Life expectancy has risen considerably" is safe; a specific figure you invent is not, and an examiner may notice.',
          'Keep the register neutral. This is an essay, not a speech: avoid "we must act now!" and rhetorical questions.'
        ],
        checklist: [
          'A clear position, stated early and maintained.',
          'The strongest counter-argument is addressed rather than ignored.',
          'Ideas are grouped so that each paragraph makes one point.',
          'The conclusion offers a qualification or condition rather than pure repetition.',
          'Over 250 words.'
        ],
        model: [
          'Populations in most developed countries are ageing, and a pension system designed when people lived for ten years after retiring is now supporting them for twenty-five. I agree that the retirement age will have to rise, but only in a form that recognises how unequally longer life has been distributed.',
          'The arithmetic behind the argument is difficult to dispute. State pensions in most countries are funded by current taxpayers rather than from money the recipient saved, so the ratio between people working and people drawing a pension is what determines whether the system holds. In the United Kingdom that ratio has fallen from around four to one to roughly three to one and continues to fall. The alternatives to raising the pension age are higher taxes on a shrinking workforce or smaller pensions for people who have no way of earning more, and both seem to me worse.',
          'There is also a positive case that tends to be overlooked. Many people in their sixties want to keep working and are pushed out by convention rather than incapacity, losing both income and a large part of their social life in the same week. A later and more flexible retirement age would allow the ones who want to continue to do so.',
          'The serious objection, however, is that "we are all living longer" is not true in the way the argument requires. Healthy life expectancy — the years lived without significant illness — differs by more than a decade between the richest and poorest districts of the same city, and it is precisely the people who did physically demanding work from the age of sixteen who reach sixty-eight least able to continue. Raising the age uniformly asks the most of those who have already given the most.',
          'In conclusion, I agree that the retirement age should rise, but a single national figure applied to everyone is the wrong instrument. It should be accompanied by earlier access for those in physically demanding occupations and by a genuine right to reduce hours gradually rather than stopping all at once.'
        ],
        modelNote: '350 words. The fourth paragraph is what makes this Band 8 rather than Band 7: it takes the strongest argument against the writer\'s own position seriously and then resolves it in the conclusion instead of ignoring it.'
      }
    ]
  });

  /* ------------------------------------------------------- SPEAKING */
  IELTSData.add('test3', 'speaking', {
    part1: [
      { topic: 'your daily routine',
        questions: [
          'What time do you usually get up?',
          'Are you a morning person or an evening person?',
          'Has your routine changed much in the last few years?',
          'Is there anything you would like to do more often?'
        ] },
      { topic: 'music',
        questions: [
          'What kind of music do you listen to?',
          'When do you usually listen to music?',
          'Did you learn a musical instrument at school?',
          'Do you think children should be taught music?'
        ] },
      { topic: 'shopping',
        questions: [
          'Do you enjoy shopping?',
          'Do you prefer shopping alone or with other people?',
          'Have your shopping habits changed in the last few years?'
        ] },
      { topic: 'friends',
        questions: [
          'How often do you see your friends?',
          'Do you prefer a large group of friends or a few close ones?',
          'Is it easy to make new friends where you live?'
        ] }
    ],
    part2: {
      title: '**Describe an important decision you had to make.**',
      bullets: [
        'what the decision was',
        'when you had to make it',
        'how you decided'
      ],
      last: 'and explain why the decision was important to you.',
      followUp: 'Do you think you made the right choice?'
    },
    part3: {
      link: 'making difficult decisions',
      groups: [
        { theme: 'How people decide',
          questions: [
            'Do you think people rely too much on other people\'s advice when making decisions?',
            'Are older people better at making decisions than younger people?',
            'Is it possible to have too much information when you are deciding something?'
          ] },
        { theme: 'Decisions in organisations',
          questions: [
            'Should important decisions in a company be made by one person or by a group?',
            'Why do organisations sometimes make decisions that are obviously wrong?',
            'Do you think governments should ask the public to vote on major decisions?'
          ] }
      ]
    },
    samples: [
      { q: 'Part 2 — Describe an important decision you had to make.',
        a: 'The decision I want to describe is turning down a promotion, which at the time felt like the most reckless thing I\'d ever done.\n\nIt came up about three years ago. I\'d been at the company for five years and I was offered a regional role — more money, a bigger team, the obvious next step. The catch was that it meant relocating and travelling four days a week, and my father had just been diagnosed with something serious.\n\nAs for how I decided, I\'m not sure "decided" is really the word — I agonised, for about a fortnight. What I found genuinely useful in the end was something a colleague said, which was to stop asking which option was better and start asking which one I could live with if it went badly. Once I framed it that way it wasn\'t close. If the job went wrong I\'d find another one; if I wasn\'t there that year I\'d never get it back.\n\nIt was important partly for the obvious reason, which is that I did get that year with my father. But it also changed how I think about work generally. I\'d assumed, without ever examining it, that turning something down would mark me permanently — and it simply didn\'t. I was offered something similar eighteen months later. So the second thing I took from it is that most of these decisions are far less final than they feel while you\'re making them.',
        why: 'About 250 words. Each bullet gets a paragraph and the final section genuinely explains *why it mattered* — twice, at two different levels. "I\'m not sure \'decided\' is really the word" is the kind of natural self-correction that signals fluency rather than a memorised script.' },
      { q: 'Part 3 — Should important decisions in a company be made by one person or by a group?',
        a: 'I think it depends far more on the type of decision than on any general principle. For something reversible — trying a new supplier, changing a process — one person deciding quickly is almost always better, because the cost of being wrong is small and the cost of a three-week discussion is real. Where a decision can\'t be undone, though, like closing a site or acquiring a company, you want several people who genuinely disagree in the room, and crucially you want the most junior person to speak first. Otherwise what looks like a group decision is really one person\'s decision with witnesses.',
        why: 'Two categories, a criterion that separates them, and a sharp closing line. Note that it answers in about 100 words — Part 3 answers should be substantial but they should not become monologues.' },
      { q: 'Part 3 — Is it possible to have too much information when you are deciding something?',
        a: 'Yes, and I think it\'s more common than people admit. Beyond a certain point extra information doesn\'t improve the choice; it just increases your confidence in whatever you were already leaning towards, because you go looking for things that confirm it. There\'s also a more human problem, which is that researching feels like progress. You can spend a month reading reviews and genuinely believe you\'re making a decision, when what you\'re actually doing is postponing one.',
        why: 'Answers "yes", gives a mechanism, then adds a second, different kind of reason. Two developed reasons is the reliable shape for a Part 3 answer.' }
    ],
    language: [
      '**Narrating a decision:** "It came down to…", "What tipped it was…", "In hindsight…", "At the time it felt…"',
      '**Hedging a claim:** "I suspect…", "As far as I can tell…", "I could be wrong about this, but…"',
      '**Structuring an argument aloud:** "There are really two issues here…", "That\'s the practical side; the other thing is…"',
      '**Contrasting past and present:** "Whereas a generation ago…", "That used to be true, but…"',
      '**Recovering when you lose the thread:** "Sorry, where was I — yes, the point I was making was…" Examiners score coherence, not perfection; recovering smoothly is worth more than never stumbling.',
      '**Avoid:** answering a Part 3 question with a Part 1 answer. If your reply is one sentence long, add a reason, then an example, then a limitation.'
    ]
  });
})();
