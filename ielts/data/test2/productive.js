/* Practice Test 2 — Writing (Academic + General Training) and Speaking */
(function () {

  /* ------------------------------------------------ ACADEMIC WRITING */
  IELTSData.add('test2', 'writingAcademic', {
    tasks: [
      {
        label: 'Describing a bar chart',
        minWords: 150, minutes: 20,
        instructions: 'You should spend about 20 minutes on this task.\n\n' +
          'The chart below shows the main reason given for choosing a holiday destination by three age groups ' +
          'in one country in 2022.\n\n' +
          'Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
        figure: {
          kind: 'group-bar',
          title: 'Main reason for choosing a holiday destination, by age group (%)',
          categories: ['Cost', 'Climate', 'Culture and history', 'Food', 'Friend\'s recommendation'],
          yTitle: '% giving this as their main reason', max: 50,
          series: [
            { name: '18–29', values: [46, 22, 9, 15, 8] },
            { name: '30–49', values: [33, 26, 17, 14, 10] },
            { name: '50 and over', values: [21, 34, 28, 9, 8] }
          ]
        },
        tips: [
          'With a grouped bar chart, look for the pattern *across* the groups, not just the tallest bar. Here, three of the five reasons change steadily with age and two barely move.',
          'Your overview should say what the age pattern is, not which reason is biggest overall.',
          'Do not describe every bar. Fifteen numbers in an answer is a list, not a summary.',
          'Language of proportion: "roughly half", "just under a third", "a little over one in five".'
        ],
        checklist: [
          'The overview identifies how the pattern changes with age.',
          'Both the increasing reasons (climate, culture) and the decreasing one (cost) are covered.',
          'The reasons that stay flat are mentioned briefly rather than ignored.',
          'Percentages are attached to comparisons rather than listed on their own.',
          'No explanations are offered for why the groups differ.'
        ],
        model: [
          'The bar chart shows the proportion of people in three age bands who gave each of five factors as their main reason for choosing where to go on holiday in one country in 2022.',
          'Overall, three of the five reasons were strongly related to age. Cost mattered far more to the youngest travellers than to the oldest, while climate and cultural interest showed the opposite pattern. Food and personal recommendations, by contrast, were given by a similar minority in every group.',
          'Cost was by far the most important consideration for 18- to 29-year-olds, cited by 46%, or almost half. This share fell to a third among those aged 30 to 49 and to only 21% among the over-50s, less than half the figure for the youngest group. Climate moved in the opposite direction, rising from 22% to 26% and then to 34%, at which point it was the leading reason for the oldest travellers. The steepest relative change was in culture and history, which was the main reason for fewer than one in ten young travellers but for more than one in four of those aged 50 and over.',
          'The remaining two factors were largely unaffected by age. Food was chosen by 15%, 14% and 9% respectively, and a friend\'s recommendation by between 8% and 10% in all three groups, making it the least significant factor overall.'
        ],
        modelNote: '213 words. The comparisons ("less than half the figure", "the opposite direction", "the steepest relative change") are doing the work — that is what separates a Band 7 description from a Band 8 one.'
      },
      {
        label: 'Discussion essay (both views + opinion)',
        minWords: 250, minutes: 40,
        instructions: 'You should spend about 40 minutes on this task.\n\nWrite about the following topic:',
        prompt: 'Some people believe that governments should spend public money on preserving old buildings. ' +
          'Others argue that this money would be better spent on building new housing.\n\n' +
          '**Discuss both these views and give your own opinion.**',
        closing: 'Give reasons for your answer and include any relevant examples from your own knowledge or experience.',
        tips: [
          'You must genuinely discuss both views. An essay that gives one side two sentences and the other three paragraphs is marked down under Task Response however good the argument is.',
          'Your own opinion is required and must be clear. It can side with one view, or take a third position — but it cannot be absent.',
          'Do not begin with "Nowadays, in this modern world…". Start with the specific tension in the question.',
          'A good structure: intro (frame + position) / view 1 / view 2 / your position developed / conclusion. Four or five paragraphs, no more.'
        ],
        checklist: [
          'Both views are presented fairly and with their strongest supporting reason.',
          'My own opinion is stated in the introduction and developed, not just repeated.',
          'Each paragraph opens with a sentence that tells the reader what it will argue.',
          'There is at least one specific example rather than only abstract reasoning.',
          'Over 250 words, with a conclusion that adds a final thought rather than repeating.'
        ],
        model: [
          'Every city with a housing shortage and a historic centre eventually has to decide how much of its budget belongs to the past. Some argue that public funds should protect old buildings; others that the same money should be used to house people who need somewhere to live. My own view is that the choice is largely a false one, and that where it is genuinely a choice, housing should come first.',
          'The case for preservation rests on the fact that historic buildings cannot be recreated once lost. A terrace demolished in 1968 is gone permanently, and with it the character that makes a place recognisable and worth visiting. There is also a straightforward economic argument: heritage tourism supports a great many jobs, and cities that destroyed their old centres in the post-war decades have frequently spent large sums since trying to manufacture the atmosphere they removed.',
          'The opposing case is more immediate. Housing shortages have consequences that are measurable in a way that architectural loss is not — long commutes, overcrowding, families in temporary accommodation for years. It is difficult to justify spending several million pounds restoring a disused mill when the same sum could provide homes for thirty families, and the argument that this is short-sighted tends to be made by people who already have somewhere to live.',
          'I take the second view more seriously, but I doubt the two aims conflict as often as the question implies. Most preservation money goes on buildings that are then reused, and converting a redundant warehouse into flats achieves both objectives at once. The genuine conflict arises only with buildings that cannot be adapted — an isolated ruin, a country house too costly to run — and in those cases I would accept the loss.',
          'In conclusion, both aims are legitimate, but preservation should normally be pursued through reuse rather than as an end in itself, and where a real choice must be made, the needs of people currently without adequate housing should decide it.'
        ],
        modelNote: '331 words — comfortably long, but every paragraph is doing something different. Note the fourth paragraph: challenging the premise of the question is a high-band move, provided you still answer it.'
      }
    ]
  });

  /* ---------------------------------------- GENERAL TRAINING WRITING */
  IELTSData.add('test2', 'writingGeneral', {
    tasks: [
      {
        label: 'Letter (informal, to a friend)',
        minWords: 150, minutes: 20,
        instructions: 'You should spend about 20 minutes on this task.',
        prompt: 'A friend has written to tell you that they are thinking of moving to the city where you live, ' +
          'and has asked for your advice.\n\nWrite a letter to your friend.',
        bulletsLead: 'In your letter:',
        bullets: [
          'say what you like and dislike about living there',
          'give some advice about finding somewhere to live',
          'suggest what your friend should do in their first week'
        ],
        closing: 'Write at least 150 words. You do NOT need to write any addresses.\n\n' +
          'Begin your letter: *Dear Miriam,*',
        tips: [
          'Informal does not mean careless. Contractions, phrasal verbs and direct questions are exactly right; spelling errors and missing paragraphs are not.',
          'Open by reacting to their news — a letter that starts straight in on bullet point one reads as a form.',
          'Personal letters need warmth: ask a question, offer something concrete ("stay with us while you look").',
          'Close in kind: "Let me know what you decide", "Can\'t wait to hear more", then "Love" or "All the best".'
        ],
        checklist: [
          'All three bullets are covered.',
          'The tone is consistently friendly and personal from start to finish.',
          'There is a natural opening reaction to the friend\'s news.',
          'The advice is specific to a real situation, not generic.',
          'At least 150 words, in clear paragraphs.'
        ],
        model: [
          'Dear Miriam,',
          'What brilliant news — I read your message twice to make sure I\'d understood it! Of course I\'ll tell you everything, though I should warn you I\'m not exactly impartial.',
          'The best thing about living here is how easy it is to get around. I sold my car after six months and I honestly haven\'t missed it: the trams run every few minutes and everything I need is within about twenty minutes. The other thing I love is that it\'s small enough that you keep bumping into people you know. The downside, and I won\'t pretend otherwise, is the winter. It\'s grey from November to March and the rain is relentless, so bring proper waterproofs and don\'t judge the place until April.',
          'On somewhere to live, my strong advice is not to sign anything before you\'ve visited. Rents look reasonable online but the cheap areas are cheap for a reason, and the good ones — Northgate and around the park — go within a day or two. Register with a couple of agents by phone rather than online, because that\'s genuinely how everything moves here, and be ready to view at short notice.',
          'For your first week: get a transport card on day one, walk everywhere instead of taking the tram so you learn the geography, and come to the Sunday market with me. You\'ll meet half the city in an hour.',
          'And obviously you\'re staying with us while you look — I won\'t hear anything else. When are you thinking of coming over?',
          'Love,',
          'Nadia'
        ],
        modelNote: '265 words. The question at the end and the offer of a room are what make it read as a real letter to a real person, which is precisely what Task Achievement rewards in an informal task.'
      },
      {
        label: 'Discussion essay (both views + opinion)',
        minWords: 250, minutes: 40,
        instructions: 'You should spend about 40 minutes on this task.\n\nWrite about the following topic:',
        prompt: 'Some people think that children should begin formal education at the age of four or five. ' +
          'Others believe that they should not start school until they are at least seven.\n\n' +
          '**Discuss both these views and give your own opinion.**',
        closing: 'Give reasons for your answer and include any relevant examples from your own knowledge or experience.',
        tips: [
          'Be careful with "formal education" — the whole argument turns on what counts as formal, and defining it early gives you an easy route to a nuanced position.',
          'Personal experience is welcome in GT Task 2 and can be the most convincing evidence you have. Use it as an illustration, not as the whole argument.',
          'Avoid absolute claims you cannot support ("studies prove that…"). "There is reasonable evidence that…" costs nothing and is safer.',
          'Watch your paragraph length: if one paragraph is twice as long as the others, it is probably two paragraphs.'
        ],
        checklist: [
          'Both starting ages are argued for, not just described.',
          'My position is clear and consistent.',
          'The essay distinguishes between school attendance and formal instruction.',
          'A specific example or comparison is used.',
          'Over 250 words with a genuine conclusion.'
        ],
        model: [
          'Countries differ enormously on when childhood ends and schooling begins: children in England start at four, while their counterparts in Finland and much of Scandinavia do not begin until they are seven. Both systems produce literate adults, which suggests the question is less about the age itself than about what happens at that age. My view is that starting later is preferable, provided the intervening years are properly used.',
          'The argument for an early start is essentially about equality. Children arrive at school with very unequal amounts of language and support behind them, and the gap between them is already measurable at three. School is the one place where a child from a household with few books encounters an adult whose job it is to read with them every day. Leaving those children at home for two more years does not make the gap smaller; it usually makes it larger.',
          'Those who favour a later start point out that the evidence for early formal instruction is surprisingly weak. Any advantage in reading tends to disappear by the age of eleven, while the disadvantages — children labelled as failing before they are six, and a narrowing of the play that develops attention and self-control — persist. My own nephew was assessed as "below expected level" at five and was reading fluently a year later, having simply not been ready.',
          'What convinces me is that the two positions disagree less than they appear to. The Finnish seven-year-old has not been sitting at home; they have been in a state-funded, well-staffed kindergarten with trained teachers, singing, building and being read to. That, rather than the age on the birth certificate, is what makes the later start work. Where such provision does not exist, starting school early is genuinely the lesser evil.',
          'In conclusion, I favour beginning formal instruction at six or seven, but only in a system that offers high-quality, universal early years education before it. Delaying school without that is not a gentler childhood — it is simply less.'
        ],
        modelNote: '337 words. Notice how the final body paragraph reconciles the two views rather than restating one of them. That is the difference between "discuss both views" and "list both views".'
      }
    ]
  });

  /* ------------------------------------------------------- SPEAKING */
  IELTSData.add('test2', 'speaking', {
    part1: [
      { topic: 'the area you live in',
        questions: [
          'Do you live in a house or a flat?',
          'What do you like most about the area you live in?',
          'Is it a good place for children to grow up? Why?',
          'Would you recommend it to a visitor?'
        ] },
      { topic: 'weather',
        questions: [
          'What is the weather like where you live?',
          'Which season do you prefer, and why?',
          'Does the weather ever change your plans?'
        ] },
      { topic: 'reading',
        questions: [
          'Do you read much in your free time?',
          'Do you prefer paper books or reading on a screen?',
          'Were you read to as a child?',
          'Do you think people read less than they used to?'
        ] },
      { topic: 'technology',
        questions: [
          'How much time do you spend on your phone each day?',
          'Is there any technology you would like to use less?',
          'What piece of technology could you not manage without?'
        ] }
    ],
    part2: {
      title: '**Describe a place you go to when you want to relax.**',
      bullets: [
        'where it is',
        'how often you go there',
        'what you do there'
      ],
      last: 'and explain why this place helps you relax.',
      followUp: 'Do other people you know go there too?'
    },
    part3: {
      link: 'places where people relax',
      groups: [
        { theme: 'Rest and stress',
          questions: [
            'Why do you think many people find it difficult to relax these days?',
            'Is being busy always a bad thing?',
            'Do people in your country get enough holiday?'
          ] },
        { theme: 'Public space',
          questions: [
            'How important are parks and other public spaces in a city?',
            'Who should pay for maintaining them — the government or local people?',
            'Do you think cities will have more or less green space in the future?'
          ] }
      ]
    },
    samples: [
      { q: 'Part 1 — Do you prefer paper books or reading on a screen?',
        a: 'Paper, definitely, although I read far more on a screen simply because it\'s what\'s in my hand. With a physical book I remember where things were on the page, which sounds trivial but genuinely helps me follow an argument. On a phone I skim without meaning to.',
        why: 'A direct answer, an honest contradiction, and a specific reason. "Which sounds trivial but genuinely helps" is exactly the kind of natural qualifying language that lifts Lexical Resource without sounding rehearsed.' },
      { q: 'Part 3 — How important are parks and other public spaces in a city?',
        a: 'I\'d say they\'re essential, and increasingly so, though probably not for the reason people usually give. Everyone talks about fresh air and exercise, which is true enough. But I think the more important function is social: a park is one of the very few places left where you can be around other people without having to buy something. If you\'re a teenager or you\'re unemployed or you simply don\'t have much money, the alternatives are a shopping centre, where you\'re essentially being tolerated, or your own front room. So when a city sells off a park, what it\'s actually removing is the only free place to exist in public — and I don\'t think that gets weighed properly against the value of the land.',
        why: 'Around 130 words, which is right for Part 3. It answers, then reframes: "not for the reason people usually give" signals an independent line of thought, and the closing sentence expresses a judgement. Examiners are listening for exactly this — the ability to develop a position, not just supply information.' },
      { q: 'Part 3 — Is being busy always a bad thing?',
        a: 'No, not at all — I think there\'s a real difference between being busy and being overloaded, and we\'ve started using the words as though they mean the same thing. Being busy with something you chose is one of the more satisfying states there is. What wears people down is having no control over the demands, which is a different problem, and the solution to it isn\'t more free time so much as more say over how the time is used.',
        why: 'Distinguishing two concepts that the question treats as one is a reliable way to sound sophisticated in Part 3, and it gives you something to say when your first instinct is just "no".' }
    ],
    language: [
      '**Describing a place (Part 2):** "It\'s tucked away behind…", "You\'d walk straight past it", "It has a particular kind of quiet".',
      '**Frequency without repeating "usually":** "I\'d go maybe twice a month", "not as often as I\'d like", "religiously, every Sunday".',
      '**Explaining a feeling:** "It\'s hard to put my finger on why, but…", "Something about it just resets me."',
      '**Disagreeing with the question politely:** "I\'m not sure that\'s quite the right way to look at it", "It depends what we mean by…"',
      '**Extending when you have run out:** add a contrast ("whereas when I was younger…"), a consequence ("which means that…"), or an exception ("the one time that isn\'t true is…").',
      '**Avoid:** starting every Part 3 answer with "Well, it depends." Once is natural; three times is a verbal tic the examiner will notice.'
    ]
  });
})();
