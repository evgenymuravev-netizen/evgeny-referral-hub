/* Practice Test 1 — Listening (identical for Academic and General Training) */
(function () {
  var MAP = [
    '<svg viewBox="0 0 540 372" width="540" role="img" aria-label="Map of Marsden Bay Nature Reserve"',
    ' style="color:var(--ink-2)" xmlns="http://www.w3.org/2000/svg">',
    '<rect x="20" y="20" width="500" height="310" rx="8" fill="none" stroke="currentColor" stroke-opacity=".45"/>',
    '<ellipse cx="400" cy="85" rx="95" ry="45" fill="#4a7dfc" fill-opacity=".22" stroke="#4a7dfc" stroke-opacity=".7"/>',
    '<text x="400" y="90" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">LAKE</text>',
    /* paths */
    '<line x1="270" y1="330" x2="270" y2="118" stroke="currentColor" stroke-opacity=".28" stroke-width="9" stroke-linecap="round"/>',
    '<line x1="85" y1="200" x2="478" y2="200" stroke="currentColor" stroke-opacity=".28" stroke-width="9" stroke-linecap="round"/>',
    /* entrance + car park */
    '<path d="M255 330 h30" stroke="currentColor" stroke-width="3"/>',
    '<text x="270" y="348" text-anchor="middle" font-size="12" fill="currentColor">Entrance gate</text>',
    '<rect x="120" y="292" width="96" height="30" rx="4" fill="none" stroke="currentColor" stroke-opacity=".6" stroke-dasharray="4 3"/>',
    '<text x="168" y="311" text-anchor="middle" font-size="12" fill="currentColor">Car park</text>',
    '<rect x="300" y="286" width="118" height="32" rx="4" fill="currentColor" fill-opacity=".1" stroke="currentColor" stroke-opacity=".6"/>',
    '<text x="359" y="306" text-anchor="middle" font-size="12" fill="currentColor">Visitor centre</text>',
    /* lettered boxes */
    box('A', 110, 240), box('B', 200, 240), box('C', 110, 150), box('D', 200, 150),
    box('E', 330, 240), box('F', 440, 240), box('G', 330, 150), box('H', 452, 150),
    '<text x="40" y="42" font-size="11" fill="currentColor" fill-opacity=".7">N ↑</text>',
    '</svg>'
  ].join('');

  function box(letter, cx, cy) {
    return '<g><rect x="' + (cx - 15) + '" y="' + (cy - 13) + '" width="30" height="26" rx="4" ' +
      'fill="var(--panel)" stroke="currentColor" stroke-width="1.6"/>' +
      '<text x="' + cx + '" y="' + (cy + 5) + '" text-anchor="middle" font-size="14" font-weight="700" ' +
      'fill="currentColor">' + letter + '</text></g>';
  }

  IELTSData.test('test1', {
    name: 'Practice Test 1',
    blurb: 'Baseline test. Community sports centre · nature reserve · urban pollinator project · lighthouse engineering.'
  });

  IELTSData.add('test1', 'listening', {
    parts: [

      /* ------------------------------------------------ PART 1 */
      {
        number: 1, range: '1 to 10', readTime: 30,
        context: 'You will hear a man telephoning a sports centre to ask about membership. ' +
                 'First you have some time to look at questions 1 to 10.',
        blurb: 'Questions 1–10. Complete the form below.',
        groups: [{
          kind: 'gap',
          title: 'Questions 1–10',
          instructions: 'Complete the form below.',
          limitText: 'Write ONE WORD AND/OR A NUMBER for each answer.',
          maxWords: 2,
          blocks: [
            { t: 'h', text: 'RIVERSIDE COMMUNITY SPORTS CENTRE — New member enquiry' },
            { t: 'dl', items: [
              ['Name:', 'Daniel [[1]]'],
              ['Address:', '14 [[2]] Road, Bristol'],
              ['Postcode:', '[[3]]'],
              ['Occupation:', '[[4]]'],
              ['Heard about the centre from a:', '[[5]]'],
              ['Membership chosen:', '[[6]] membership'],
              ['Cost per month:', '£[[7]]'],
              ['Induction booked for:', '[[8]] at 6.30 p.m.'],
              ['Also wants to book a court for:', '[[9]]'],
              ['Must bring on first visit:', 'proof of address and a [[10]]']
            ] }
          ],
          questions: [
            { n: 1, answer: 'Hargreaves', evidence: '"H. A. R. G. R. E. A. V. E. S."' },
            { n: 2, answer: 'Willow Bank', accept: ['Willowbank'], evidence: 'He corrects himself: "not Willowbrook — Willow Bank Road."' },
            { n: 3, answer: 'BS7 4QN', accept: ['BS74QN'], evidence: '"B. S. seven, four Q. N."' },
            { n: 4, answer: 'paramedic', evidence: '"I\'m a paramedic, so my hours are all over the place."' },
            { n: 5, answer: 'neighbour', accept: ['neighbor'], evidence: 'The poster is a distractor — "my neighbour swears by it".' },
            { n: 6, answer: 'off-peak', accept: ['offpeak', 'off peak'], evidence: '"Off-peak would suit me better."' },
            { n: 7, answer: '32.50', accept: ['£32.50', '32.5'], evidence: 'Full membership is £46.75; off-peak is £32.50.' },
            { n: 8, answer: 'Thursday', evidence: 'Tuesday\'s induction is full, so Thursday is booked.' },
            { n: 9, answer: 'badminton', evidence: '"Could I book a badminton court as well?"' },
            { n: 10, answer: 'passport photo', accept: ['passport-sized photo', 'photo'], evidence: '"Proof of address, and a passport photo for the card."' }
          ]
        }],
        transcript: [
          { who: 'WOMAN', text: 'Good morning, Riverside Community Sports Centre, Karen speaking. How can I help you?' },
          { who: 'MAN', text: 'Oh, hello. I\'ve just moved into the area and I wanted to ask about joining. Do I have to come in, or can I do it over the phone?' },
          { who: 'WOMAN', text: 'You can do most of it now. I\'ll take a few details and put a welcome pack in the post for you. Can I start with your name?' },
          { who: 'MAN', text: 'Yes, of course. It\'s Daniel Hargreaves.' },
          { who: 'WOMAN', text: 'Daniel — and could you spell the surname for me?' },
          { who: 'MAN', text: 'It\'s H. A. R. G. R. E. A. V. E. S.' },
          { who: 'WOMAN', text: 'H. A. R. G. R. E. A. V. E. S. Lovely. And your address, Daniel?' },
          { who: 'MAN', text: 'It\'s number 14, Willowbrook Road — sorry, no, that\'s where I used to live. It\'s Willow Bank Road. Two separate words, Willow, then Bank.' },
          { who: 'WOMAN', text: 'Fourteen, Willow Bank Road. And the postcode?' },
          { who: 'MAN', text: 'B. S. seven, four Q. N.' },
          { who: 'WOMAN', text: 'B. S. seven, four Q. N. Thank you. We ask for an occupation as well — it\'s only so we know whether you qualify for any of the discounted rates.' },
          { who: 'MAN', text: 'I\'m a paramedic, so my hours are all over the place, I\'m afraid.' },
          { who: 'WOMAN', text: 'That\'s no problem at all — we have a lot of shift workers. Can I ask how you heard about us? Was it the website?' },
          { who: 'MAN', text: 'No. Well, I did see a poster in the library, but honestly it was my neighbour — she swears by the swimming pool here and she\'s the one who told me to ring.' },
          { who: 'WOMAN', text: 'I\'ll put down neighbour, then. Right, let me run through the options. Full membership gives you everything, any time, seven days a week, and that\'s forty-six pounds seventy-five a month. There\'s a student rate at twenty-eight pounds, but that needs a valid student card. And then there\'s off-peak, which is Monday to Friday before five, plus all day at weekends.' },
          { who: 'MAN', text: 'Weekends included? That\'s better than I expected. What does off-peak come to?' },
          { who: 'WOMAN', text: 'Thirty-two pounds fifty a month.' },
          { who: 'MAN', text: 'Thirty-two fifty. Yes, off-peak would suit me much better — I\'m usually free during the day anyway. Let\'s go with that one.' },
          { who: 'WOMAN', text: 'Off-peak it is. Now, everybody has to do a short induction before they use the gym — it takes about forty minutes and one of the instructors shows you how the equipment works. I\'ve got Tuesday evening at half past six?' },
          { who: 'MAN', text: 'Tuesday I\'m on a late shift, unfortunately.' },
          { who: 'WOMAN', text: 'Let me look… Wednesday is fully booked. I could do Thursday, same time, half past six?' },
          { who: 'MAN', text: 'Thursday at six thirty is perfect. Oh — while I\'ve got you, could I book a badminton court as well? My brother\'s visiting next month.' },
          { who: 'WOMAN', text: 'You can, although members can only book courts fourteen days in advance, so ring nearer the time. I\'ll make a note that you\'re interested in badminton.' },
          { who: 'MAN', text: 'Great. Is there anything I need to bring on the first visit?' },
          { who: 'WOMAN', text: 'Two things. Proof of address — a utility bill or a bank statement, either is fine — and a passport photo, because we print it onto your membership card while you wait.' },
          { who: 'MAN', text: 'A passport photo. Right, I\'ll get one done. And do I pay on the day?' },
          { who: 'WOMAN', text: 'You can set up the direct debit at reception. There\'s no joining fee at the moment, which saves you twenty pounds.' },
          { who: 'MAN', text: 'That\'s very good news. Thank you, Karen, that\'s all really clear.' },
          { who: 'WOMAN', text: 'You\'re very welcome. We\'ll see you on Thursday.' }
        ]
      },

      /* ------------------------------------------------ PART 2 */
      {
        number: 2, range: '11 to 20', readTime: 40,
        context: 'You will hear a warden giving a talk to a group of new volunteers at a nature reserve. ' +
                 'First you have some time to look at questions 11 to 15.',
        blurb: 'Questions 11–20.',
        groups: [
          {
            kind: 'mcq',
            title: 'Questions 11–13',
            instructions: 'Choose the correct letter, **A**, **B** or **C**.',
            questions: [
              { n: 11, text: 'The reserve was originally created in order to',
                options: [{ k: 'A', t: 'protect a rare species of orchid.' },
                          { k: 'B', t: 'stop the site being used for building.' },
                          { k: 'C', t: 'provide a study area for local schools.' }],
                answer: 'B',
                evidence: '"The whole place was earmarked for a housing development in 1974… the reserve exists because that was stopped."' },
              { n: 12, text: 'What does the warden say has changed at the reserve this year?',
                options: [{ k: 'A', t: 'The number of visitors has fallen.' },
                          { k: 'B', t: 'The lake has been made deeper.' },
                          { k: 'C', t: 'Part of the site has been fenced off.' }],
                answer: 'C',
                evidence: '"…we\'ve fenced off the whole of the northern shore this spring." Visitor numbers went up, and the dredging was last year.' },
              { n: 13, text: 'Volunteers who work on Saturdays should note that',
                options: [{ k: 'A', t: 'the car park fills up early.' },
                          { k: 'B', t: 'lunch is not provided.' },
                          { k: 'C', t: 'they must sign in at the gate.' }],
                answer: 'A',
                evidence: '"On a sunny Saturday the car park is full by half past nine."' }
            ]
          },
          {
            kind: 'mcq-multi',
            title: 'Questions 14 and 15',
            instructions: 'Choose **TWO** letters, **A–E**.\n\nWhich **TWO** pieces of equipment does the warden say volunteers should bring themselves?',
            options: [{ k: 'A', t: 'waterproof boots' }, { k: 'B', t: 'gardening gloves' },
                      { k: 'C', t: 'a packed lunch' }, { k: 'D', t: 'a water bottle' },
                      { k: 'E', t: 'insect repellent' }],
            questions: [{ ns: [14, 15], answer: ['A', 'D'],
              evidence: 'Gloves and repellent are supplied; there is a café for lunch. Boots and a refillable water bottle are the volunteer\'s own.' }]
          },
          {
            kind: 'label-select',
            title: 'Questions 16–20',
            instructions: 'Label the map below.\n\nWrite the correct letter, **A–H**, next to questions 16–20.',
            svg: MAP,
            svgCaption: 'Marsden Bay Nature Reserve',
            options: [{ k: 'A' }, { k: 'B' }, { k: 'C' }, { k: 'D' },
                      { k: 'E' }, { k: 'F' }, { k: 'G' }, { k: 'H' }],
            questions: [
              { n: 16, text: 'Café', answer: 'A', evidence: 'Left turn at the crossroads, far western end, on the left as you walk west.' },
              { n: 17, text: 'Bird hide', answer: 'H', evidence: 'Right at the crossroads, all the way to the end, on the lake shore.' },
              { n: 18, text: 'Wildflower meadow', answer: 'C', evidence: '"directly opposite the café, on the other side of the path".' },
              { n: 19, text: 'Pond-dipping platform', answer: 'E', evidence: 'First thing on the right heading east from the crossroads.' },
              { n: 20, text: 'Tool store', answer: 'D', evidence: '"carry straight on past the crossroads… immediately on your left".' }
            ]
          }
        ],
        transcript: [
          { who: 'WOMAN', text: 'Right, if everybody can hear me — welcome to Marsden Bay, and thank you all for giving up your Saturdays. I\'m Priya, I\'m the senior warden here, and this talk will take about ten minutes and then we\'ll get you out onto the site.' },
          { who: 'WOMAN', text: 'A little history first, because people usually assume a reserve like this was set up to protect something. In fact the orchids everyone photographs only arrived in the nineteen-nineties. What happened was that in 1974 the whole of this valley was earmarked for a housing development — eight hundred homes, right across the lake. A group of local residents fought it for four years and won, and the reserve exists because that was stopped. The education centre and the school visits all came much later.' },
          { who: 'WOMAN', text: 'Now, a few things have changed since some of you were last here. Visitor numbers are actually up — about eleven per cent on last year — and we dredged the shallow end of the lake in the previous season, which has helped enormously. But the big difference this year is that we\'ve fenced off the whole of the northern shore this spring, because a pair of bitterns are nesting there and they will abandon the site if they\'re disturbed. So please don\'t take anybody past the fence line, even if they ask nicely.' },
          { who: 'WOMAN', text: 'A practical point about Saturdays in particular. There\'s no need to sign in at the gate — we do the register here — and lunch is provided in the café for anyone doing a full day. But do come early, because on a sunny Saturday the car park is full by half past nine, and I\'m afraid I can\'t magic up extra spaces.' },
          { pause: 3 },
          { who: 'WOMAN', text: 'Equipment. We supply the tools, obviously, and there\'s a box of gardening gloves in every size by the tool store — please use them, brambles are vicious. We also keep insect repellent in the visitor centre and it\'s free, so help yourselves in midge season. What we don\'t provide is footwear, and I can\'t stress this enough: this is a wetland, and trainers will be ruined within the hour, so waterproof boots are essential and you need to bring your own. The other thing to bring is a water bottle — a refillable one, please, we\'ve taken the plastic ones out of the machine and there are taps by the café and by the hide.' },
          { pause: 25 },
          { who: 'WOMAN', text: 'Let\'s look at the map on your handout so you know where things are. You\'re looking at the reserve from above, with north at the top, and you can see the entrance gate at the bottom, just above the car park.' },
          { who: 'WOMAN', text: 'Come through the gate and you\'ll find the visitor centre straight away on your right — that\'s marked for you. Walk up the main path from the gate and after about two hundred metres you reach a crossroads, where a second path runs east to west.' },
          { who: 'WOMAN', text: 'If you turn left at that crossroads and follow the path west, all the way to the far end, you\'ll come to the café. It\'s a low building in an old barn, and it\'s on your left-hand side as you walk west, tucked into the corner. That\'s where you\'ll get your lunch.' },
          { who: 'WOMAN', text: 'Directly opposite the café, on the other side of that same path, is the wildflower meadow — you can\'t miss it in June. Two of you will be doing seed collection there this morning.' },
          { who: 'WOMAN', text: 'Now go back to the crossroads and turn the other way, heading east. The first thing you come to is on your right-hand side, and that\'s the pond-dipping platform, where the school groups do their aquatic invertebrate sessions. Keep walking east past that, right to the very end of the path, and on your left, on the shore of the lake itself, is the bird hide. That\'s the one with the sliding shutters — please close them when you leave.' },
          { who: 'WOMAN', text: 'And finally, if instead of turning at the crossroads you simply carry straight on up the main path towards the lake, the tool store is immediately on your left. It\'s a green shed, the padlock code is on your welcome sheet, and everything comes back there at four o\'clock, cleaned.' },
          { who: 'WOMAN', text: 'Just so you\'re not confused by the other buildings: the one east of the tool store is the pump house and it\'s locked, the compost heaps are down in the south-east corner, and the little structure by the old jetty is derelict, so please stay out of it. Any questions before we go out?' }
        ]
      },

      /* ------------------------------------------------ PART 3 */
      {
        number: 3, range: '21 to 30', readTime: 40,
        context: 'You will hear two students, Leah and Tom, discussing their research project with their tutor. ' +
                 'First you have some time to look at questions 21 to 26.',
        blurb: 'Questions 21–30.',
        groups: [
          {
            kind: 'mcq',
            title: 'Questions 21–26',
            instructions: 'Choose the correct letter, **A**, **B** or **C**.',
            questions: [
              { n: 21, text: 'Leah and Tom chose to study bees mainly because',
                options: [{ k: 'A', t: 'they had studied them in a previous module.' },
                          { k: 'B', t: 'earlier data on them already existed for the city.' },
                          { k: 'C', t: 'they are easier to identify than other insects.' }],
                answer: 'B',
                evidence: '"the wildlife trust had been running transects since 2016 — so we had six years of baseline to compare with."' },
              { n: 22, text: 'What problem did they have with their fieldwork method?',
                options: [{ k: 'A', t: 'Each survey walk took much longer than planned.' },
                          { k: 'B', t: 'They could not always identify insects in flight.' },
                          { k: 'C', t: 'Two of the sites were too close together.' }],
                answer: 'A',
                evidence: '"We\'d allowed forty minutes per transect and they were taking nearly two hours."' },
              { n: 23, text: 'Dr Whitfield advises them to',
                options: [{ k: 'A', t: 'survey fewer sites more often.' },
                          { k: 'B', t: 'extend the study by a further month.' },
                          { k: 'C', t: 'recruit more volunteer surveyors.' }],
                answer: 'A',
                evidence: '"Four sites visited eight times each will tell you far more than eight sites visited twice."' },
              { n: 24, text: 'What surprised Leah about the results?',
                options: [{ k: 'A', t: 'how few bumblebee species were recorded' },
                          { k: 'B', t: 'the poor performance of the city park' },
                          { k: 'C', t: 'the effect of rainfall on the counts' }],
                answer: 'B',
                evidence: '"the park came out worst of the lot… all that mown grass is a desert."' },
              { n: 25, text: 'Tom is concerned that their data may be unreliable because',
                options: [{ k: 'A', t: 'the sites were not surveyed in the same weather.' },
                          { k: 'B', t: 'some records were entered twice.' },
                          { k: 'C', t: 'he and Leah counted in different ways.' }],
                answer: 'A',
                evidence: '"Half the cemetery visits were in full sun and half the embankment visits were overcast."' },
              { n: 26, text: 'For the presentation, they agree that Leah will',
                options: [{ k: 'A', t: 'produce the maps.' },
                          { k: 'B', t: 'write the conclusion.' },
                          { k: 'C', t: 'explain the statistics.' }],
                answer: 'C',
                evidence: '"You take the stats section, then — you actually understand the model." Tom does the maps.' }
            ]
          },
          {
            kind: 'matching',
            title: 'Questions 27–30',
            instructions: 'What was the main practical difficulty at each site?\n\n' +
              'Choose **FOUR** answers from the box and write the correct letter, **A–F**, next to questions 27–30.',
            optionsTitle: 'Practical difficulties',
            options: [
              { k: 'A', t: 'access was restricted' },
              { k: 'B', t: 'the habitat was altered during the study' },
              { k: 'C', t: 'too few helpers were available' },
              { k: 'D', t: 'a piece of equipment failed' },
              { k: 'E', t: 'members of the public interrupted the work' },
              { k: 'F', t: 'the paperwork was lost' }
            ],
            questions: [
              { n: 27, text: 'The allotments', answer: 'E', evidence: '"every single visit somebody came over for a chat… we lost twenty minutes a time."' },
              { n: 28, text: 'The cemetery', answer: 'B', evidence: 'The council mowed the long grass in July, halfway through the study.' },
              { n: 29, text: 'The railway embankment', answer: 'A', evidence: 'The permit only allowed entry on weekdays with a rail escort.' },
              { n: 30, text: 'The rooftop garden', answer: 'D', evidence: '"the anemometer packed up in week three".' }
            ]
          }
        ],
        transcript: [
          { who: 'TUTOR', text: 'Come in, both of you. So — the urban pollinator project. You\'re about eight weeks in now. Talk me through where you\'ve got to. Leah?' },
          { who: 'LEAH', text: 'Well, the first thing to say is why bees. We did look at hoverflies and at butterflies, and honestly butterflies would have been easier to identify. But the wildlife trust had been running transects across the city since 2016, and they were happy to share it, so we had six years of baseline data to compare our counts with. Nothing like that exists for the other groups.' },
          { who: 'TUTOR', text: 'That\'s the right reason. A comparison set is worth a great deal more than convenience. And the method — you\'re walking fixed transects?' },
          { who: 'TOM', text: 'We are, and that\'s where we\'ve run into trouble. We copied the trust\'s protocol: a fixed two-hundred-metre route, walked at a steady pace, recording everything within two metres either side. On paper it\'s forty minutes per transect. In practice they were taking nearly two hours.' },
          { who: 'TUTOR', text: 'Why?' },
          { who: 'TOM', text: 'Partly identification — we stop and photograph anything we\'re not certain of. But mostly it\'s just that there\'s more there than we expected. On a good day at the allotments we were logging over a hundred individuals.' },
          { who: 'LEAH', text: 'Which is a nice problem to have, except that we planned eight sites and there simply aren\'t enough hours.' },
          { who: 'TUTOR', text: 'Then don\'t do eight. This is the commonest mistake in an undergraduate project — spreading yourself so thin that nothing is properly sampled. Cut it to four sites and visit each of them twice as often. Four sites visited eight times each will tell you far more than eight sites visited twice, and your statistics will actually work.' },
          { who: 'LEAH', text: 'We wondered about bringing in volunteers instead.' },
          { who: 'TUTOR', text: 'No. Not at this stage — training them and checking their identifications would cost you more time than it saves, and it introduces observer variation you can\'t control for. Reduce the sites.' },
          { pause: 3 },
          { who: 'TUTOR', text: 'Now, what have the results thrown up so far? Anything unexpected?' },
          { who: 'LEAH', text: 'Yes, and it wasn\'t what I predicted at all. I assumed the big city park would be the richest site — it\'s the largest green space by a mile. And the park came out worst of the lot. Nine species. The cemetery had twenty-three.' },
          { who: 'TUTOR', text: 'Which tells you what?' },
          { who: 'LEAH', text: 'That area isn\'t the point — structure is. All that mown grass is a desert as far as a bee is concerned. The cemetery hasn\'t been mown properly in decades, so there\'s knapweed and bird\'s-foot trefoil everywhere.' },
          { who: 'TOM', text: 'I\'m less confident about the numbers than Leah is, though. My worry is the weather. The protocol says survey in dry conditions above thirteen degrees, and we stuck to that, but within those limits there\'s a huge range. Half the cemetery visits happened to be in full sun and half the embankment visits were overcast. That alone could produce the difference we\'re reporting.' },
          { who: 'TUTOR', text: 'Good — that\'s exactly the kind of thing an examiner will ask you. You can\'t fix it retrospectively, but you can record it honestly and, if you have the cloud-cover figures, include them as a covariate. Don\'t hide it in the limitations paragraph at the end; put it in the methods where it belongs.' },
          { pause: 3 },
          { who: 'TUTOR', text: 'Before you go — the practical difficulties at each site. I want those written up, because they explain your gaps.' },
          { who: 'TOM', text: 'The allotments were the friendliest place and the least productive for that reason. Every single visit somebody came over for a chat about what we were doing, and we lost twenty minutes a time. Lovely people, terrible for a timed transect.' },
          { who: 'LEAH', text: 'The cemetery was the frustrating one. It was our best site, and then in the third week of July the council came in and mowed the whole southern section, right in the middle of the study. So the second half of our data there is from a completely different habitat than the first half.' },
          { who: 'TUTOR', text: 'That\'s worth a paragraph on its own. And the embankment?' },
          { who: 'TOM', text: 'Network Rail were fine about it in the end but the permit only lets us on weekdays and only with a member of their staff walking with us. So we could never survey at the weekend and we had to cancel twice when nobody was available.' },
          { who: 'LEAH', text: 'And the rooftop garden — that was purely bad luck. The anemometer packed up in week three, so we\'ve got no wind-speed readings for the last five visits, which matters up there more than anywhere.' },
          { who: 'TUTOR', text: 'Then borrow the spare from the technicians and note the gap. Right — the presentation is in a fortnight. How are you splitting it?' },
          { who: 'TOM', text: 'I thought I\'d do the maps and the site descriptions. I\'ve got all the GIS layers built already.' },
          { who: 'LEAH', text: 'And I\'ll write the conclusion —' },
          { who: 'TOM', text: 'Actually, would you take the stats section? You actually understand the model. I can talk through the maps but if anybody asks me about the mixed effects I\'ll fall apart.' },
          { who: 'LEAH', text: 'Fair enough. I\'ll do the statistics and we\'ll write the conclusion together.' },
          { who: 'TUTOR', text: 'Sensible. Send me the slides by the Friday before.' }
        ]
      },

      /* ------------------------------------------------ PART 4 */
      {
        number: 4, range: '31 to 40', readTime: 45,
        context: 'You will hear part of a lecture on the engineering of offshore lighthouses. ' +
                 'First you have some time to look at questions 31 to 40.',
        blurb: 'Questions 31–40. Complete the notes below.',
        groups: [{
          kind: 'gap',
          title: 'Questions 31–40',
          instructions: 'Complete the notes below.',
          limitText: 'Write ONE WORD ONLY for each answer.',
          maxWords: 1,
          blocks: [
            { t: 'h', text: 'BUILDING LIGHTHOUSES ON ROCKS' },
            { t: 'lead', text: 'The problem' },
            { t: 'ul', items: [
              'A tower on an exposed rock must resist waves that hit it with the force of a moving [[31]].',
              'Building time is limited: at the Eddystone the rock is clear of the sea for only about two [[32]] in every tide.'
            ] },
            { t: 'lead', text: 'Early attempts at the Eddystone' },
            { t: 'ul', items: [
              'Winstanley\'s tower (1698) was largely made of [[33]] and was swept away in the great storm of 1703.',
              'Rudyerd\'s tower lasted almost fifty years but was destroyed by [[34]].'
            ] },
            { t: 'lead', text: 'Smeaton\'s tower (1759) — the breakthrough' },
            { t: 'ul', items: [
              'Shape copied from the trunk of an [[35]] tree: wide at the base, curving inwards.',
              'Used [[36]] lime, a cement that would harden even under water.',
              'Stone blocks were locked together using [[37]] joints, like a carpenter\'s.',
              'Each course was pinned to the one below with marble [[38]].',
              'The tower was later taken down and rebuilt as a [[39]] on Plymouth Hoe.'
            ] },
            { t: 'lead', text: 'Later developments' },
            { t: 'ul', items: [
              'Douglass added a solid [[40]] base to break the force of the waves before they reached the tower.',
              'Fresnel\'s stepped lens made a far brighter beam possible from the same light source.',
              'Today almost all towers are automated and run on solar power.'
            ] }
          ],
          questions: [
            { n: 31, answer: 'car', accept: ['vehicle'], evidence: '"roughly the same force as a car hitting a wall at speed".' },
            { n: 32, answer: 'hours', evidence: '"the rock is only clear of the sea for about two hours in every tide".' },
            { n: 33, answer: 'wood', accept: ['timber'], evidence: '"an extraordinary wooden confection".' },
            { n: 34, answer: 'fire', evidence: '"it burned down in 1755 — the lantern caught fire".' },
            { n: 35, answer: 'oak', evidence: '"he took his shape from the trunk of an oak".' },
            { n: 36, answer: 'hydraulic', evidence: '"hydraulic lime — a cement that sets under water".' },
            { n: 37, answer: 'dovetail', evidence: '"dovetail joints, exactly as a cabinetmaker would use".' },
            { n: 38, answer: 'dowels', accept: ['dowel'], evidence: '"pinned with marble dowels".' },
            { n: 39, answer: 'monument', evidence: '"re-erected as a monument on Plymouth Hoe, where it still stands".' },
            { n: 40, answer: 'cylindrical', accept: ['cylinder'], evidence: '"a solid cylindrical base… the wave energy is spent before it reaches the tower proper".' }
          ]
        }],
        transcript: [
          { who: 'LECTURER', text: 'Good afternoon. Today I want to use a single engineering problem — how do you build a stone tower on a rock in the open sea — as a way into the wider question of how design knowledge accumulates. And I want to use it because the solution, when it came, was arrived at by a man who had never built anything at sea in his life.' },
          { who: 'LECTURER', text: 'Let\'s start with the scale of the difficulty. A wave breaking on an exposed reef in an Atlantic gale exerts, on each square metre, something in the order of thirty tonnes. To put that in terms you can picture: the impact on the wall of a lighthouse is roughly the same force as a car hitting a wall at speed — and it happens not once, but every few seconds, for days on end. Any structure that merely stands there passively will eventually be prised apart.' },
          { who: 'LECTURER', text: 'The second difficulty is time. The Eddystone reef, fourteen miles off Plymouth, is submerged at high water. The rock is only clear of the sea for about two hours in every tide, and in the eighteenth century you could reach it on perhaps sixty days of the year. So the working season was, in effect, a few dozen afternoons.' },
          { pause: 3 },
          { who: 'LECTURER', text: 'The first man to try was Henry Winstanley, a merchant and showman, in the sixteen-nineties. What he produced was an extraordinary wooden confection, covered in flags and iron scrollwork, and he was so confident that he said he wished to be inside it during the greatest storm that ever blew. In November 1703 he got his wish. The great storm of that year removed the tower, Winstanley, and five other men, and left nothing behind but a few twisted iron stubs in the rock.' },
          { who: 'LECTURER', text: 'The second attempt, by John Rudyerd, was much better thought out — a smooth cone, ballasted with stone but still essentially a timber structure, and it stood for forty-seven years. Note that it was not the sea that finished it. In 1755 the lantern caught fire, and because the whole upper works were wood, the fire consumed the building from the top down. The keepers were rescued; one of them, according to the story, swallowed a quantity of molten lead and died some days later.' },
          { pause: 3 },
          { who: 'LECTURER', text: 'And so to John Smeaton, who took the commission in 1756. Smeaton was an instrument maker by training, and his reasoning was analogical rather than empirical. Rather than asking how to make a tower strong enough, he asked what natural object already resists this kind of loading — and he took his shape from the trunk of an oak. An oak is broad and flared where it meets the ground, narrows quickly, and then rises in a gentle concave curve. The flare puts the weight where the overturning forces are greatest; the curve means that wind, or water, is deflected rather than met head-on.' },
          { who: 'LECTURER', text: 'That shape is the famous part. The details matter more. First, the mortar. Ordinary lime mortar dissolves in sea water, so Smeaton experimented until he found what he called hydraulic lime — a cement that sets under water, made by burning limestone with a high clay content. That single piece of materials research is arguably his greatest legacy; it is the direct ancestor of Portland cement.' },
          { who: 'LECTURER', text: 'Second, the joints. Smeaton did not trust mortar to hold the blocks together against impact, so he made the stones themselves interlock. Each block was cut with dovetail joints, exactly as a cabinetmaker would use, so that a block could not be pulled outwards without dragging its neighbours with it. In effect the whole course became a single stone ring.' },
          { who: 'LECTURER', text: 'Third, the vertical connection. Rings of stone can still be lifted off one another, so every course was pinned to the one below with marble dowels, and oak wedges were driven into the joints, which then swelled in the wet and locked everything solid.' },
          { who: 'LECTURER', text: 'Smeaton\'s tower was lit in 1759 and it worked. It stood for a hundred and twenty years, and it was not replaced because it failed. It was replaced because the reef beneath it began to be undercut by the sea, and the tower itself shook in heavy weather. When the replacement was built alongside, the people of Plymouth paid to have Smeaton\'s tower dismantled stone by stone and re-erected as a monument on Plymouth Hoe, where it still stands and where you can climb it.' },
          { pause: 3 },
          { who: 'LECTURER', text: 'Two later refinements are worth noting. James Douglass, who built that replacement in the eighteen-seventies, observed that the worst damage always occurred where the tower met the rock, because waves rebounding off the vertical face doubled in height. His answer was to sink a solid cylindrical base into the reef and set the curved tower on top of it, so that the wave energy is spent before it reaches the tower proper. Every subsequent rock lighthouse copies that arrangement.' },
          { who: 'LECTURER', text: 'And the light itself: Augustin Fresnel\'s stepped lens, which uses concentric rings of prisms instead of a single thick piece of glass, allowed a far brighter beam from the same source, and it made these towers genuinely useful at the distances involved. Today, of course, the keepers have gone. Almost every one of these towers is automated, monitored remotely, and runs on solar power with a battery bank — which is, when you think about it, a rather modest ending for so much heroic engineering.' }
        ]
      }
    ]
  });
})();
