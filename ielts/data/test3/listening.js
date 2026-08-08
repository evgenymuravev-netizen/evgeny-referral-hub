/* Practice Test 3 — Listening */
(function () {
  function room(letter, x0, y0, x1, y1) {
    return '<g><rect x="' + x0 + '" y="' + y0 + '" width="' + (x1 - x0) + '" height="' + (y1 - y0) + '" ' +
      'fill="currentColor" fill-opacity=".05" stroke="currentColor" stroke-width="1.4"/>' +
      '<text x="' + ((x0 + x1) / 2) + '" y="' + ((y0 + y1) / 2 + 7) + '" text-anchor="middle" font-size="19" ' +
      'font-weight="700" fill="currentColor">' + letter + '</text></g>';
  }

  var PLAN = [
    '<svg viewBox="0 0 580 380" width="580" role="img" aria-label="Ground floor plan of Ashcombe Mill"',
    ' style="color:var(--ink-2)" xmlns="http://www.w3.org/2000/svg">',
    '<rect x="30" y="30" width="500" height="290" fill="none" stroke="currentColor" stroke-width="2.5"/>',
    room('A', 30, 30, 155, 155), room('B', 155, 30, 280, 155),
    room('C', 280, 30, 405, 155), room('D', 405, 30, 530, 155),
    room('E', 30, 195, 155, 320), room('F', 155, 195, 280, 320),
    room('G', 280, 195, 405, 320), room('H', 405, 195, 530, 320),
    /* corridor */
    '<line x1="30" y1="155" x2="530" y2="155" stroke="currentColor" stroke-width="1.4"/>',
    '<line x1="30" y1="195" x2="530" y2="195" stroke="currentColor" stroke-width="1.4"/>',
    '<text x="200" y="181" font-size="12" fill="currentColor" fill-opacity=".8">corridor</text>',
    /* stairs, mid corridor */
    '<rect x="290" y="158" width="46" height="34" fill="none" stroke="currentColor" stroke-dasharray="3 2"/>',
    '<text x="313" y="180" text-anchor="middle" font-size="10" fill="currentColor">stairs</text>',
    /* entrance */
    '<path d="M6 175 h22" stroke="currentColor" stroke-width="2.5"/>',
    '<path d="M22 169 l8 6 -8 6" fill="none" stroke="currentColor" stroke-width="2.5"/>',
    '<text x="4" y="163" font-size="12" fill="currentColor">entrance</text>',
    /* water wheel outside east wall */
    '<circle cx="556" cy="175" r="20" fill="none" stroke="#4a7dfc" stroke-width="2.5"/>',
    '<text x="556" y="215" text-anchor="middle" font-size="11" fill="currentColor">water</text>',
    '<text x="556" y="228" text-anchor="middle" font-size="11" fill="currentColor">wheel</text>',
    '</svg>'
  ].join('');

  IELTSData.test('test3', {
    name: 'Practice Test 3',
    blurb: 'Dress rehearsal. Holiday cottage booking · watermill museum · design project review · bird navigation.'
  });

  IELTSData.add('test3', 'listening', {
    parts: [

      /* ------------------------------------------------ PART 1 */
      {
        number: 1, range: '1 to 10', readTime: 30,
        context: 'You will hear a man booking a holiday cottage over the telephone. ' +
                 'First you have some time to look at questions 1 to 10.',
        blurb: 'Questions 1–10. Complete the booking form below.',
        groups: [{
          kind: 'gap',
          title: 'Questions 1–10',
          instructions: 'Complete the booking form below.',
          limitText: 'Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.',
          maxWords: 2,
          blocks: [
            { t: 'h', text: 'HOLLOWAY FARM COTTAGES — Booking form' },
            { t: 'dl', items: [
              ['Name:', 'Mark [[1]]'],
              ['Cottage booked:', '[[2]] Cottage'],
              ['Arrival:', '[[3]]'],
              ['Number of nights:', '[[4]]'],
              ['Extra bed needed for a:', '[[5]]'],
              ['Total price:', '£[[6]]'],
              ['Deposit payable today:', '£[[7]]'],
              ['Keys collected from the:', '[[8]]'],
              ['The cottage has no:', '[[9]]'],
              ['Guests should bring their own:', '[[10]]']
            ] }
          ],
          questions: [
            { n: 1, answer: 'Fenwick', evidence: '"F. E. N. W. I. C. K."' },
            { n: 2, answer: 'Larkspur', evidence: 'Foxglove sleeps only four; Larkspur is the one that takes six.' },
            { n: 3, answer: '19 April', accept: ['April 19', '19th April'], evidence: 'The 12th is taken, so they move to the 19th.' },
            { n: 4, answer: '5', accept: ['five'], evidence: '"Five nights, then — Friday to Wednesday."' },
            { n: 5, answer: 'toddler', accept: ['a toddler'], evidence: '"a travel cot for the toddler".' },
            { n: 6, answer: '690', accept: ['£690'], evidence: '"six hundred and ninety pounds for the five nights".' },
            { n: 7, answer: '150', accept: ['£150'], evidence: 'The deposit is a flat £150, not the 25% he assumed.' },
            { n: 8, answer: 'farmhouse', evidence: '"pick the keys up from the farmhouse" — the key safe is only for late arrivals.' },
            { n: 9, answer: 'mobile signal', accept: ['phone signal', 'signal'], evidence: '"there\'s no mobile signal in the valley at all".' },
            { n: 10, answer: 'towels', evidence: 'Bed linen is provided; towels are not.' }
          ]
        }],
        transcript: [
          { who: 'WOMAN', text: 'Good morning, Holloway Farm Cottages.' },
          { who: 'MAN', text: 'Hello. I\'m looking at your website and I wanted to check availability for a family holiday in April.' },
          { who: 'WOMAN', text: 'Of course. Can I take a name first?' },
          { who: 'MAN', text: 'It\'s Mark Fenwick. F. E. N. W. I. C. K.' },
          { who: 'WOMAN', text: 'Thank you, Mr Fenwick. How many of you would there be?' },
          { who: 'MAN', text: 'Six altogether — four adults and two small children.' },
          { who: 'WOMAN', text: 'Then it would have to be Larkspur. Foxglove is the pretty one everybody asks about but it only sleeps four, and Bramble is closed until May for a new bathroom.' },
          { who: 'MAN', text: 'Larkspur it is, then. We were hoping for the week beginning Friday the twelfth of April.' },
          { who: 'WOMAN', text: 'Let me look… no, the twelfth is gone, I\'m afraid — that\'s the last weekend of the school holiday. I have the nineteenth free.' },
          { who: 'MAN', text: 'The nineteenth would be fine, actually. Better, if anything.' },
          { who: 'WOMAN', text: 'Arriving Friday the nineteenth. And how long for?' },
          { who: 'MAN', text: 'We\'d leave on the Wednesday, so that\'s… five nights.' },
          { who: 'WOMAN', text: 'Five nights, Friday to Wednesday. Now — the two small children. How old?' },
          { who: 'MAN', text: 'Six and eighteen months. The six-year-old is happy in a normal bed but we\'d need something for the little one.' },
          { who: 'WOMAN', text: 'I\'ll put down a travel cot for the toddler. There\'s no charge for that, and there\'s a high chair in the kitchen already.' },
          { pause: 3 },
          { who: 'MAN', text: 'And what would that come to?' },
          { who: 'WOMAN', text: 'Larkspur in April is a hundred and thirty-eight a night, but there\'s a ten per cent reduction on stays of five nights or more, so it comes to six hundred and ninety pounds for the five nights.' },
          { who: 'MAN', text: 'Six hundred and ninety. That\'s within budget. Do you take twenty-five per cent up front, like the last place we used?' },
          { who: 'WOMAN', text: 'No, we keep it simple — it\'s a flat deposit of a hundred and fifty pounds whatever the booking, and the balance is due two weeks before you arrive.' },
          { who: 'MAN', text: 'A hundred and fifty. That\'s straightforward.' },
          { pause: 3 },
          { who: 'MAN', text: 'A few practical things, if you don\'t mind. How do we get in?' },
          { who: 'WOMAN', text: 'Come to the farmhouse and pick the keys up from us — we\'re the grey building with the blue door, first on your left as you come up the track. There is a key safe on the cottage wall but that\'s only for people arriving after nine at night, and you\'d need to ring ahead for the code.' },
          { who: 'MAN', text: 'We should be there by five. And is there internet? My wife may have to do some work.' },
          { who: 'WOMAN', text: 'There\'s decent broadband in the cottage, yes, and it\'s free. What I do have to warn you about is that there\'s no mobile signal in the valley at all — not on any network. People do find it a shock. There\'s a landline in the hallway for emergencies.' },
          { who: 'MAN', text: 'No signal for a week. Honestly, that might be the best part of the holiday. Is there anything we need to bring?' },
          { who: 'WOMAN', text: 'Bed linen is all provided and the beds are made up before you arrive. Towels are the one thing we don\'t do — you\'ll need to bring your own, including tea towels. Oh, and if you\'re walking, bring boots; the footpath from the cottage is a working farm and it is genuinely muddy in April.' },
          { who: 'MAN', text: 'Towels and boots. Right. Shall I give you a card number for the deposit?' },
          { who: 'WOMAN', text: 'Please. And I\'ll email the confirmation and directions this afternoon.' }
        ]
      },

      /* ------------------------------------------------ PART 2 */
      {
        number: 2, range: '11 to 20', readTime: 40,
        context: 'You will hear a guide welcoming a group of visitors to a restored watermill. ' +
                 'First you have some time to look at questions 11 to 14.',
        blurb: 'Questions 11–20.',
        groups: [
          {
            kind: 'mcq',
            title: 'Questions 11–14',
            instructions: 'Choose the correct letter, **A**, **B** or **C**.',
            questions: [
              { n: 11, text: 'The mill stopped working commercially because',
                options: [{ k: 'A', t: 'the river was diverted.' }, { k: 'B', t: 'it could not compete on price.' },
                          { k: 'C', t: 'the last miller retired.' }],
                answer: 'B',
                evidence: '"the steam roller mills at the docks could do in an hour what took us a day".' },
              { n: 12, text: 'What does the guide say about the restoration?',
                options: [{ k: 'A', t: 'Most of the machinery is original.' },
                          { k: 'B', t: 'It was funded entirely by donations.' },
                          { k: 'C', t: 'It took longer than expected.' }],
                answer: 'A',
                evidence: '"about eighty per cent of what you\'ll see is the original ironwork" — the lottery grant paid for it and it finished early.' },
              { n: 13, text: 'Visitors are warned that',
                options: [{ k: 'A', t: 'the upper floors are very noisy when the wheel is running.' },
                          { k: 'B', t: 'photography is not permitted indoors.' },
                          { k: 'C', t: 'the staircases are steep and narrow.' }],
                answer: 'C',
                evidence: '"the stairs are original, which is a polite way of saying they are almost ladders".' },
              { n: 14, text: 'The flour produced at the mill today is',
                options: [{ k: 'A', t: 'sold in the shop.' }, { k: 'B', t: 'given away to visitors.' },
                          { k: 'C', t: 'used only for demonstrations.' }],
                answer: 'A',
                evidence: '"we sell every bag we can grind, and it pays two of the salaries here".' }
            ]
          },
          {
            kind: 'label-select',
            title: 'Questions 15–20',
            instructions: 'Label the plan below.\n\nWrite the correct letter, **A–H**, next to questions 15–20.',
            svg: PLAN,
            svgCaption: 'Ashcombe Mill — ground floor',
            options: [{ k: 'A' }, { k: 'B' }, { k: 'C' }, { k: 'D' },
                      { k: 'E' }, { k: 'F' }, { k: 'G' }, { k: 'H' }],
            questions: [
              { n: 15, text: 'Ticket desk', answer: 'E', evidence: '"immediately on your right as you come through the door".' },
              { n: 16, text: 'Miller\'s office', answer: 'A', evidence: '"directly opposite the ticket desk, on the other side of the corridor".' },
              { n: 17, text: 'Gift shop', answer: 'F', evidence: '"next door to the ticket desk, further along on the same side".' },
              { n: 18, text: 'Toilets', answer: 'C', evidence: '"just past the staircase, on your left".' },
              { n: 19, text: 'Wheel viewing room', answer: 'D', evidence: '"the room at the very end on the right of the corridor — sorry, on the north side, nearest the wheel".' },
              { n: 20, text: 'Lift', answer: 'H', evidence: '"right at the far end, in the corner diagonally opposite the entrance".' }
            ]
          }
        ],
        transcript: [
          { who: 'WOMAN', text: 'Good afternoon everybody, and welcome to Ashcombe Mill. My name is Rosalind and I volunteer here three days a week. I\'ll talk for about eight minutes and then you\'re free to wander.' },
          { who: 'WOMAN', text: 'There has been a mill on this site since the twelve hundreds — it\'s in the Domesday survey — and the building you\'re standing in dates from 1798. Milling stopped here in 1936, and people often assume that was because the river was diverted for the reservoir, but that didn\'t happen until 1954. The last miller, Walter Hollis, didn\'t retire either; he went to work for the company that put him out of business. What finished Ashcombe was simply price. The steam roller mills at the docks could do in an hour what took us a day, and they could do it with imported wheat that was cheaper than anything grown in this valley.' },
          { who: 'WOMAN', text: 'The mill then sat empty for fifty years and very nearly fell down. The restoration ran from 2009 to 2014, paid for by a Heritage Lottery grant with about a fifth raised locally, and it actually came in three months ahead of schedule, which I\'m told is almost unheard of. The thing I want you to notice as you go round is how little of it is new: about eighty per cent of what you\'ll see is the original ironwork, cleaned and reassembled. The great spur wheel above you has been turning since the seventeen-nineties.' },
          { who: 'WOMAN', text: 'Two warnings before you set off. Photography is entirely fine, flash and all. The wheel is loud but not dangerously so. What you do need to take seriously is the staircases: they are original, which is a polite way of saying that they are almost ladders, and they are the reason we have an accident book. Hold the rope, one person at a time, and if you would rather not, there is a lift, and there is film of the upper floors in the wheel room.' },
          { who: 'WOMAN', text: 'And yes, we do still grind. Wednesdays and Saturdays, wholemeal and a coarse rye. We sell every bag we can grind, and it pays two of the salaries here — so if you take one home you are directly keeping the mill open. It is not a souvenir; it is genuinely good flour.' },
          { pause: 25 },
          { who: 'WOMAN', text: 'Now let me tell you what is where on this floor, because it isn\'t obvious and people do get lost.' },
          { who: 'WOMAN', text: 'You came in at the west end, and the whole floor is arranged along one long corridor running east towards the river. The ticket desk is immediately on your right as you come through the door — that\'s where Jean is, and she also takes bookings for the Wednesday grinding demonstrations.' },
          { who: 'WOMAN', text: 'Directly opposite the ticket desk, on the other side of the corridor, is the miller\'s office. It\'s been left exactly as Walter Hollis had it — his ledgers are still open on the desk — and it\'s my favourite room in the building.' },
          { who: 'WOMAN', text: 'Next door to the ticket desk, further along the corridor on the same side, is the gift shop, which is where the flour is. Do go in even if you don\'t want to buy anything; the photographs of the restoration are on the wall in there.' },
          { who: 'WOMAN', text: 'Carry on east along the corridor and you\'ll come to the staircase, in the middle, on your right-hand side as you walk. Just past the staircase, on your left, are the toilets. There are more upstairs but I\'d use these.' },
          { who: 'WOMAN', text: 'Keep going to the very end. The room on the north side of the corridor — that\'s the left as you walk east, nearest the wheel itself — is the wheel viewing room, with the glass wall. That\'s where the film runs, on the hour.' },
          { who: 'WOMAN', text: 'And the lift is right at the far end on the other side, in the corner diagonally opposite the door you came in by. It takes two people and a wheelchair, and it is slow, but it goes to all three floors.' },
          { who: 'WOMAN', text: 'The two rooms I haven\'t mentioned — the one between the office and the toilets, and the one between the shop and the lift — are the education room, which has a school group in it this afternoon, and the store, which is full of things we haven\'t catalogued yet. Both are closed. Right, off you go, and I\'ll be in the wheel room if anybody has questions.' }
        ]
      },

      /* ------------------------------------------------ PART 3 */
      {
        number: 3, range: '21 to 30', readTime: 40,
        context: 'You will hear two engineering students, Yusuf and Beth, discussing a design project with their tutor. ' +
                 'First you have some time to look at questions 21 to 24.',
        blurb: 'Questions 21–30.',
        groups: [
          {
            kind: 'matching',
            title: 'Questions 21–24',
            instructions: 'What does the tutor say about each part of the prototype?\n\n' +
              'Choose **FOUR** answers from the box and write the correct letter, **A–F**, next to questions 21–24.',
            optionsTitle: 'Comments',
            options: [
              { k: 'A', t: 'It should be left exactly as it is.' },
              { k: 'B', t: 'A different material should be used.' },
              { k: 'C', t: 'It needs to be tested for longer.' },
              { k: 'D', t: 'It is too expensive to manufacture.' },
              { k: 'E', t: 'Users will not understand how it works.' },
              { k: 'F', t: 'It duplicates something else in the design.' }
            ],
            questions: [
              { n: 21, text: 'the pre-filter', answer: 'F', evidence: '"the mesh is doing the same job as the sand layer immediately below it".' },
              { n: 22, text: 'the ceramic element', answer: 'C', evidence: '"forty hours tells me nothing. I want a thousand."' },
              { n: 23, text: 'the housing', answer: 'B', evidence: '"ABS will go brittle in UV within a season. Use polypropylene."' },
              { n: 24, text: 'the tap', answer: 'A', evidence: '"Don\'t touch the tap. It\'s the one part of this that is unambiguously right."' }
            ]
          },
          {
            kind: 'mcq',
            title: 'Questions 25–30',
            instructions: 'Choose the correct letter, **A**, **B** or **C**.',
            questions: [
              { n: 25, text: 'Why did the students reject their first design?',
                options: [{ k: 'A', t: 'It was too heavy to carry.' }, { k: 'B', t: 'It required electricity.' },
                          { k: 'C', t: 'It was difficult to clean.' }],
                answer: 'C',
                evidence: '"you couldn\'t get at the inside of it without a screwdriver, and a filter you can\'t clean is a filter nobody uses."' },
              { n: 26, text: 'What does Beth think is the project\'s main strength?',
                options: [{ k: 'A', t: 'the low unit cost' }, { k: 'B', t: 'the speed of filtration' },
                          { k: 'C', t: 'the fact that it needs no spare parts' }],
                answer: 'A',
                evidence: '"Four pounds twenty. That\'s the whole point of it."' },
              { n: 27, text: 'The tutor is concerned that the students have',
                options: [{ k: 'A', t: 'not spoken to any potential users.' },
                          { k: 'B', t: 'copied an existing commercial product.' },
                          { k: 'C', t: 'underestimated how long assembly takes.' }],
                answer: 'A',
                evidence: '"Have either of you actually put this in front of somebody who would use it? … That is a serious gap."' },
              { n: 28, text: 'What will Yusuf do before the next meeting?',
                options: [{ k: 'A', t: 'rebuild the prototype' }, { k: 'B', t: 'redo the cost calculations' },
                          { k: 'C', t: 'arrange a session with a community group' }],
                answer: 'C',
                evidence: 'Beth takes the costing; Yusuf will contact the refugee support centre.' },
              { n: 29, text: 'The tutor says the report should give most space to',
                options: [{ k: 'A', t: 'the testing results.' }, { k: 'B', t: 'the design decisions that were rejected.' },
                          { k: 'C', t: 'the review of existing products.' }],
                answer: 'B',
                evidence: '"the ideas you killed and why — that section is where the marks are, and everybody makes it the shortest."' },
              { n: 30, text: 'What is the deadline for the draft report?',
                options: [{ k: 'A', t: 'the end of week 9' }, { k: 'B', t: 'the Monday of week 10' },
                          { k: 'C', t: 'the Friday of week 10' }],
                answer: 'B',
                evidence: 'The tutor moves it from Friday of week 9 to Monday of week 10 so she can read it before the panel.' }
            ]
          }
        ],
        transcript: [
          { who: 'TUTOR', text: 'Right. Put it on the table and talk me through it. Where are you compared with the last time I saw this?' },
          { who: 'BETH', text: 'It\'s the second prototype. The first one we scrapped completely.' },
          { who: 'TUTOR', text: 'Why?' },
          { who: 'YUSUF', text: 'It worked, that was the annoying part. Flow rate was fine and it weighed under a kilo. But you couldn\'t get at the inside of it without a screwdriver, and a filter you can\'t clean is a filter nobody uses. We watched somebody try and it took eleven minutes.' },
          { who: 'TUTOR', text: 'Good. That is exactly the right reason to throw something away. What does this one cost?' },
          { who: 'BETH', text: 'Four pounds twenty at a thousand units. That\'s the whole point of it — everything comparable on the market is fifteen pounds upwards. The flow rate is slower than the commercial ones and I don\'t care, because at four pounds twenty a household can own two.' },
          { who: 'TUTOR', text: 'Agreed, and that is the sentence your report should open with. Now let me look at the parts.' },
          { pause: 3 },
          { who: 'TUTOR', text: 'This top section — the mesh.' },
          { who: 'YUSUF', text: 'That\'s the pre-filter. It takes out leaves, grit, anything large.' },
          { who: 'TUTOR', text: 'And underneath it is a sand layer that also takes out leaves, grit and anything large. The mesh is doing the same job as the sand layer immediately below it. You have two components where you need one, and every component is a cost and a failure point. Take one out — I don\'t much mind which.' },
          { who: 'BETH', text: 'The ceramic element next. That\'s the part that actually does the microbiological work.' },
          { who: 'TUTOR', text: 'How long have you run it for?' },
          { who: 'BETH', text: 'Forty hours, with contaminated feedwater. Log reduction was where we hoped.' },
          { who: 'TUTOR', text: 'Forty hours tells me nothing. Ceramics fail by clogging and by cracking, and neither happens in forty hours. I want a thousand, and I want the flow rate logged the whole way through, because the number that matters is not how it performs new but when it performs badly enough that someone stops using it.' },
          { who: 'YUSUF', text: 'A thousand hours is six weeks running continuously.' },
          { who: 'TUTOR', text: 'Then start it tonight.' },
          { pause: 3 },
          { who: 'TUTOR', text: 'The housing. What is this?' },
          { who: 'YUSUF', text: 'ABS. It was what the workshop had.' },
          { who: 'TUTOR', text: 'ABS will go brittle in UV within a season, and this thing is going to sit outside a door in strong sunlight. Use polypropylene. Same price, slightly harder to mould, and it will still be there in five years. Change the material and re-run nothing else — the geometry is fine.' },
          { who: 'BETH', text: 'And the tap? We went back and forth on that for a fortnight.' },
          { who: 'TUTOR', text: 'Don\'t touch the tap. It\'s the one part of this that is unambiguously right — it\'s obvious how it works, it can be operated with a wrist rather than fingers, and it can be replaced with a standard part from any hardware shop. Leave it completely alone.' },
          { pause: 3 },
          { who: 'TUTOR', text: 'Now. A question, and I suspect I know the answer. Have either of you actually put this in front of somebody who would use it?' },
          { who: 'BETH', text: 'We\'ve had it in the lab and we tested it on our flatmates…' },
          { who: 'TUTOR', text: 'Your flatmates are engineering students. That is a serious gap, and it is the thing the assessment panel will go for first. You have designed for a user you have never met.' },
          { who: 'YUSUF', text: 'There\'s a refugee support centre near the station that runs a drop-in on Thursdays. I could ask whether we can bring it along and just watch people use it.' },
          { who: 'TUTOR', text: 'Do that, and don\'t explain anything while they do. Write down every time somebody hesitates. Beth, in the meantime, redo the costing with the polypropylene and with one fewer component.' },
          { who: 'BETH', text: 'Fine. What about the report structure?' },
          { who: 'TUTOR', text: 'Standard sections, but get the weighting right. The literature review can be two pages; nobody is marking you on your ability to summarise other people\'s filters. Testing results, three or four. But the section on the ideas you killed and why — the first prototype, the tap you argued about, the mesh — make that the longest thing in the document. That section is where the marks are, and everybody makes it the shortest.' },
          { who: 'YUSUF', text: 'And the draft was due Friday of week nine?' },
          { who: 'TUTOR', text: 'Let\'s move it. Give it to me on the Monday of week ten instead — that gives you the weekend and it still leaves me time to read it before the panel meets on the Thursday. Don\'t slip past the Monday, because after that I genuinely cannot help you.' }
        ]
      },

      /* ------------------------------------------------ PART 4 */
      {
        number: 4, range: '31 to 40', readTime: 45,
        context: 'You will hear part of a lecture about how migrating birds find their way. ' +
                 'First you have some time to look at questions 31 to 40.',
        blurb: 'Questions 31–40. Complete the notes below.',
        groups: [{
          kind: 'gap',
          title: 'Questions 31–40',
          instructions: 'Complete the notes below.',
          limitText: 'Write ONE WORD ONLY for each answer.',
          maxWords: 1,
          blocks: [
            { t: 'h', text: 'HOW MIGRATING BIRDS NAVIGATE' },
            { t: 'lead', text: 'Early experiments' },
            { t: 'ul', items: [
              'Kramer used caged starlings to show that birds orient themselves using the [[31]].',
              'Sauer placed warblers in a [[32]] and altered the projected night sky.',
              'Young birds appear to learn the sky by identifying its centre of [[33]].'
            ] },
            { t: 'lead', text: 'The magnetic sense — two candidate mechanisms' },
            { t: 'ul', items: [
              'Crystals of [[34]] in the upper beak, connected to the brain by the trigeminal nerve.',
              'Light-sensitive [[35]] in the eye, which may allow the bird to *see* the field.',
              'Birds read the [[36]] of the field lines rather than north–south polarity.'
            ] },
            { t: 'lead', text: 'Maps and compasses' },
            { t: 'ul', items: [
              'A compass gives direction; a map gives [[37]].',
              'In Perdeck\'s displacement study, adult starlings corrected their route while young birds kept the same [[38]].'
            ] },
            { t: 'lead', text: 'Other cues and modern threats' },
            { t: 'ul', items: [
              'Pigeons deprived of their sense of [[39]] became much less accurate.',
              'Artificial [[40]] at night draws migrating birds off course, especially in cloud.'
            ] }
          ],
          questions: [
            { n: 31, answer: 'sun', evidence: '"Kramer… the birds were using the sun, and correcting for its movement."' },
            { n: 32, answer: 'planetarium', evidence: '"Sauer put warblers in a planetarium".' },
            { n: 33, answer: 'rotation', evidence: '"what they learn is the centre of rotation".' },
            { n: 34, answer: 'magnetite', evidence: '"crystals of magnetite in the upper beak".' },
            { n: 35, answer: 'proteins', accept: ['protein', 'cryptochromes', 'cryptochrome'], evidence: '"light-sensitive proteins called cryptochromes".' },
            { n: 36, answer: 'inclination', accept: ['angle'], evidence: '"they read inclination — the angle at which the field lines meet the ground".' },
            { n: 37, answer: 'position', accept: ['location'], evidence: '"a compass tells you which way you are pointing; a map tells you your position".' },
            { n: 38, answer: 'bearing', accept: ['heading', 'direction'], evidence: '"the young birds simply held the same bearing and ended up in Spain".' },
            { n: 39, answer: 'smell', accept: ['olfaction'], evidence: '"pigeons whose sense of smell had been blocked".' },
            { n: 40, answer: 'light', evidence: '"artificial light at night… especially on overcast nights".' }
          ]
        }],
        transcript: [
          { who: 'LECTURER', text: 'A blackcap weighing about eighteen grams leaves a garden in Germany in September and arrives, some weeks later, in West Africa. The following spring it comes back — not to Germany in general, but very often to the same hedge. It has done this without instruction, without a map, and in many cases without ever having made the journey before. How?' },
          { who: 'LECTURER', text: 'The modern study of this begins with Gustav Kramer in the nineteen-fifties. Kramer noticed that caged migratory birds become restless at migration time and hop persistently towards one side of the cage — a behaviour called Zugunruhe. He built a circular cage with windows, and found that when he used mirrors to shift the apparent position of the sun by ninety degrees, the birds shifted their preferred direction by ninety degrees too. So the birds were using the sun, and, crucially, correcting for its movement across the sky, which means they must also possess an internal clock.' },
          { who: 'LECTURER', text: 'The sun is no use to a bird that flies at night, and most small songbirds do. Franz Sauer\'s answer, in the same decade, was to put warblers in a planetarium. Under a normal projected night sky the birds oriented correctly; rotate the projected sky and their orientation rotated with it. Later work by Stephen Emlen established what the young birds are actually learning, and it is more elegant than memorising constellations. Over their first summer they watch the night sky turn, and what they learn is the centre of rotation — the point that does not move, which in the northern hemisphere is close to the Pole Star. Raise young birds under a sky that rotates around Betelgeuse, and they will treat Betelgeuse as north for the rest of their lives.' },
          { pause: 3 },
          { who: 'LECTURER', text: 'Then there is the magnetic sense, which is the part we understand least well after sixty years of work. There are two leading candidates and they are not mutually exclusive.' },
          { who: 'LECTURER', text: 'The first is mechanical. Birds have crystals of magnetite — an iron oxide, the same mineral that makes lodestone — in the tissue of the upper beak, connected to the brain by the trigeminal nerve. A crystal in a magnetic field experiences a torque, and a sufficiently sensitive nerve could read that. The evidence here has been contentious; a widely cited paper locating the crystals had to be retracted when the structures turned out to be immune cells.' },
          { who: 'LECTURER', text: 'The second candidate is chemical, and stranger. In the retina there are light-sensitive proteins called cryptochromes, in which absorbing a photon produces a pair of molecules with unpaired electrons. The lifetime of that pair is influenced by the surrounding magnetic field, and so, potentially, is the signal the retina sends. If this is right, the bird does not feel the field; it sees it, as a pattern of shading superimposed on its visual world. The strongest support is that magnetic orientation in several species fails in darkness and requires light at particular wavelengths.' },
          { who: 'LECTURER', text: 'One important detail: birds do not use magnetic polarity in the way a hiker\'s compass does. They read inclination — the angle at which the field lines meet the ground, which is shallow at the equator and steep near the poles. A bird flown into the southern hemisphere and released is often confused, because the inclination compass has no unambiguous answer there.' },
          { pause: 3 },
          { who: 'LECTURER', text: 'Now, everything I have described so far is a compass, and a compass is not enough. A compass tells you which way you are pointing; a map tells you your position. If you are blown four hundred kilometres off course, a compass alone will keep you flying parallel to where you should be.' },
          { who: 'LECTURER', text: 'The experiment that made this clear was Albert Perdeck\'s, in 1958. He caught eleven thousand starlings migrating through the Netherlands, ringed them, flew them to Switzerland and released them. The adults, which had made the journey before, corrected: they set off north-west and reached their normal wintering grounds in England and northern France. The young birds, on their first migration, simply held the same bearing they had been on and ended up in Spain and southern France, several hundred kilometres from where any starling of that population had ever wintered. Adults have a map; first-year birds have only a compass and an instruction.' },
          { pause: 3 },
          { who: 'LECTURER', text: 'What the map is made of remains open. Floriano Papi\'s work in Italy showed that homing pigeons whose sense of smell had been blocked were markedly worse at finding their way home from unfamiliar sites, which suggests an olfactory element — a learned gradient of odours across a landscape. Others have proposed very low-frequency sound, which travels enormous distances and could give a coastline an acoustic signature. Probably it is several systems used redundantly, which is what you would expect from anything that has to work in fog.' },
          { who: 'LECTURER', text: 'I will end with the practical consequence. Artificial light at night draws migrating birds off course and holds them circling, especially on overcast nights when the stars are hidden and the light is all they can see. A single illuminated building can kill hundreds in one night. The remedy is embarrassingly simple — turn the lights off during the migration season — and several cities now do so, which is one of the few conservation measures that costs less than doing nothing.' }
        ]
      }
    ]
  });
})();
