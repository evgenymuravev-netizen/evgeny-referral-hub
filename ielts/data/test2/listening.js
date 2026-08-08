/* Practice Test 2 — Listening */
(function () {
  IELTSData.test('test2', {
    name: 'Practice Test 2',
    blurb: 'Full exam-timing test. Removal quote · community farm · sleep and memory study · vertical farming.'
  });

  IELTSData.add('test2', 'listening', {
    parts: [

      /* ------------------------------------------------ PART 1 */
      {
        number: 1, range: '1 to 10', readTime: 30,
        context: 'You will hear a woman telephoning a removals company to ask for a quotation. ' +
                 'First you have some time to look at questions 1 to 10.',
        blurb: 'Questions 1–10. Complete the form below.',
        groups: [{
          kind: 'gap',
          title: 'Questions 1–10',
          instructions: 'Complete the form below.',
          limitText: 'Write ONE WORD AND/OR A NUMBER for each answer.',
          maxWords: 2,
          blocks: [
            { t: 'h', text: 'CASTLEFORD REMOVALS & STORAGE — Quotation request' },
            { t: 'dl', items: [
              ['Customer name:', 'Grace [[1]]'],
              ['Moving from:', 'a flat in [[2]]'],
              ['Date of move:', '[[3]]'],
              ['Size of property:', '[[4]] bedrooms'],
              ['Item needing special handling:', 'a [[5]]'],
              ['Storage required for:', '[[6]] weeks'],
              ['Estimated total:', '£[[7]]'],
              ['Deposit:', '[[8]] per cent, payable on booking'],
              ['Access problem at the flat:', 'there is no [[9]]'],
              ['Customer must arrange:', 'a [[10]] for the van']
            ] }
          ],
          questions: [
            { n: 1, answer: 'Okonkwo', evidence: '"O. K. O. N. K. W. O."' },
            { n: 2, answer: 'Headingley', evidence: '"a two-bedroom — sorry, a three-bedroom flat in Headingley".' },
            { n: 3, answer: '14 September', accept: ['September 14', '14th September'], evidence: 'The 7th is fully booked, so the 14th is agreed.' },
            { n: 4, answer: '3', accept: ['three'], evidence: 'She corrects herself: three bedrooms, not two.' },
            { n: 5, answer: 'piano', evidence: 'The paintings are fine in normal crates; the upright piano needs two extra men.' },
            { n: 6, answer: '6', accept: ['six'], evidence: '"six weeks between the two completion dates".' },
            { n: 7, answer: '1150', accept: ['£1150', '1,150'], evidence: '"eleven hundred and fifty pounds all in".' },
            { n: 8, answer: '20', accept: ['twenty'], evidence: '"twenty per cent when you book" (not the 10% she guessed).' },
            { n: 9, answer: 'lift', accept: ['elevator'], evidence: '"third floor and there\'s no lift".' },
            { n: 10, answer: 'parking permit', accept: ['permit'], evidence: '"you\'ll need to get a parking permit from the council".' }
          ]
        }],
        transcript: [
          { who: 'MAN', text: 'Castleford Removals and Storage, good afternoon.' },
          { who: 'WOMAN', text: 'Hello. I\'m moving house next month and I\'d like to get a quote, if that\'s possible over the phone.' },
          { who: 'MAN', text: 'Absolutely, I can give you a provisional figure now and we\'d confirm it after a survey. Can I take your name?' },
          { who: 'WOMAN', text: 'It\'s Grace Okonkwo. That\'s O. K. O. N. K. W. O.' },
          { who: 'MAN', text: 'O. K. O. N. K. W. O. Thank you. And where are you moving from?' },
          { who: 'WOMAN', text: 'A flat in Headingley — I\'ll give you the exact address in a moment — and we\'re going to a house in Harrogate.' },
          { who: 'MAN', text: 'Headingley to Harrogate. That\'s a straightforward run. Do you have a date?' },
          { who: 'WOMAN', text: 'We were hoping for Friday the seventh of September.' },
          { who: 'MAN', text: 'Let me check… the seventh is completely full, I\'m afraid — that\'s the end of a month and it always is. I could offer you the fourteenth?' },
          { who: 'WOMAN', text: 'The fourteenth would actually work better for us. Let\'s say the fourteenth of September.' },
          { who: 'MAN', text: 'Booked in provisionally. Now, the size of the property — how many bedrooms?' },
          { who: 'WOMAN', text: 'Two — no, sorry, three. We use the little one as an office but it\'s still full of furniture.' },
          { who: 'MAN', text: 'Three bedrooms. Is there anything unusual, anything that needs special handling? Fine art, safes, that sort of thing.' },
          { who: 'WOMAN', text: 'There are some paintings, but nothing valuable — you can crate those normally. The one thing I\'m worried about is the piano. It\'s an upright, not a grand, but it\'s heavy.' },
          { who: 'MAN', text: 'A piano is fine, we do them all the time, but I\'ll need to send two extra men, which does affect the price. I\'ll note that down.' },
          { pause: 3 },
          { who: 'WOMAN', text: 'There\'s one more complication. The two completion dates don\'t line up, so we need somewhere to put everything in between.' },
          { who: 'MAN', text: 'That\'s very common. How long is the gap?' },
          { who: 'WOMAN', text: 'Six weeks, more or less. It might be five if the solicitors move quickly, but I\'d rather budget for six.' },
          { who: 'MAN', text: 'Six weeks of storage. Right — let me put that together. Three-bedroom flat, piano, six weeks in a container… I\'m looking at eleven hundred and fifty pounds all in. That includes the packing materials but not full insurance, which is another eighty.' },
          { who: 'WOMAN', text: 'Eleven fifty. That\'s better than the last quote I had, which was fourteen hundred. Do you need a deposit?' },
          { who: 'MAN', text: 'We do. It\'s twenty per cent when you book.' },
          { who: 'WOMAN', text: 'Oh — I thought it was ten. Twenty per cent. All right.' },
          { who: 'MAN', text: 'Ten per cent is the figure for storage-only bookings. For a full move it\'s twenty, and the balance is due the day before.' },
          { pause: 3 },
          { who: 'MAN', text: 'Just a couple of practical things. Access at the flat — what floor are you on?' },
          { who: 'WOMAN', text: 'Third floor. And there\'s no lift, which I imagine is bad news.' },
          { who: 'MAN', text: 'It adds time rather than cost, but the men need to know. And parking — is it a controlled zone?' },
          { who: 'WOMAN', text: 'It is, yes. Residents\' permits only, seven till seven.' },
          { who: 'MAN', text: 'Then you\'ll need to get a parking permit from the council for the van. It\'s the customer who has to apply, not us, and you should do it at least ten days beforehand. If we can\'t park outside, the men have to carry everything the length of the street and we do charge for that.' },
          { who: 'WOMAN', text: 'Understood. I\'ll sort that out this week. Can you email me the quotation?' },
          { who: 'MAN', text: 'I\'ll send it within the hour. Could I take an email address?' }
        ]
      },

      /* ------------------------------------------------ PART 2 */
      {
        number: 2, range: '11 to 20', readTime: 40,
        context: 'You will hear a member of staff talking to a group of visitors at a city farm. ' +
                 'First you have some time to look at questions 11 to 14.',
        blurb: 'Questions 11–20.',
        groups: [
          {
            kind: 'mcq',
            title: 'Questions 11–14',
            instructions: 'Choose the correct letter, **A**, **B** or **C**.',
            questions: [
              { n: 11, text: 'The farm was originally set up by',
                options: [{ k: 'A', t: 'the city council.' }, { k: 'B', t: 'a group of local residents.' },
                          { k: 'C', t: 'a national charity.' }],
                answer: 'B',
                evidence: '"a dozen people from these streets who got tired of looking at a derelict yard" — the council came in later.' },
              { n: 12, text: 'Most of the farm\'s income now comes from',
                options: [{ k: 'A', t: 'entrance charges.' }, { k: 'B', t: 'grants.' }, { k: 'C', t: 'educational visits.' }],
                answer: 'C',
                evidence: '"school visits pay for about two-thirds of everything we do." Entry is free and grant income has fallen.' },
              { n: 13, text: 'What is new at the farm this year?',
                options: [{ k: 'A', t: 'a second entrance' }, { k: 'B', t: 'an all-weather path' }, { k: 'C', t: 'a larger car park' }],
                answer: 'B',
                evidence: '"we\'ve finally surfaced the main path… you can get a wheelchair round the whole site now."' },
              { n: 14, text: 'Visitors are asked to',
                options: [{ k: 'A', t: 'keep to the marked routes.' }, { k: 'B', t: 'wash their hands before leaving.' },
                          { k: 'C', t: 'avoid feeding the animals.' }],
                answer: 'B',
                evidence: '"the one rule I will nag you about: wash your hands before you go." Feeding is allowed with farm-supplied food.' }
            ]
          },
          {
            kind: 'matching',
            title: 'Questions 15–20',
            instructions: 'What does the speaker say about each area of the farm?\n\n' +
              'Choose **SIX** answers from the box and write the correct letter, **A–G**, next to questions 15–20.',
            optionsTitle: 'Comments',
            options: [
              { k: 'A', t: 'It is closed to visitors at present.' },
              { k: 'B', t: 'It is open only at weekends.' },
              { k: 'C', t: 'Visits must be booked in advance.' },
              { k: 'D', t: 'It is designed for very young children.' },
              { k: 'E', t: 'Produce grown there is sold to the public.' },
              { k: 'F', t: 'Dogs are allowed there.' },
              { k: 'G', t: 'It has recently been made bigger.' }
            ],
            questions: [
              { n: 15, text: 'The milking parlour', answer: 'C', evidence: '"the demonstration is ticketed — you have to book, and we cap it at fifteen."' },
              { n: 16, text: 'The orchard', answer: 'F', evidence: '"the only part of the farm where you can bring a dog, and it must be on a lead."' },
              { n: 17, text: 'The pig field', answer: 'A', evidence: '"shut for the next few weeks" because of a bio-security notice.' },
              { n: 18, text: 'The tea room', answer: 'B', evidence: '"Saturdays and Sundays only, I\'m afraid — we simply don\'t have the volunteers midweek."' },
              { n: 19, text: 'The play barn', answer: 'D', evidence: '"strictly for under-fives".' },
              { n: 20, text: 'The community garden', answer: 'G', evidence: '"we took in the plot next door last autumn, so it\'s nearly twice the size it was."' }
            ]
          }
        ],
        transcript: [
          { who: 'MAN', text: 'Morning everybody, and welcome to Brookfield. I\'m Danny, I\'m one of the two paid staff here — everybody else you\'ll meet today is a volunteer — and I\'ll spend ten minutes telling you how the place works and then let you loose.' },
          { who: 'MAN', text: 'People often assume a city farm like this is a council project, and the council does support us now, with a small annual grant. But that isn\'t how it started. In 1979 this was a derelict coal yard, and a dozen people from these streets got tired of looking at it, cut the padlock off the gate and started clearing it. It was three years before anyone in authority took any notice, and when they did it was to try to evict us. The national charity we\'re affiliated to came along much later.' },
          { who: 'MAN', text: 'Which brings me to money, because people always ask. Entry is free and always has been, and we won\'t change that. Grant income has actually gone down, not up, over the last decade. What keeps us open is education: school visits pay for about two-thirds of everything we do. We have four hundred class visits a year and there\'s a waiting list.' },
          { who: 'MAN', text: 'A couple of things have changed since last season. We looked at a second gate onto Cardigan Road but the planning application was refused, and the car park is the same size it always was — please use the street. What we have finally done is surface the main path. It used to be a mudbath from October to April; now it\'s all-weather and you can get a wheelchair or a double buggy round the whole site, which took us four years of fundraising.' },
          { who: 'MAN', text: 'Rules. You can walk anywhere the gates are open, so I\'m not going to lecture you about keeping to the paths. You can feed the animals, provided you use the food we sell at the kiosk and not sandwiches from your bag — bread genuinely makes them ill. But the one rule I will nag you about is this: wash your hands before you go. There are troughs at both exits. Farm animals carry organisms that we don\'t, and every case of illness that has ever been traced to a city farm has come down to hand-washing.' },
          { pause: 25 },
          { who: 'MAN', text: 'Right — let me take you round what\'s where, because a few things aren\'t obvious.' },
          { who: 'MAN', text: 'The milking parlour is straight ahead of you, and we milk the goats at eleven and at four. It\'s the most popular thing we do, and because there\'s only room for fifteen people to see anything at all, the demonstration is ticketed. You have to book it, at the kiosk, and this morning\'s is already gone.' },
          { who: 'MAN', text: 'Behind the parlour is the orchard, which is thirty old apple varieties and a lot of long grass. That is the only part of the farm where you can bring a dog, and it must be on a lead — anywhere near the livestock and I\'m afraid the answer is no.' },
          { who: 'MAN', text: 'I need to apologise about the pig field. There\'s a bio-security notice in force across the county and we\'ve had to shut it for the next few weeks. The pigs are perfectly well; we just can\'t let anyone near them. Please don\'t climb the fence for a photograph, because somebody did last Tuesday.' },
          { who: 'MAN', text: 'The tea room is in the stone building by the entrance. Saturdays and Sundays only, I\'m afraid — we simply don\'t have the volunteers midweek. There\'s a vending machine in the barn the rest of the time and it is not a substitute.' },
          { who: 'MAN', text: 'The play barn, next to it, is strictly for under-fives. I say that not to be difficult but because an eight-year-old at full speed in there is genuinely dangerous for a toddler. Older children can help with the animals instead, which they usually prefer anyway.' },
          { who: 'MAN', text: 'And finally the community garden, at the far end past the polytunnel. Forty households have a bed there. We took in the plot next door last autumn, so it\'s nearly twice the size it was, and there are eleven beds still free if anyone\'s interested. What\'s grown there goes home with the growers, by the way — we don\'t sell it, although the surplus does go to the food bank on Thursdays.' },
          { who: 'MAN', text: 'That\'s me done. I\'ll be by the kiosk if you\'ve got questions.' }
        ]
      },

      /* ------------------------------------------------ PART 3 */
      {
        number: 3, range: '21 to 30', readTime: 40,
        context: 'You will hear two psychology students, Priya and Callum, discussing the design of an experiment. ' +
                 'First you have some time to look at questions 21 to 25.',
        blurb: 'Questions 21–30.',
        groups: [
          {
            kind: 'mcq',
            title: 'Questions 21–25',
            instructions: 'Choose the correct letter, **A**, **B** or **C**.',
            questions: [
              { n: 21, text: 'Why did Priya and Callum change their original research question?',
                options: [{ k: 'A', t: 'It had already been studied too often.' },
                          { k: 'B', t: 'They could not recruit the participants they needed.' },
                          { k: 'C', t: 'The ethics committee raised objections.' }],
                answer: 'C',
                evidence: '"the ethics panel wouldn\'t approve keeping people awake for twenty-four hours."' },
              { n: 22, text: 'What do they decide to use as their memory task?',
                options: [{ k: 'A', t: 'a list of unrelated words' }, { k: 'B', t: 'pairs of faces and names' },
                          { k: 'C', t: 'a series of short film clips' }],
                answer: 'B',
                evidence: '"faces and names… it\'s closer to something people actually have to do."' },
              { n: 23, text: 'Callum is worried that their participants will',
                options: [{ k: 'A', t: 'guess what the study is about.' }, { k: 'B', t: 'not follow the sleep instructions.' },
                          { k: 'C', t: 'drop out before the second session.' }],
                answer: 'B',
                evidence: '"they\'ll say they went to bed at eleven and they\'ll have been on their phones till two."' },
              { n: 24, text: 'How do they plan to deal with this problem?',
                options: [{ k: 'A', t: 'by using wrist-worn activity trackers' },
                          { k: 'B', t: 'by asking participants to keep a written diary' },
                          { k: 'C', t: 'by testing participants in the laboratory overnight' }],
                answer: 'A',
                evidence: 'Diaries were rejected as unreliable; the sleep lab is unavailable; the department has twenty actigraphs.' },
              { n: 25, text: 'Their supervisor has told them that the most important thing is to',
                options: [{ k: 'A', t: 'increase the number of participants.' },
                          { k: 'B', t: 'register their predictions before collecting data.' },
                          { k: 'C', t: 'repeat the study with a second group.' }],
                answer: 'B',
                evidence: '"Dr Ahmed says pre-registration is non-negotiable now."' }
            ]
          },
          {
            kind: 'gap',
            title: 'Questions 26–30',
            instructions: 'Complete the flow-chart below.\n\nChoose **NO MORE THAN TWO WORDS** for each answer.',
            limitText: 'No more than two words',
            maxWords: 2,
            blocks: [
              { t: 'h', text: 'PROCEDURE FOR EACH PARTICIPANT' },
              { t: 'ul', items: [
                'Day 1, evening: participant completes a short [[26]] to check they are not already sleep-deprived.',
                '↓',
                'Day 1, 9 p.m.: learning phase — 40 face–name pairs shown, each for [[27]] seconds.',
                '↓',
                'Overnight: sleep recorded by tracker; participants in the second group are woken by a [[28]] twice during the night.',
                '↓',
                'Day 2, 9 a.m.: recall test, followed by a [[29]] test in which participants pick the correct name from four options.',
                '↓',
                'Day 8: participants return for a [[30]] test to measure how much has been retained.'
              ] }
            ],
            questions: [
              { n: 26, answer: 'questionnaire', accept: ['screening questionnaire'], evidence: '"a five-item questionnaire, just to screen out anyone who\'s already exhausted."' },
              { n: 27, answer: '4', accept: ['four'], evidence: '"four seconds each — three felt too fast when we piloted it."' },
              { n: 28, answer: 'phone call', accept: ['call', 'telephone call'], evidence: '"woken by a phone call at one and at four."' },
              { n: 29, answer: 'recognition', evidence: '"then a recognition test — four names, pick the right one."' },
              { n: 30, answer: 'delayed recall', accept: ['delayed'], evidence: '"a delayed recall test exactly a week later."' }
            ]
          }
        ],
        transcript: [
          { who: 'PRIYA', text: 'So we\'ve got the revised proposal to hand in on Friday and I want to make sure we\'re actually agreed on it, because what we submitted last month is unrecognisable now.' },
          { who: 'CALLUM', text: 'That wasn\'t our fault, though. Our original question was fine.' },
          { who: 'PRIYA', text: 'It was fine, and there\'s plenty of room in the literature for it — that wasn\'t the issue. The issue was that the ethics panel wouldn\'t approve keeping people awake for twenty-four hours. Which, when you write it down, I do sort of understand.' },
          { who: 'CALLUM', text: 'No, you\'re right. Total sleep deprivation was never going to get through. So now we\'re looking at fragmented sleep instead — same number of hours in bed, but interrupted.' },
          { who: 'PRIYA', text: 'Which is arguably more interesting anyway, because that\'s what actually happens to people. Nobody stays up for a day and a night. Everybody gets woken up.' },
          { pause: 3 },
          { who: 'CALLUM', text: 'Right, the memory task. I still think a word list is the cleanest option. It\'s standardised, everyone uses it, and we can compare our effect sizes with published studies.' },
          { who: 'PRIYA', text: 'I know, but a list of unrelated nouns is so artificial. What I keep coming back to is faces and names. It\'s the same associative memory mechanism, it\'s well validated, and it\'s closer to something people actually have to do.' },
          { who: 'CALLUM', text: 'And it\'s more interesting to write up, which I admit matters. What about the film clips idea?' },
          { who: 'PRIYA', text: 'Too much going on. We\'d never know what they were encoding.' },
          { who: 'CALLUM', text: 'Fair. Faces and names, then.' },
          { pause: 3 },
          { who: 'CALLUM', text: 'The thing that actually worries me is compliance. We\'re asking people to sleep normally on one night and to be interrupted on another, and we\'re relying on them to tell us the truth about it. They\'ll say they went to bed at eleven and they\'ll have been on their phones till two.' },
          { who: 'PRIYA', text: 'Yes. Self-report on sleep is notoriously bad — people overestimate how long they slept by about forty minutes on average.' },
          { who: 'CALLUM', text: 'So do we give them a diary?' },
          { who: 'PRIYA', text: 'A diary is self-report with extra steps. It has exactly the same problem.' },
          { who: 'CALLUM', text: 'Then it has to be the sleep lab.' },
          { who: 'PRIYA', text: 'The lab is booked solid until March, I already asked. But — and this is the bit I found out yesterday — the department has twenty wrist actigraphs sitting in a cupboard. Activity trackers, basically. They log movement all night and you can score sleep from it. Nobody\'s used them for two years.' },
          { who: 'CALLUM', text: 'Twenty is enough for our sample. That solves it, then. Objective data and it costs us nothing.' },
          { pause: 3 },
          { who: 'PRIYA', text: 'One more thing from the supervisor meeting. Dr Ahmed says pre-registration is non-negotiable now — we write down our hypotheses and our analysis plan and lodge it publicly before we collect a single data point.' },
          { who: 'CALLUM', text: 'Doesn\'t that tie our hands?' },
          { who: 'PRIYA', text: 'That is precisely the point. She wasn\'t especially bothered about our sample size and she said a replication was beyond what a third-year project can do, but on pre-registration she was immovable.' },
          { pause: 3 },
          { who: 'CALLUM', text: 'Let\'s go through the procedure so I can draw the flow chart. Participant arrives on the first evening…' },
          { who: 'PRIYA', text: 'And before anything else they do a five-item questionnaire, just to screen out anyone who\'s already exhausted — if they\'re running on four hours a night as a matter of routine, they can\'t be in the study.' },
          { who: 'CALLUM', text: 'Then the learning phase at nine.' },
          { who: 'PRIYA', text: 'Forty face–name pairs, presented one at a time, four seconds each. Three felt too fast when we piloted it and six was so slow that people got bored.' },
          { who: 'CALLUM', text: 'Four seconds. Then they go to bed wearing the tracker.' },
          { who: 'PRIYA', text: 'The control group just sleeps. The interrupted group gets woken by a phone call at one and at four in the morning, and has to answer three questions to prove they\'re properly awake.' },
          { who: 'CALLUM', text: 'Brutal. And then testing at nine the following morning.' },
          { who: 'PRIYA', text: 'Free recall first — how many names can you produce unprompted — and then a recognition test, four names for each face, pick the right one. Recall always drops more than recognition, so we need both.' },
          { who: 'CALLUM', text: 'And that\'s it?' },
          { who: 'PRIYA', text: 'No, and this is the part I care about most. They come back for a delayed recall test exactly a week later. Anything sleep does to consolidation should show up more clearly at seven days than at twelve hours.' },
          { who: 'CALLUM', text: 'Right. I\'ll draw that up tonight and send it to you.' }
        ]
      },

      /* ------------------------------------------------ PART 4 */
      {
        number: 4, range: '31 to 40', readTime: 45,
        context: 'You will hear part of a lecture about vertical farming. ' +
                 'First you have some time to look at questions 31 to 40.',
        blurb: 'Questions 31–40. Complete the notes below.',
        groups: [{
          kind: 'gap',
          title: 'Questions 31–40',
          instructions: 'Complete the notes below.',
          limitText: 'Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.',
          maxWords: 2,
          blocks: [
            { t: 'h', text: 'VERTICAL FARMING' },
            { t: 'lead', text: 'Origins' },
            { t: 'ul', items: [
              'The modern idea is credited to Dickson Despommier, whose own field was [[31]].',
              'The original aim was to grow food inside cities, close to the [[32]].'
            ] },
            { t: 'lead', text: 'Claimed advantages' },
            { t: 'ul', items: [
              'Water use is up to [[33]] per cent lower than in field agriculture, because water is recirculated.',
              'The sealed environment means no [[34]] are needed.',
              'Production is unaffected by [[35]], so output can be planned precisely.',
              'Land requirement per kilogram of lettuce is roughly [[36]] per cent of the field equivalent.'
            ] },
            { t: 'lead', text: 'Problems' },
            { t: 'ul', items: [
              'The largest single running cost is [[37]].',
              'Only a narrow range of crops pays: mainly herbs and [[38]].',
              'Staple crops are not viable because of the amount of [[39]] they need.'
            ] },
            { t: 'lead', text: 'Where the industry is going' },
            { t: 'ul', items: [
              'Costs are falling as LEDs improve and as [[40]] replaces manual labour.',
              'Most surviving companies now sell technology to growers rather than growing food themselves.'
            ] }
          ],
          questions: [
            { n: 31, answer: 'public health', accept: ['health'], evidence: '"a professor of public health, not of agriculture".' },
            { n: 32, answer: 'consumer', accept: ['consumers'], evidence: '"grown within a few miles of the consumer".' },
            { n: 33, answer: '95', accept: ['ninety-five'], evidence: '"up to ninety-five per cent less water".' },
            { n: 34, answer: 'pesticides', accept: ['pesticide'], evidence: '"nothing gets in, so nothing has to be sprayed — no pesticides at all".' },
            { n: 35, answer: 'weather', accept: ['the weather'], evidence: '"a harvest that is completely indifferent to the weather".' },
            { n: 36, answer: '1', accept: ['one'], evidence: '"about one per cent of the land a field crop would need".' },
            { n: 37, answer: 'lighting', accept: ['light', 'electricity'], evidence: '"lighting is between a quarter and a half of operating costs".' },
            { n: 38, answer: 'salad leaves', accept: ['salad', 'leafy greens', 'leaves'], evidence: '"herbs and salad leaves and very little else".' },
            { n: 39, answer: 'energy', accept: ['light', 'lighting'], evidence: '"the energy required to grow a tonne of wheat indoors is absurd".' },
            { n: 40, answer: 'automation', accept: ['robots', 'robotics'], evidence: '"automation is replacing the people who used to move the trays".' }
          ]
        }],
        transcript: [
          { who: 'LECTURER', text: 'In the last session we looked at the land footprint of conventional agriculture. Today I want to examine one of the more radical proposals for reducing it, which is to stop farming outdoors altogether — to stack crops in racks inside a building, under artificial light, and grow them hydroponically. Vertical farming.' },
          { who: 'LECTURER', text: 'The modern version of the idea is usually credited to Dickson Despommier at Columbia, who put it to a class in 1999. It is worth noticing that Despommier was a professor of public health, not of agriculture — his route into the subject was through disease, water quality and the consequences of agricultural run-off — and that shapes the whole argument. The point was never simply higher yields. It was to move food production inside the city, so that a lettuce is grown within a few miles of the consumer rather than trucked fifteen hundred miles, and so that farming stops discharging fertiliser into rivers.' },
          { pause: 3 },
          { who: 'LECTURER', text: 'Let me set out the case in its strongest form, because there is a real case here and it is often dismissed too quickly.' },
          { who: 'LECTURER', text: 'Water first. In a closed hydroponic system the water that the plant does not take up is captured, filtered and put back. Consumption figures vary with the crop, but the sober estimates are of up to ninety-five per cent less water than the same crop grown in a field. In a water-stressed region that number alone is enough to make people interested.' },
          { who: 'LECTURER', text: 'Second, chemicals. A sealed building with filtered air and staff in protective clothing is, in effect, a quarantine facility. Nothing gets in, so nothing has to be sprayed: no pesticides at all, which both removes a cost and opens a premium market.' },
          { who: 'LECTURER', text: 'Third, and this is the one that persuades supermarket buyers rather than environmentalists — predictability. A harvest that is completely indifferent to the weather can be scheduled. You can promise a retailer the same quantity, at the same quality, in the same week, every week of the year, and you can do that from a warehouse in Yorkshire in February.' },
          { who: 'LECTURER', text: 'And the land figure is genuinely striking. Stack the racks twelve high, run the lights eighteen hours a day, and grow twelve or fifteen crops a year instead of three, and you end up using something in the order of one per cent of the land a field crop would need for the same weight of lettuce.' },
          { pause: 3 },
          { who: 'LECTURER', text: 'So why, after twenty-five years, is almost nobody making money at this? Several of the best-funded companies in the sector have gone into administration in the last three years, and the reasons are not mysterious.' },
          { who: 'LECTURER', text: 'The fundamental problem is that outdoors, sunlight is free. Indoors, you are buying it. Depending on the electricity price, lighting is between a quarter and a half of operating costs, and the rest of the energy bill goes on removing the heat that the lighting produces. When wholesale power prices tripled in Europe in 2022, a large part of the industry became insolvent within eighteen months.' },
          { who: 'LECTURER', text: 'That cost structure dictates what you can grow. The crop has to be light in weight, quick to mature, valuable per kilogram, and ideally sold with the roots still on so it looks fresh. That means herbs and salad leaves and very little else. Tomatoes and strawberries are marginal. And the crops that actually feed the world are hopeless: the energy required to grow a tonne of wheat indoors is absurd, because wheat spends months producing a low-value, dry product. Nobody serious proposes growing staples this way.' },
          { pause: 3 },
          { who: 'LECTURER', text: 'Where does that leave us? Two developments are worth watching. LED efficiency continues to improve, and the spectrum can now be tuned to the crop, so the same growth is achieved for less power. And automation is replacing the people who used to move the trays — labour was the second-largest cost and in some new facilities it has almost vanished.' },
          { who: 'LECTURER', text: 'The more interesting shift, though, is commercial rather than technical. Most of the companies that have survived have stopped trying to be farmers. They sell the racks, the lighting and above all the control software to other people, including to conventional glasshouse growers who use the technology as a supplement rather than a replacement. That is a much smaller business than the one investors were promised in 2015, and it is a considerably more plausible one.' }
        ]
      }
    ]
  });
})();
