/* Practice Test 1 — Writing (Academic + General Training) and Speaking */
(function () {

  /* ------------------------------------------------ ACADEMIC WRITING */
  IELTSData.add('test1', 'writingAcademic', {
    tasks: [
      {
        label: 'Describing a line graph',
        minWords: 150, minutes: 20,
        instructions: 'You should spend about 20 minutes on this task.\n\n' +
          'The chart below shows the percentage of households in one European country with access to four ' +
          'communication and entertainment services between 2000 and 2020.\n\n' +
          'Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
        figure: {
          kind: 'line',
          title: 'Household access to four services, 2000–2020 (%)',
          categories: ['2000', '2005', '2010', '2015', '2020'],
          yTitle: '% of households', xTitle: 'Year', max: 100,
          series: [
            { name: 'Fixed broadband', values: [5, 44, 71, 84, 89] },
            { name: 'Mobile broadband', values: [0, 9, 47, 79, 94] },
            { name: 'Cable television', values: [41, 46, 44, 33, 21] },
            { name: 'Landline telephone', values: [93, 88, 76, 58, 39] }
          ]
        },
        tips: [
          'Group the data before you write: two services rose steeply, two declined. That gives you two body paragraphs.',
          'The overview is the single most valuable sentence in the answer. Put it second, not last, and do not include any numbers in it.',
          'Select figures — do not list all twenty. Start points, end points, the crossover and the biggest change are enough.',
          'No reasons, no opinions, no "in my view". Task 1 Academic is description only.'
        ],
        checklist: [
          'There is a clear overview identifying the overall trends (rising vs falling).',
          'Figures are used to support statements, not as a substitute for them.',
          'At least one comparison between services is made explicitly.',
          'Tenses are consistent — past simple throughout, since the period has ended.',
          'The introduction paraphrases the prompt rather than copying it.'
        ],
        model: [
          'The line graph compares the proportion of households in one European country that had access to fixed broadband, mobile broadband, cable television and a landline telephone over a twenty-year period from 2000 to 2020.',
          'Overall, the two internet services expanded dramatically while the two older services declined, and by the end of the period the ranking of the four had been completely reversed. Mobile broadband, which was unavailable at the start, finished as the most widely held service of all.',
          'In 2000, the landline telephone was almost universal, reaching 93% of households, and cable television was held by 41%. Fixed broadband was negligible at 5% and mobile broadband did not yet exist. Landline ownership then fell steadily throughout the period, dropping below 60% by 2015 and ending at 39%. Cable television followed a slightly different pattern: it edged up to a peak of 46% in 2005 before declining, and the fall accelerated after 2010, leaving it at just 21% in 2020.',
          'The internet services moved in the opposite direction. Fixed broadband grew explosively in the first five years, from 5% to 44%, and continued upwards more gradually to reach 89%. Mobile broadband rose from nothing to 9% by 2005 and then climbed sharply, overtaking cable television around 2010 and fixed broadband shortly before 2020, when it stood at 94%.'
        ],
        modelNote: '198 words. Notice the structure: introduction (paraphrase), overview (no figures), then one paragraph per group. The examiner is looking for *selection*, not coverage.'
      },
      {
        label: 'Opinion essay (agree / disagree)',
        minWords: 250, minutes: 40,
        instructions: 'You should spend about 40 minutes on this task.\n\nWrite about the following topic:',
        prompt: 'Some people think that all university students should be required to study subjects outside their ' +
          'main field, such as history, philosophy or a foreign language.\n\n**To what extent do you agree or disagree?**',
        closing: 'Give reasons for your answer and include any relevant examples from your own knowledge or experience.',
        tips: [
          'Decide your position before you write a word. A clear, consistent position is worth more than a balanced but vague one.',
          '"To what extent" invites a partial answer — "largely agree, with one qualification" is a strong, sophisticated position.',
          'Two well-developed body paragraphs beat three thin ones. Each needs a claim, a reason, and a specific example.',
          'Leave three minutes to check verb endings, articles and plurals. That is where most Band 6.5 scripts lose the 7.'
        ],
        checklist: [
          'The position is stated in the introduction and never contradicted later.',
          'Every body paragraph has one central idea, announced in its first sentence.',
          'At least one concrete, specific example is given (not "many studies show").',
          'The conclusion restates the position without introducing new arguments.',
          'The answer is over 250 words and is not padded with repetition of the prompt.'
        ],
        model: [
          'Universities in many countries are debating whether degrees should remain narrowly specialised or whether every student should be obliged to take courses well outside their discipline. I largely agree that a compulsory element of broader study is valuable, although I think its purpose is often misunderstood.',
          'The strongest argument for compulsion is that the skills a specialism develops are not the same as the skills a career demands. An engineering graduate will spend far more of their working life writing, persuading and weighing conflicting evidence than solving differential equations, and those are precisely the habits that a term of history or philosophy trains. Requiring the course matters because students who most need this breadth are the least likely to choose it: a nineteen-year-old who has already decided they dislike essays will simply avoid them, and by the time they discover the gap they are in a job.',
          'A second argument is about judgement rather than employability. Almost every serious problem a professional encounters — an ethical question in medicine, the social consequences of a piece of software — sits outside the technical training that produced them. Some acquaintance with how other disciplines reason makes it more likely that a specialist will at least recognise when a problem is not, in fact, technical.',
          'The obvious objection is that degree time is finite and that diluting a demanding course helps nobody. This has force, and it is why I would qualify my agreement: the requirement should be modest, perhaps one module a year, and it should be genuinely taught rather than offered as a token lecture series that students learn to ignore.',
          'In conclusion, I agree that some study beyond the main subject should be compulsory, because the students who benefit most are the ones who would never opt in — provided the requirement stays small enough not to damage the specialism itself.'
        ],
        modelNote: '297 words. The qualification in paragraph 4 is what lifts this above a Band 7: it engages with the counter-argument instead of listing it and moving on.'
      }
    ]
  });

  /* ---------------------------------------- GENERAL TRAINING WRITING */
  IELTSData.add('test1', 'writingGeneral', {
    tasks: [
      {
        label: 'Letter (semi-formal complaint)',
        minWords: 150, minutes: 20,
        instructions: 'You should spend about 20 minutes on this task.',
        prompt: 'You have been renting a flat for six months. The heating has not worked properly since the ' +
          'beginning of winter, and although you have mentioned it twice, your landlord has not arranged a repair.\n\n' +
          'Write a letter to your landlord.',
        bulletsLead: 'In your letter:',
        bullets: [
          'explain what the problem is and how long it has been going on',
          'describe the effect it is having on you',
          'say what you would like the landlord to do'
        ],
        closing: 'Write at least 150 words. You do NOT need to write any addresses.\n\n' +
          'Begin your letter: *Dear Mr Doyle,*',
        tips: [
          'Three bullets, three body paragraphs. Cover all three or Task Achievement is capped, however good the English is.',
          'Semi-formal means you know the person\'s name but the relationship is a business one: no contractions, no slang, no "Hi".',
          'Firm but not rude. "I would be grateful if…" and "I am sure you will understand…" do more work than anger.',
          'Because you are told to begin "Dear Mr Doyle", the correct ending is "Yours sincerely" — not "Yours faithfully".'
        ],
        checklist: [
          'All three bullet points are covered, each with some development.',
          'The tone is consistent from greeting to sign-off.',
          'A clear request with a deadline or a next step is made.',
          'Paragraphing is used — a single block of text is penalised under Coherence.',
          'The letter reaches 150 words.'
        ],
        model: [
          'Dear Mr Doyle,',
          'I am writing about the heating at 4B Ashgrove Court, which has not worked correctly since I moved in and which has become a serious problem now that the weather has turned.',
          'The radiators in the living room and the back bedroom do not heat up at all, and the boiler cuts out roughly twenty minutes after it is switched on. I first reported this in a text message on 3 October and again by telephone on 21 October, when you told me an engineer would be in touch. No one has contacted me since.',
          'The effect on the flat has been considerable. The temperature in the bedroom fell to eleven degrees last week and there is now damp appearing on the outside wall, which I am concerned will damage the plaster if it is left. I have been using an electric heater in the evenings, and my electricity bill for November was almost double the previous month\'s.',
          'I would be grateful if you could arrange for a qualified heating engineer to inspect the boiler within the next seven days. I am at home on Tuesdays and Thursdays and can give access at any time on those days. I would also ask you to consider reimbursing the additional electricity I have had to use.',
          'I hope this can be resolved quickly and I look forward to hearing from you.',
          'Yours sincerely,',
          'Elena Marku'
        ],
        modelNote: '229 words. Dates, temperatures and the bill amount are invented — and that is expected. Specific detail is what makes a letter read as real, and the examiner is marking the English, not the facts.'
      },
      {
        label: 'Essay (two-part question)',
        minWords: 250, minutes: 40,
        instructions: 'You should spend about 40 minutes on this task.\n\nWrite about the following topic:',
        prompt: 'In many countries, young people are spending less time with the older members of their family than ' +
          'they used to.\n\n**Why is this happening, and what could be done to change it?**',
        closing: 'Give reasons for your answer and include any relevant examples from your own knowledge or experience.',
        tips: [
          'Two questions means two jobs. The safest structure is one body paragraph for causes and one for solutions — do not let the essay drift into a general discussion of family life.',
          'Match your solutions to the causes you named. An unconnected list of suggestions reads as pre-learned.',
          'GT Task 2 prompts are more everyday than Academic ones, but the marking is identical. Do not lower the register.',
          'Give two developed causes rather than five listed ones.'
        ],
        checklist: [
          'Both parts of the question are answered, and roughly equally.',
          'The solutions clearly relate to the causes identified.',
          'Examples are concrete rather than generic.',
          'Linking is varied — not every paragraph starts with "Firstly / Secondly / Finally".',
          'The essay is over 250 words.'
        ],
        model: [
          'It is increasingly common for grandparents and grandchildren to see one another only a few times a year. In my view this is largely a by-product of how and where people now work, and while the trend cannot be reversed entirely, it can be softened by fairly practical measures.',
          'The main cause is simple distance. Young adults move to cities for education and employment, and once they have settled there, careers, partners and housing costs keep them there. My own cousin moved four hundred kilometres for a job in software; visiting our grandmother now costs him a full weekend and a train fare, which is a very different proposition from calling in after work. A second cause is the way time itself has been reorganised. Longer commutes, weekend working and children\'s heavily scheduled activities mean that the unplanned, low-effort contact that used to hold extended families together — dropping in, sharing a meal — no longer has anywhere to happen.',
          'If distance and time are the causes, the remedies have to address them directly. Employers could do a great deal simply by allowing a few days of remote work around family visits, which turns an expensive weekend into a manageable week. Local authorities can help too: intergenerational schemes, in which secondary schools pair students with residents of a nearby care home for a weekly hour, cost very little and have been shown to benefit both groups. Finally, families themselves might be more deliberate, treating a regular video call as a fixed appointment rather than something to be fitted in when convenient.',
          'To conclude, the decline in contact between generations follows from economic pressures rather than indifference, and the most realistic responses are those that reduce the practical cost of staying in touch rather than those that lecture the young about duty.'
        ],
        modelNote: '299 words. Note that the solutions in paragraph 3 map one-to-one onto the causes in paragraph 2 — that link is what Coherence and Cohesion is really testing.'
      }
    ]
  });

  /* ------------------------------------------------------- SPEAKING */
  IELTSData.add('test1', 'speaking', {
    part1: [
      { topic: 'your home town',
        questions: [
          'Where are you from?',
          'What is the most interesting part of your home town?',
          'Has it changed much since you were a child?',
          'Would you like to live there in the future? Why or why not?'
        ] },
      { topic: 'work or study',
        questions: [
          'Do you work, or are you a student?',
          'What made you choose that job — or that subject?',
          'What is the most difficult part of it?',
          'Is there anything you would like to change about it?'
        ] },
      { topic: 'cooking',
        questions: [
          'Do you enjoy cooking?',
          'Who does most of the cooking in your home?',
          'Has the food people eat in your country changed in recent years?'
        ] },
      { topic: 'getting around',
        questions: [
          'How do you usually travel around your city?',
          'Do you prefer public transport or driving? Why?',
          'Do you think people will travel differently in twenty years\' time?'
        ] }
    ],
    part2: {
      title: '**Describe a skill you found difficult to learn.**',
      bullets: [
        'what the skill is',
        'when and why you decided to learn it',
        'what made it difficult'
      ],
      last: 'and explain how you feel now about having learned it.',
      followUp: 'Do you use this skill often?'
    },
    part3: {
      link: 'learning difficult skills',
      groups: [
        { theme: 'Learning at different ages',
          questions: [
            'Do you think children find it easier to learn new skills than adults do?',
            'Why do some adults give up on a new skill after a few weeks?',
            'Should schools spend more time teaching practical skills?'
          ] },
        { theme: 'Skills and work',
          questions: [
            'Which skills do employers value most in your country at the moment?',
            'Do you think formal qualifications matter more than experience?',
            'How might the skills people need change over the next thirty years?'
          ] }
      ]
    },
    samples: [
      { q: 'Part 1 — Do you enjoy cooking?',
        a: 'Honestly, it depends on whether I have time. During the week I\'m usually rushing, so I fall back on the same three or four things I can make without thinking. But at the weekend I quite enjoy it — I find chopping and stirring oddly relaxing, and I like the fact that it\'s one of the few things I do where I get a result in half an hour.',
        why: 'Part 1 answers should be two or three sentences, not one and not ten. This one answers directly, then adds a contrast (weekday vs weekend) and a reason. "Fall back on", "oddly relaxing" and "get a result" are natural collocations rather than memorised idioms.' },
      { q: 'Part 2 — Describe a skill you found difficult to learn.',
        a: 'The skill I want to talk about is swimming, which I only learned properly at the age of twenty-six — much later than most people.\n\nI decided to learn because I\'d moved to a city on the coast and I felt genuinely embarrassed standing on the beach every summer while everyone else was in the water. There was also a slightly more serious reason: I\'d had a bad experience in a river as a child and I\'d let that turn into a real fear.\n\nWhat made it difficult wasn\'t the physical side at all — it was unlearning the panic. My instructor, who was extremely patient, told me the first six weeks would be about breathing and nothing else, and she was right. Every time my face went under I would tense up and my legs would sink, and the harder I tried the worse it got. It took about four months before I could swim a length without stopping, which for an adult is quite a humbling amount of time.\n\nAs for how I feel now — mostly relieved, but also a bit proud, which I don\'t often say. The thing that stays with me isn\'t really the swimming; it\'s that I proved to myself that a fear I\'d carried for twenty years was actually fixable if I was willing to be bad at something in public for a while.',
        why: 'Roughly 230 words, which is about right for two minutes. Each bullet gets its own paragraph, and the final section answers the "explain how you feel" instruction rather than trailing off. The reflective last sentence is the kind of thing that shows Band 8 fluency — an idea developed, not just reported.' },
      { q: 'Part 3 — Do you think children find it easier to learn new skills than adults do?',
        a: 'In some ways, yes, but I think the advantage is often exaggerated. Children clearly pick up languages and physical skills faster, and the usual explanation is that their brains are more plastic. But there\'s another factor that gets overlooked, which is that children are given permission to be bad at things. Nobody is embarrassed watching a seven-year-old fall off a bike. An adult learning the same thing has an audience, a self-image to protect and forty other demands on their time, so they quit early — and then conclude they were too old, when actually they just stopped.',
        why: 'This is what separates Part 3 from Part 1. It concedes the point, then challenges the assumption behind the question. "The usual explanation is…", "gets overlooked", "when actually" are the discourse markers of someone genuinely thinking, and that is exactly what Fluency and Coherence rewards.' }
    ],
    language: [
      '**Buying thinking time honestly:** "That\'s an interesting question — I\'ve never really thought about it." / "Let me think about that for a second."',
      '**Softening a generalisation:** "It tends to be the case that…", "By and large…", "At least in my experience…"',
      '**Conceding then countering:** "There\'s some truth in that, but…", "I take the point, although…"',
      '**Speculating (Part 3 needs this):** "I would imagine that…", "It\'s quite likely that…", "My guess is that…"',
      '**Correcting yourself without panic:** "Sorry, what I mean is…", "Or rather…" — self-correction is fine; stopping dead is not.',
      '**Avoid:** "It is a double-edged sword", "every coin has two sides", "in a nutshell". Examiners hear these fifty times a week and they mark down memorised phrases.'
    ]
  });
})();
